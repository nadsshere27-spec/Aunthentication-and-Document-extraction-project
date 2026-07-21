const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  itemName: { type: String, required: true },
  amount: { type: Number, required: true },
  customerName: { type: String, required: true },
  status: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'unknown'], default: 'unknown' },
  tax: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);