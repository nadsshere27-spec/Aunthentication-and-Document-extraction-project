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
     "countOnly": false,
     "displayFields": [],
     "sort": {},
     "limit": 50,
     "unsupported": false,
     "reason": "",
     "customerLookup": false
   }

3) "action_query" — the user wants to CREATE, UPDATE, or DELETE a record.
   Output shape:
   {
     "intent": "action_query",
     "operation": "create" | "update" | "delete",
     "collection": "invoices" | "products",
     "target": { "displayId": null, "name": "" },
     "fields": {}
   }
   - For "create": put whatever fields the user already gave into "fields"
     (only real schema fields below). Leave "target" empty.
   - For "update"/"delete": fill "target" with a "displayId" or "name". Leave
     "fields" empty — specific changes are collected in a later step.
   - Do NOT decide what's missing or ask questions yourself here — that
     happens in a separate step. Just extract what you can from THIS message.

Schema (only these collections/fields exist, never invent others):
${JSON.stringify(SCHEMA_CONTEXT, null, 2)}

Allowed read operations: ${ALLOWED_OPERATIONS.join(', ')}
Allowed write operations: ${ALLOWED_WRITE_OPERATIONS.join(', ')}

CRITICAL — choosing the right collection:
- Questions about "a product", price/stock, "list of products", "products in
  category X", or creating/editing/deleting a PRODUCT -> collection: "products".
- Questions/actions about invoices, sales, revenue, a customer's purchase
  history -> collection: "invoices".
- Never confuse the product catalog with invoice line items.

CRITICAL — customers are always a DISTINCT-NAME question, never a raw count:
- "how many customers do we have" / "do we have N customers" / "is it N
  customers" -> this is ALWAYS about the number of DISTINCT customerName
  values, NEVER the total invoice count. Use:
  { "operation": "distinct", "collection": "invoices", "distinctField": "customerName", "countOnly": true }
  "countOnly": true means: just report how many distinct values there are,
  do not list them all.
- "list of customers" / "name all our customers" / "who are our customers"
  -> same distinct query but "countOnly": false (the full list is wanted).
- NEVER answer a customer-count question using operation "count" on the raw
  invoices collection — that counts invoices, not customers, and will be wrong.

CRITICAL — displayFields (which fields to actually show in the answer):
- Default (user didn't mention formatting) -> leave "displayFields": [] and
  the app will use sensible defaults.
- If the user explicitly asks to include/exclude specific fields, set
  "displayFields" to exactly the field names to show, e.g.:
  - "list product names without prices" -> "displayFields": ["name"]
  - "just the name and price" -> "displayFields": ["name", "price"]
  - "id and name only" -> "displayFields": ["displayId", "name"]
  - "with prices" (for products) -> "displayFields": ["name", "price"]
- Only use real field names from the schema above.

CRITICAL — distinguishing data_query from action_query:
- Reads ("how many", "what's the price of X", "list of X") -> data_query.
- "create/add/make ...", "delete/remove ...", "edit/update/change ..." -> action_query.
- A user asking for a specific OUTPUT FORMAT or brevity is NOT an action —
  it's a data_query with "displayFields" set accordingly. Never smalltalk.

Rules for data_query:
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
  fully supported via a safe confirmation flow — never refuse them.
- Only classify as smalltalk if the message is truly not about data at all.

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

  // ---- data_query ----

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

  // Validate displayFields against the schema too — never let an invented
  // field name leak through to the renderer.
  if (Array.isArray(spec.displayFields)) {
    spec.displayFields = spec.displayFields.filter((f) => allowedFields.includes(f));
  } else {
    spec.displayFields = [];
  }

  spec.countOnly = !!spec.countOnly;
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