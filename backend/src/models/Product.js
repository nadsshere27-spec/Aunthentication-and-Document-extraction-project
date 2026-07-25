const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  displayId: { type: Number, unique: true, sparse: true }, // sparse = old docs without it don't conflict
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);