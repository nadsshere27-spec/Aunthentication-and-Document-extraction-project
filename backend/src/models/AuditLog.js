// backend/src/models/AuditLog.js
//
// Every create/update/delete the chatbot performs gets logged here — what
// changed, before/after values, and the question that triggered it. This is
// what lets you (or your sir) trust that writes are traceable, not silent.

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    collection: { type: String, enum: ['products', 'invoices'], required: true },
    displayId: { type: Number },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    question: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);