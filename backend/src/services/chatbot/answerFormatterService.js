// No LLM call in this file anymore. The previous "casual intro" LLM call
// would occasionally invent its own example names/values inside the framing
// sentence (e.g. fabricating customer names that don't exist in the DB) even
// though the real list followed right after — a hallucination risk that
// isn't worth it just for variety in phrasing. Everything below is
// deterministic: same accuracy guarantee as before, casual tone via rotating
// plain-text templates instead of a model call.

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : null);

function pick(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

// ---------- Generic field-selective rendering (for displayFields) ----------

function formatFieldValue(field, value) {
  if (value === undefined || value === null) return null;
  if (field === 'price' || field === 'amount') return money(value);
  if (field === 'date') return fmtDate(value);
  if (field === 'displayId') return `#${value}`;
  return String(value);
}

function renderGenericLine(doc, fields) {
  const parts = fields
    .map((f) => formatFieldValue(f, doc[f]))
    .filter((v) => v !== null);
  return `• ${parts.join(' — ')}`;
}

// ---------- Products (default, no displayFields given) ----------

function renderProductLine(doc) {
  return `• ${doc.name} — ${money(doc.price)} (${doc.category}, ${doc.stock} in stock)`;
}

function singleProductSentence(doc) {
  return `The price of ${doc.name} is ${money(doc.price)} (${doc.category}, ${doc.stock} in stock).`;
}

// ---------- Invoices (default, no displayFields given) ----------

function renderInvoiceLine(doc) {
  const parts = [`#${doc.invoiceNumber}`];
  if (doc.customerName) parts.push(doc.customerName);
  if (doc.itemName) parts.push(doc.itemName);
  if (doc.category) parts.push(`(${doc.category})`);
  if (doc.amount != null) parts.push(money(doc.amount));
  if (doc.status) parts.push(doc.status);
  if (doc.paymentMethod && doc.paymentMethod !== 'unknown') parts.push(doc.paymentMethod);
  const d = fmtDate(doc.date);
  if (d) parts.push(d);
  return `• ${parts.join(' — ')}`;
}

function singleInvoiceSentence(doc) {
  const bits = [`Invoice #${doc.invoiceNumber}`];
  if (doc.customerName) bits.push(`for ${doc.customerName}`);
  if (doc.itemName) bits.push(`— ${doc.itemName}`);
  if (doc.amount != null) bits.push(`, ${money(doc.amount)}`);
  if (doc.status) bits.push(`, ${doc.status}`);
  if (doc.paymentMethod && doc.paymentMethod !== 'unknown') bits.push(` via ${doc.paymentMethod}`);
  const d = fmtDate(doc.date);
  if (d) bits.push(` on ${d}`);
  return bits.join(' ').replace(/ ,/g, ',') + '.';
}

// ---------- Aggregate (generic, shape depends on the AI's pipeline) ----------

function renderAggregateLine(doc) {
  const label = doc._id === null || doc._id === undefined ? 'Overall' : String(doc._id);
  const rest = Object.entries(doc)
    .filter(([k]) => k !== '_id')
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? money(v) : v}`)
    .join(', ');
  return `• ${label} — ${rest}`;
}

async function formatAnswer(question, result) {
  if (result.unsupported) {
    return `I can't answer that yet — ${result.reason}`;
  }

  if (result.operation === 'count') {
    const templates = [
      `You've got ${result.count} matching record${result.count === 1 ? '' : 's'}.`,
      `That comes out to ${result.count} record${result.count === 1 ? '' : 's'}.`,
      `Found ${result.count} matching record${result.count === 1 ? '' : 's'}.`,
    ];
    return pick(templates);
  }

  if (result.operation === 'distinct') {
    const { field, values, countOnly } = result;

    if (values.length === 0) {
      return `No ${field} values found yet.`;
    }

    if (countOnly) {
      const label = field === 'customerName' ? 'customer' : field;
      const templates = [
        `You've got ${values.length} distinct ${label}${values.length === 1 ? '' : 's'}.`,
        `There are ${values.length} distinct ${label}${values.length === 1 ? '' : 's'} in the system.`,
      ];
      return pick(templates);
    }

    const templates = [
      `Here's the full list of ${values.length} ${field}:`,
      `Found ${values.length} distinct ${field} — here they all are:`,
    ];
    const list = values.map((v) => `• ${v}`).join('\n');
    return `${pick(templates)}\n\n${list}`;
  }

  if (result.operation === 'find') {
    const { docs, collection, displayFields } = result;
    if (docs.length === 0) {
      return "No matching records found — you might want to try a different name or spelling.";
    }

    const isProduct = collection === 'products';
    const useCustomFields = Array.isArray(displayFields) && displayFields.length > 0;

    // Single match, no specific field request: one natural sentence.
    if (docs.length === 1 && !useCustomFields) {
      return isProduct ? singleProductSentence(docs[0]) : singleInvoiceSentence(docs[0]);
    }

    const templates = [
      `Found ${docs.length} matching ${isProduct ? 'product' : 'invoice'}${docs.length === 1 ? '' : 's'}:`,
      `Here${docs.length === 1 ? "'s" : ' are'} ${docs.length} matching ${isProduct ? 'product' : 'invoice'}${docs.length === 1 ? '' : 's'}:`,
    ];

    const list = docs
      .map((d) => (useCustomFields ? renderGenericLine(d, displayFields) : (isProduct ? renderProductLine(d) : renderInvoiceLine(d))))
      .join('\n');

    return `${pick(templates)}\n\n${list}`;
  }

  if (result.operation === 'aggregate') {
    const { docs } = result;
    if (docs.length === 0) {
      return "No matching data found for that.";
    }
    const templates = [
      `Here's what I found:`,
      `Here's the breakdown:`,
    ];
    const list = docs.map(renderAggregateLine).join('\n');
    return `${pick(templates)}\n\n${list}`;
  }

  return "Hmm, I got a result back but I'm not sure how to explain it — mind rephrasing the question?";
}

module.exports = { formatAnswer };