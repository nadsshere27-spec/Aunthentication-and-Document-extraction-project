const Groq = require('groq-sdk');
const {
  SCHEMA_CONTEXT,
  ALLOWED_OPERATIONS,
  UNSUPPORTED_DOMAINS,
  ALLOWED_WRITE_OPERATIONS,
} = require('../../config/schemaContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_INSTRUCTIONS = `
You are an accounting assistant's brain. You receive ANY message a user sends
to a business chatbot — it could be a real data question, a greeting, small
talk, a request to CREATE/UPDATE/DELETE a record, or a vague/casual phrase.
Your job is to classify it and respond correctly. Output STRICT JSON only, no
markdown, no prose, no backticks.

There are THREE possible intents:

1) "smalltalk" — greetings, thanks, "who are you", "what can you do",
   unclear messages, or anything not actually asking for existing business
   data and not a create/update/delete request.
   Output shape:
   { "intent": "smalltalk", "reply": "short natural first-person reply" }

2) "data_query" — a READ-ONLY question about existing data (invoices,
   customers, products). This includes short fragments like "invoices
   today?", "unpaid ones", casual phrasing, typos, whatever — infer intent
   the way a human accountant would.
   Output shape:
   {
     "intent": "data_query",
     "collection": "invoices" | "products",
     "operation": "find" | "count" | "aggregate" | "distinct",
     "filter": {},
     "pipeline": [],
     "distinctField": "",
     "sort": {},
     "limit": 50,
     "unsupported": false,
     "reason": "",
     "customerLookup": false,
     "minimal": false
   }

3) "action_query" — the user wants to CREATE, UPDATE, or DELETE a record.
   Examples: "create a product name iphone charger", "delete the product
   bluetooth speaker", "edit/update the product iphone charger", "add a new
   invoice for customer X", "remove product 25".
   Output shape:
   {
     "intent": "action_query",
     "operation": "create" | "update" | "delete",
     "collection": "invoices" | "products",
     "target": { "displayId": null, "name": "" },
     "fields": {}
   }
   - For "create": put whatever fields the user already gave into "fields"
     (only real schema fields below — never invent a field). Leave "target"
     empty — it's not used for create.
   - For "update"/"delete": fill "target" with either a "displayId" (if the
     user gave a number/ID) or a "name" (the product name / invoice item
     name they're referring to). Leave "fields" empty for update — the
     specific changes are collected in a later step, not here.
   - Do NOT actually decide what's missing or ask questions yourself — that
     happens in a separate step after this classification. Just extract what
     you can from THIS message.

Schema (only these collections/fields exist, never invent others):
${JSON.stringify(SCHEMA_CONTEXT, null, 2)}

Allowed read operations: ${ALLOWED_OPERATIONS.join(', ')}
Allowed write operations: ${ALLOWED_WRITE_OPERATIONS.join(', ')}

CRITICAL — choosing the right collection:
- Questions about "a product", a specific product's price/stock, "list of
  products", "products in category X", "what do we sell", "name a product",
  or creating/editing/deleting a PRODUCT -> ALWAYS collection: "products".
- Questions/actions about invoices, sales, revenue, a customer's purchase
  history -> collection: "invoices".
- Never confuse the product catalog with invoice line items — invoices also
  has itemName/category fields, but those describe a past sale, not the
  current catalog.

CRITICAL — distinguishing data_query from action_query:
- "how many products", "what's the price of X", "list of products" -> data_query
  (these are READS, nothing is created/changed/removed).
- "create/add/make a product ...", "delete/remove product ...",
  "edit/update/change product ..." -> action_query.
- A user asking for a specific OUTPUT FORMAT or brevity on a data_query
  ("just give me the name and price", "no extra information") is NOT an
  action — set "minimal": true on the data_query and proceed normally. This
  is a formatting preference, never smalltalk, never an action.

Rules for data_query:
- There is no separate "customers" collection. Customer questions run against
  invoices.customerName:
  - "list of customers" -> { "operation": "distinct", "collection": "invoices", "distinctField": "customerName", "filter": {} }
  - "info about customer X" -> { "operation": "find", "collection": "invoices",
    "filter": { "customerName": { "$regex": "X", "$options": "i" } }, "customerLookup": true }
- "payments" are not separate — use invoices.paymentMethod and invoices.status.
- "list of categories" -> distinct on the relevant collection's "category" field.
- If it needs data we don't have (${UNSUPPORTED_DOMAINS.join(', ')}),
  set "unsupported": true with a short "reason". Do not guess.
- "today"/"this month"/"this week"/"yesterday" -> compute real ISO date
  ranges yourself using the current date given below, filter on "date".
- Never invent fields. For "list"/"show me"/"give me all" style requests, set
  limit to 200 rather than a small default.
- For simple totals ("total invoices", "how many invoices in total"), use
  operation "count" with an empty filter — do NOT use "aggregate" unless you
  actually need grouping, summing, or a "highest/most/top" ranking.

General rule (important):
- Genuine data-MODIFYING requests (create/update/delete) are action_query,
  handled by a real, safe, confirmation-gated flow — they are fully
  supported, never refuse them as "I can't perform actions."
- Only classify as smalltalk if the message is truly not about data at all
  (greetings, thanks, unclear chit-chat).

Return ONLY one JSON object, matching whichever intent shape applies. Nothing else.
`;

async function nl2Query(question) {
  const now = new Date().toISOString();

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTIONS },
      { role: "user", content: `Current date (ISO): ${now}\n\nMessage: "${question}"` }
    ],
    temperature: 0,
    response_format: { type: "json_object" }
  });

  const raw = completion.choices[0].message.content.trim();

  let spec;
  try {
    const cleaned = raw.replace(/^```json\s*|^```\s*|```$/gm, '').trim();
    spec = JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ Failed to parse question:', question, '| raw:', raw);
    throw new Error("Could not parse the question into a query. Try rephrasing it.");
  }

  validateSpec(spec);
  return spec;
}

function validateSpec(spec) {
  if (spec.intent === 'smalltalk') {
    if (!spec.reply) spec.reply = "Hey! Ask me anything about invoices, payments, customers, or products.";
    return;
  }

  if (spec.intent === 'action_query') {
    if (!spec.collection || !SCHEMA_CONTEXT[spec.collection]) {
      throw new Error(`Unknown collection: ${spec.collection}`);
    }
    if (!ALLOWED_WRITE_OPERATIONS.includes(spec.operation)) {
      throw new Error(`Disallowed write operation: ${spec.operation}`);
    }
    spec.fields = spec.fields || {};
    spec.target = spec.target || {};
    return;
  }

  // ---- data_query (unchanged from before) ----

  if (spec.unsupported === true) {
    if (!spec.reason) spec.reason = "This question needs data we don't currently track.";
    return;
  }

  if (!spec.collection || !SCHEMA_CONTEXT[spec.collection]) {
    throw new Error(`Unknown collection: ${spec.collection}`);
  }
  if (!ALLOWED_OPERATIONS.includes(spec.operation)) {
    throw new Error(`Disallowed operation: ${spec.operation}`);
  }

  const allowedFields = Object.keys(SCHEMA_CONTEXT[spec.collection].fields);

  if (spec.operation === 'distinct') {
    if (!spec.distinctField || !allowedFields.includes(spec.distinctField)) {
      throw new Error(`Non-whitelisted distinct field: ${spec.distinctField}`);
    }
  }

  const filterFields = spec.filter ? Object.keys(flattenKeys(spec.filter)) : [];
  for (const field of filterFields) {
    const base = field.split('.')[0];
    if (!allowedFields.includes(base)) {
      throw new Error(`Non-whitelisted field: ${field}`);
    }
  }

  spec.limit = Math.min(spec.limit || 50, 200);
}

function flattenKeys(obj) {
  const keys = {};
  for (const key of Object.keys(obj)) {
    if (!key.startsWith('$')) keys[key] = true;
  }
  return keys;
}

module.exports = { nl2Query };