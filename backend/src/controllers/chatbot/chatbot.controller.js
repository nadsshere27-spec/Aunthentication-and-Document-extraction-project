const { nl2Query } = require('../../services/chatbot/nl2QueryService');
const { executeQuery } = require('../../services/chatbot/queryExecutor');
const { formatAnswer } = require('../../services/chatbot/answerFormatterService');

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
        answer: "Sorry, I couldn't understand that. Try asking about invoices, customers, payments, or products."
      });
    }

    if (spec.intent === 'smalltalk') {
      return res.status(200).json({ success: true, answer: spec.reply, spec });
    }

    const result = await executeQuery(spec);
    const answer = formatAnswer(question, result);

    res.status(200).json({ success: true, answer, spec, result });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong: ' + error.message });
  }
};

module.exports = { askChatbot };