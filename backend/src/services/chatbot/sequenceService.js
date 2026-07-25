// backend/src/services/chatbot/sequenceService.js
const Counter = require('../../models/Counter');

// Atomic even under concurrent requests — findOneAndUpdate with $inc is a
// single Mongo operation, no race condition between "read seq" and "write seq".
async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

module.exports = { getNextSequence };