const Invoice = require('../../models/Invoice');
const Product = require('../../models/Product');

const MODELS = { invoices: Invoice, products: Product };

async function executeQuery(spec) {
  if (spec.unsupported) {
    return { unsupported: true, reason: spec.reason };
  }

  const Model = MODELS[spec.collection];
  if (!Model) throw new Error(`No model bound for collection: ${spec.collection}`);

  const filter = spec.filter || {};

  if (spec.operation === 'count') {
    const count = await Model.countDocuments(filter);
    return { operation: 'count', collection: spec.collection, count };
  }

  if (spec.operation === 'distinct') {
    const values = await Model.distinct(spec.distinctField, filter);
    return { operation: 'distinct', collection: spec.collection, field: spec.distinctField, values };
  }

  if (spec.operation === 'find') {
    let query = Model.find(filter);
    if (spec.sort) query = query.sort(spec.sort);
    query = query.limit(spec.limit || 200);
    const docs = await query.lean();
    return {
      operation: 'find',
      collection: spec.collection,
      docs,
      customerLookup: !!spec.customerLookup,
      minimal: !!spec.minimal,
    };
  }

  if (spec.operation === 'aggregate') {
    const pipeline = Array.isArray(spec.pipeline) ? spec.pipeline : [];
    // Guard: an empty pipeline means the model didn't actually need aggregation
    // (e.g. "total invoices") — fall back to a plain count instead of crashing.
    if (pipeline.length === 0) {
      const count = await Model.countDocuments(filter);
      return { operation: 'count', collection: spec.collection, count };
    }
    const docs = await Model.aggregate(pipeline);
    return { operation: 'aggregate', collection: spec.collection, docs };
  }

  throw new Error(`Unsupported operation: ${spec.operation}`);
}

module.exports = { executeQuery };