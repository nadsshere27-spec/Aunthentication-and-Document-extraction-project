const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Ask Groq for a short, casual intro line. We only ever let the LLM write the
// FRAMING sentence — the actual numbers/list are built deterministically in
// code below, so nothing gets hallucinated or silently dropped for long lists.
async function casualIntro(instruction) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a friendly accounting assistant chatting with a colleague. "
            + "Write ONE short, casual, natural sentence. No JSON, no braces, no code, "
            + "no bullet points, no markdown, no record IDs. Just talk like a normal person."
        },
        { role: "user", content: instruction }
      ],
      temperature: 0.6,
      max_tokens: 60
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('⚠️ casualIntro failed, falling back to plain text:', err.message);
    return null;
  }
}

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : null);

// ---------- Invoices ----------

function renderInvoiceLine(doc, minimal) {
  if (minimal) {
    const parts = [doc.itemName, doc.amount != null ? money(doc.amount) : null].filter(Boolean);
    return `• ${parts.join(' — ')}`;
  }
  const parts = [`#${doc.invoiceNumber}`];
  if (doc.customerName) parts.push(doc.customerName);
  if (doc.itemName) parts.push(doc.itemName);
  if (doc.category) parts.push(`(${doc.category})`);
  if (doc.amount != null) parts.push(money(doc.amount));
  if (doc.status) parts.push(doc.status);
  if (doc.paymentMethod && doc.paymentMethod !== 'unknown') parts.push(doc.paymentMethod);
  const d = fmtDate(doc.date);
  if (d) parts.push(d);
  return `• ${parts.join(' — ')}`;
}

function singleInvoiceSentence(doc) {
  const bits = [`Invoice #${doc.invoiceNumber}`];
  if (doc.customerName) bits.push(`for ${doc.customerName}`);
  if (doc.itemName) bits.push(`— ${doc.itemName}`);
  if (doc.amount != null) bits.push(`, ${money(doc.amount)}`);
  if (doc.status) bits.push(`, ${doc.status}`);
  if (doc.paymentMethod && doc.paymentMethod !== 'unknown') bits.push(` via ${doc.paymentMethod}`);
  const d = fmtDate(doc.date);
  if (d) bits.push(` on ${d}`);
  return bits.join(' ').replace(/ ,/g, ',') + '.';
}

// ---------- Products ----------

function renderProductLine(doc, minimal) {
  if (minimal) {
    return `• ${doc.name} — ${money(doc.price)}`;
  }
  return `• ${doc.name} — ${money(doc.price)} (${doc.category}, ${doc.stock} in stock)`;
}

function singleProductSentence(doc, minimal) {
  if (minimal) {
    return `${doc.name} — ${money(doc.price)}.`;
  }
  return `The price of ${doc.name} is ${money(doc.price)} (${doc.category}, ${doc.stock} in stock).`;
}

// ---------- Aggregate (generic, shape depends on the AI's pipeline) ----------

function renderAggregateLine(doc) {
  const label = doc._id === null || doc._id === undefined ? 'Overall' : String(doc._id);
  const rest = Object.entries(doc)
    .filter(([k]) => k !== '_id')
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? money(v) : v}`)
    .join(', ');
  return `• ${label} — ${rest}`;
}

async function formatAnswer(question, result) {
  if (result.unsupported) {
    return `I can't answer that yet — ${result.reason}`;
  }

  if (result.operation === 'count') {
    const intro = await casualIntro(`Tell the user there are ${result.count} matching records for their question: "${question}".`);
    return intro || `You've got ${result.count} matching record${result.count === 1 ? '' : 's'}.`;
  }

  if (result.operation === 'distinct') {
    const { field, values } = result;
    if (values.length === 0) {
      return `No ${field} values found yet.`;
    }
    const intro = await casualIntro(`Tell the user you found ${values.length} distinct ${field} values, and that they're listed below. Question was: "${question}".`);
    const list = values.map((v) => `• ${v}`).join('\n');
    return `${intro || `Here are all ${values.length} ${field} values:`}\n\n${list}`;
  }

  if (result.operation === 'find') {
    const { docs, collection, minimal } = result;
    if (docs.length === 0) {
      return "No matching records found — you might want to try a different name or spelling.";
    }

    const isProduct = collection === 'products';

    // Single match: answer in one natural sentence, no bullets, no IDs.
    if (docs.length === 1) {
      return isProduct ? singleProductSentence(docs[0], minimal) : singleInvoiceSentence(docs[0]);
    }

    // Multiple matches: short casual intro + a clean deterministic list
    // (kept deterministic so nothing gets dropped or invented for long lists).
    const intro = await casualIntro(
      `Tell the user you found ${docs.length} matching ${isProduct ? 'products' : 'invoice record(s)'} for: "${question}". Keep it to one sentence, the full list follows separately.`
    );
    const list = docs
      .map((d) => (isProduct ? renderProductLine(d, minimal) : renderInvoiceLine(d, minimal)))
      .join('\n');
    return `${intro || `Found ${docs.length} result${docs.length === 1 ? '' : 's'}:`}\n\n${list}`;
  }

  if (result.operation === 'aggregate') {
    const { docs } = result;
    if (docs.length === 0) {
      return "No matching data found for that.";
    }
    const intro = await casualIntro(`Tell the user you worked out the numbers for: "${question}". Keep it to one sentence, the breakdown follows separately.`);
    const list = docs.map(renderAggregateLine).join('\n');
    return `${intro || 'Here\'s what I found:'}\n\n${list}`;
  }

  return "Hmm, I got a result back but I'm not sure how to explain it — mind rephrasing the question?";
}

module.exports = { formatAnswer };