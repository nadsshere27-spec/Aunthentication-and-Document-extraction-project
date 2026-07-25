// backend/src/models/Counter.js
//
// Mongo's _id is a random ObjectId, not a clean sequential number. This gives
// us "product #25" style human-friendly IDs via an atomic counter per
// collection, safe even under concurrent create requests.

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "products", "invoices"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);