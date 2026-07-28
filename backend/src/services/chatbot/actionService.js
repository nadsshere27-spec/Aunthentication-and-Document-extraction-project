// backend/src/services/chatbot/actionService.js
//
// The only file that actually creates/updates/deletes documents.

const Invoice = require('../../models/Invoice');
const Product = require('../../models/Product');
const AuditLog = require('../../models/AuditLog');
const { getNextSequence } = require('./sequenceService');
const { SCHEMA_CONTEXT, DEFAULT_VALUES, NON_WRITABLE_FIELDS } = require('../../config/schemaContext');

const MODELS = { invoices: Invoice, products: Product };

// CRITICAL: Mongo/Mongoose treat `{ displayId: undefined }` as "no filter on
// this field at all" — which means a query would match the FIRST document in
// the collection rather than none. That's how a missing ID previously caused
// silent updates/deletes on the wrong record. Every write path below checks
// this before touching the database.
function assertValidId(displayId) {
  if (displayId === undefined || displayId === null || Number.isNaN(Number(displayId))) {
    const err = new Error(
      "This record doesn't have a valid ID yet (this can happen after reseeding data). " +
      "Please re-run: node src/scripts/backfillDisplayIds.js — then try again."
    );
    err.code = 'INVALID_DISPLAY_ID';
    throw err;
  }
}

function sanitizeFields(collection, fields) {
  const allowed = Object.keys(SCHEMA_CONTEXT[collection].fields).filter(
    (f) => !NON_WRITABLE_FIELDS.includes(f)
  );
  const clean = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (allowed.includes(k) && v !== null && v !== undefined && v !== '') {
      clean[k] = v;
    }
  }
  return clean;
}

function resolveDefaults(collection) {
  const defs = DEFAULT_VALUES[collection] || {};
  const resolved = {};
  for (const [k, v] of Object.entries(defs)) {
    resolved[k] = typeof v === 'function' ? v() : v;
  }
  return resolved;
}

async function createRecord(collection, fields, question) {
  const Model = MODELS[collection];
  if (!Model) throw new Error(`No model bound for collection: ${collection}`);

  const clean = sanitizeFields(collection, fields);
  const merged = { ...resolveDefaults(collection), ...clean };

  const displayId = await getNextSequence(collection);
  merged.displayId = displayId;

  if (collection === 'invoices' && !merged.invoiceNumber) {
    merged.invoiceNumber = `INV-${1000 + displayId}`;
  }

  const doc = await Model.create(merged);
  await AuditLog.create({
    action: 'create',
    collection,
    displayId,
    before: null,
    after: doc.toObject(),
    question,
  });
  return doc.toObject();
}

async function updateRecord(collection, displayId, changes, question) {
  assertValidId(displayId);

  const Model = MODELS[collection];
  if (!Model) throw new Error(`No model bound for collection: ${collection}`);

  const clean = sanitizeFields(collection, changes);
  if (Object.keys(clean).length === 0) {
    throw new Error('No valid fields to update');
  }

  const before = await Model.findOne({ displayId }).lean();
  if (!before) throw new Error(`No ${collection} record with ID ${displayId}`);

  const after = await Model.findOneAndUpdate(
    { displayId },
    { $set: clean },
    { new: true }
  ).lean();

  await AuditLog.create({ action: 'update', collection, displayId, before, after, question });
  return { before, after };
}

async function deleteRecord(collection, displayId, question) {
  assertValidId(displayId);

  const Model = MODELS[collection];
  if (!Model) throw new Error(`No model bound for collection: ${collection}`);

  const before = await Model.findOneAndDelete({ displayId }).lean();
  if (!before) throw new Error(`No ${collection} record with ID ${displayId}`);

  await AuditLog.create({ action: 'delete', collection, displayId, before, after: null, question });
  return before;
}

async function findByNameOrId(collection, { displayId, name }) {
  const Model = MODELS[collection];
  if (!Model) throw new Error(`No model bound for collection: ${collection}`);

  if (displayId !== undefined && displayId !== null) {
    return Model.find({ displayId }).lean();
  }

  const nameField = collection === 'products' ? 'name' : 'itemName';
  if (!name) return [];
  return Model.find({ [nameField]: { $regex: name, $options: 'i' } }).lean();
}

module.exports = { createRecord, updateRecord, deleteRecord, findByNameOrId, sanitizeFields };