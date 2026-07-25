const { nl2Query } = require('../../services/chatbot/nl2QueryService');
const { executeQuery } = require('../../services/chatbot/queryExecutor');
const { formatAnswer } = require('../../services/chatbot/answerFormatterService');
const { createRecord, updateRecord, deleteRecord, findByNameOrId } = require('../../services/chatbot/actionService');
const { detectYesNo, extractFieldValue, extractChanges } = require('../../services/chatbot/pendingActionService');
const { REQUIRED_FIELDS } = require('../../config/schemaContext');

// ---------- Unchanged: customer-name ambiguity check for data_query ----------
function checkCustomerAmbiguity(spec, result) {
  if (!spec.customerLookup || result.operation !== 'find') return null;

  const distinctNames = [...new Set(result.docs.map((d) => d.customerName))];
  if (distinctNames.length <= 1) return null;

  const options = distinctNames.map((name) => {
    const invoiceNumbers = result.docs
      .filter((d) => d.customerName === name)
      .map((d) => d.invoiceNumber)
      .join(', ');
    return `• ${name} (invoices: ${invoiceNumbers})`;
  });

  return (
    `I found a few different customers matching that name — which one did you mean?\n\n` +
    options.join('\n') +
    `\n\nJust tell me the full name or an invoice number and I'll pull up their info.`
  );
}

// ---------- New: helpers for the action (create/update/delete) flow ----------

function renderSnapshot(collection, doc) {
  if (collection === 'products') {
    return `ID: ${doc.displayId} — ${doc.name} — Rs ${doc.price}${doc.category ? ` (${doc.category})` : ''}`;
  }
  return `ID: ${doc.displayId} — ${doc.itemName} for ${doc.customerName} — Rs ${doc.amount}`;
}

function formatCreated(collection, doc) {
  if (collection === 'products') {
    return `✅ Created! ID: ${doc.displayId} — ${doc.name} — Rs ${doc.price}${doc.category ? ` (${doc.category})` : ''}, stock: ${doc.stock ?? 0}.`;
  }
  return `✅ Created! Invoice ${doc.invoiceNumber} (ID: ${doc.displayId}) — ${doc.itemName} for ${doc.customerName}, Rs ${doc.amount}.`;
}

function formatDeleted(collection, doc) {
  const label = collection === 'products' ? doc.name : doc.itemName;
  return `🗑️ Deleted — ${label} (ID ${doc.displayId}) is gone permanently.`;
}

function formatUpdated(collection, before, after) {
  const label = collection === 'products' ? after.name : after.itemName;
  const changedFields = Object.keys(after).filter(
    (k) => !['updatedAt', '_id', '__v'].includes(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k])
  );
  const diffs = changedFields.map((f) => `${f}: ${before[f]} → ${after[f]}`).join(', ');
  return `✅ Updated — ${label} (ID ${after.displayId}). ${diffs || 'No visible changes.'}`;
}

async function startAction(spec, question, res) {
  const { operation, collection } = spec;

  if (operation === 'create') {
    const required = REQUIRED_FIELDS[collection];
    const fields = spec.fields || {};
    const missing = required.filter((f) => fields[f] === undefined || fields[f] === null || fields[f] === '');

    if (missing.length > 0) {
      return res.status(200).json({
        success: true,
        answer: `Got it — what should its ${missing[0]} be?`,
        pendingAction: { operation: 'create', collection, fields, missing },
      });
    }

    const doc = await createRecord(collection, fields, question);
    return res.status(200).json({ success: true, answer: formatCreated(collection, doc), pendingAction: null });
  }

  // delete or update — both need to locate the target record first
  const target = spec.target || {};
  const matches = await findByNameOrId(collection, target);

  if (matches.length === 0) {
    return res.status(200).json({
      success: true,
      answer: `I couldn't find any ${collection === 'products' ? 'product' : 'invoice'} matching that.`,
      pendingAction: null,
    });
  }

  if (matches.length > 1) {
    const list = matches.map((m) => `• ${renderSnapshot(collection, m)}`).join('\n');
    return res.status(200).json({
      success: true,
      answer: `I found a few matches — which one did you mean?\n\n${list}\n\nTell me the ID.`,
      pendingAction: { operation, collection, stage: 'disambiguate' },
    });
  }

  const doc = matches[0];

  if (operation === 'delete') {
    return res.status(200).json({
      success: true,
      answer: `You want to delete this?\n\n• ${renderSnapshot(collection, doc)}\n\nReply yes to confirm, or no to cancel.`,
      pendingAction: { operation: 'delete', collection, targetId: doc.displayId, snapshot: doc, stage: 'confirm' },
    });
  }

  // update
  return res.status(200).json({
    success: true,
    answer: `Here's what I found:\n\n• ${renderSnapshot(collection, doc)}\n\nWhat would you like to change?`,
    pendingAction: { operation: 'update', collection, targetId: doc.displayId, snapshot: doc, stage: 'awaiting_change' },
  });
}

async function continueAction(pendingAction, message, res) {
  const { operation, collection } = pendingAction;

  if (operation === 'create') {
    const nextField = pendingAction.missing[0];
    const value = await extractFieldValue(collection, nextField, message);

    if (value === null || value === undefined) {
      return res.status(200).json({
        success: true,
        answer: `Sorry, I couldn't quite catch that — what should its ${nextField} be?`,
        pendingAction,
      });
    }

    const fields = { ...pendingAction.fields, [nextField]: value };
    const required = REQUIRED_FIELDS[collection];
    const missing = required.filter((f) => fields[f] === undefined || fields[f] === null || fields[f] === '');

    if (missing.length > 0) {
      return res.status(200).json({
        success: true,
        answer: `Got it — and what should its ${missing[0]} be?`,
        pendingAction: { operation: 'create', collection, fields, missing },
      });
    }

    const doc = await createRecord(collection, fields, message);
    return res.status(200).json({ success: true, answer: formatCreated(collection, doc), pendingAction: null });
  }

  if (operation === 'delete' && pendingAction.stage === 'confirm') {
    const decision = detectYesNo(message);
    if (decision === 'yes') {
      const deleted = await deleteRecord(collection, pendingAction.targetId, message);
      return res.status(200).json({ success: true, answer: formatDeleted(collection, deleted), pendingAction: null });
    }
    if (decision === 'no') {
      return res.status(200).json({ success: true, answer: 'Okay, cancelled — nothing was deleted.', pendingAction: null });
    }
    return res.status(200).json({
      success: true,
      answer: `Just to confirm — delete this?\n\n• ${renderSnapshot(collection, pendingAction.snapshot)}\n\nReply yes or no.`,
      pendingAction,
    });
  }

  if (operation === 'update' && pendingAction.stage === 'awaiting_change') {
    const changes = await extractChanges(collection, message);
    if (!changes || Object.keys(changes).length === 0) {
      return res.status(200).json({
        success: true,
        answer: "I didn't catch what to change — which field would you like to update, and to what?",
        pendingAction,
      });
    }
    const { before, after } = await updateRecord(collection, pendingAction.targetId, changes, message);
    return res.status(200).json({ success: true, answer: formatUpdated(collection, before, after), pendingAction: null });
  }

  if (pendingAction.stage === 'disambiguate') {
    const idMatch = message.match(/\d+/);
    if (!idMatch) {
      return res.status(200).json({ success: true, answer: 'Which ID did you mean?', pendingAction });
    }
    const displayId = parseInt(idMatch[0], 10);
    const matches = await findByNameOrId(collection, { displayId });
    if (matches.length === 0) {
      return res.status(200).json({ success: true, answer: `I couldn't find ID ${displayId}.`, pendingAction: null });
    }
    const doc = matches[0];

    if (pendingAction.operation === 'delete') {
      return res.status(200).json({
        success: true,
        answer: `You want to delete this?\n\n• ${renderSnapshot(collection, doc)}\n\nReply yes to confirm, or no to cancel.`,
        pendingAction: { operation: 'delete', collection, targetId: doc.displayId, snapshot: doc, stage: 'confirm' },
      });
    }
    return res.status(200).json({
      success: true,
      answer: `Here's what I found:\n\n• ${renderSnapshot(collection, doc)}\n\nWhat would you like to change?`,
      pendingAction: { operation: 'update', collection, targetId: doc.displayId, snapshot: doc, stage: 'awaiting_change' },
    });
  }

  // Fallback: pendingAction shape wasn't recognized — reset rather than get stuck
  return res.status(200).json({
    success: true,
    answer: "Something went off track there — mind starting that request again?",
    pendingAction: null,
  });
}

// ---------- Main entry point ----------

const askChatbot = async (req, res) => {
  try {
    const { question, pendingAction } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Please ask a question' });
    }

    // Mid-flow create/update/delete — interpret this message as the answer
    if (pendingAction) {
      return await continueAction(pendingAction, question, res);
    }

    let spec;
    try {
      spec = await nl2Query(question);
    } catch (err) {
      console.error('❌ Failed to parse question:', err.message);
      return res.status(200).json({
        success: true,
        answer: "Sorry, I couldn't understand that. Try asking about invoices, customers, or products.",
      });
    }

    if (spec.intent === 'smalltalk') {
      return res.status(200).json({ success: true, answer: spec.reply, spec });
    }

    if (spec.intent === 'action_query') {
      return await startAction(spec, question, res);
    }

    // ---- data_query: exact same path as before, untouched ----
    const result = await executeQuery(spec);

    const ambiguityPrompt = checkCustomerAmbiguity(spec, result);
    if (ambiguityPrompt) {
      return res.status(200).json({ success: true, answer: ambiguityPrompt, spec, result });
    }

    const answer = await formatAnswer(question, result);
    res.status(200).json({ success: true, answer, spec, result });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong: ' + error.message });
  }
};

module.exports = { askChatbot };