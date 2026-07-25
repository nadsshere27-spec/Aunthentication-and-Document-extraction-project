// backend/src/scripts/backfillDisplayIds.js
//
// Run ONCE after adding the displayId field: node src/scripts/backfillDisplayIds.js
// Assigns sequential displayId (in creation order) to any existing products/
// invoices that don't have one yet, then sets the Counter so new records
// continue from the right number (e.g. if you have 24 products, the next
// created one becomes #25, not #1).

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');

async function backfill(Model, name) {
  const docs = await Model.find({ displayId: { $exists: false } }).sort({ createdAt: 1 });
  let seq = (await Counter.findOne({ name }))?.seq || 0;

  for (const doc of docs) {
    seq += 1;
    doc.displayId = seq;
    await doc.save();
  }

  await Counter.findOneAndUpdate({ name }, { seq }, { upsert: true });
  console.log(`✅ ${name}: backfilled ${docs.length} docs, counter now at ${seq}`);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  await backfill(Product, 'products');
  await backfill(Invoice, 'invoices');

  console.log('🎉 Backfill complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});