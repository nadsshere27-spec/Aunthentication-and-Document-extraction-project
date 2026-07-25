const { nl2Query } = require('../../services/chatbot/nl2QueryService');
const { executeQuery } = require('../../services/chatbot/queryExecutor');
const { formatAnswer } = require('../../services/chatbot/answerFormatterService');

// If a "customer lookup" query (fuzzy name match) actually matches more than
// one distinct real customer, we ask which one before answering, instead of
// silently merging them or guessing. Since there's no separate Customer
// collection with real IDs, we identify each match by their invoice numbers.
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

const askChatbot = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Please ask a question' });
    }

    let spec;
    try {
      spec = await nl2Query(question);
    } catch (err) {
      console.error('❌ Failed to parse question:', err.message);
      return res.status(200).json({
        success: true,
        answer: "Sorry, I couldn't understand that. Try asking about invoices, customers, or products."
      });
    }

    if (spec.intent === 'smalltalk') {
      return res.status(200).json({ success: true, answer: spec.reply, spec });
    }

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