const Groq = require('groq-sdk');
const { SCHEMA_CONTEXT, ALLOWED_OPERATIONS, UNSUPPORTED_DOMAINS } = require('../../config/schemaContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_INSTRUCTIONS = `
You are an accounting assistant's brain. You receive ANY message a user sends
to a business chatbot — it could be a real data question, a greeting, small
talk, an action request, or a vague/casual phrase. Your job is to classify it
and respond correctly. Output STRICT JSON only, no markdown, no prose, no
backticks.

There are two possible intents:

1) "smalltalk" — greetings, thanks, "who are you", "what can you do",
   unclear messages, or anything not actually asking for existing business
   data. This also covers action requests (see rule below).
   Output shape:
   { "intent": "smalltalk", "reply": "short natural first-person reply" }

2) "data_query" — ANY question, in ANY phrasing, that is asking about real
   business data covered by the schema below. This includes short fragments
   like "invoices today?", "unpaid ones", "mobile category count", casual
   phrasing, missing question words, typos, whatever — if the user is clearly
   asking about invoices, customers, or products, treat it as data_query.
   Do NOT require exact phrasing like "how many X" — infer intent the way a
   human accountant would.
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

Schema (only these collections/fields exist, never invent others):
${JSON.stringify(SCHEMA_CONTEXT, null, 2)}

Allowed operations: ${ALLOWED_OPERATIONS.join(', ')}

CRITICAL — choosing the right collection:
- Questions about "a product", a specific product's price/stock, "list of
  products", "products in category X", "what do we sell", "name a product" ->
  ALWAYS collection: "products". Use a case-insensitive $regex on
  products.name when one specific product is named, e.g.
  { "collection": "products", "operation": "find",
    "filter": { "name": { "$regex": "Bluetooth Speaker", "$options": "i" } } }
- Questions about invoices, sales, revenue, a customer's purchase history, or
  "what was sold" on a given date -> collection: "invoices".
- Never answer a product-catalog question (price, stock, "list of products")
  by querying invoices, even though invoices also has itemName/category
  fields — those describe a past sale, not the current product catalog.

Rules for data_query:
- There is no separate "customers" collection. Customer questions run against
  invoices.customerName:
  - "list of customers" / "who are our customers" / "give me customer list"
    -> { "operation": "distinct", "collection": "invoices", "distinctField": "customerName", "filter": {} }
    This is a FULLY SUPPORTED question. Never mark it unsupported.
  - "info about customer X" / "how much did X buy" / a question naming ONE
    specific customer -> { "operation": "find", "collection": "invoices",
    "filter": { "customerName": { "$regex": "X", "$options": "i" } },
    "customerLookup": true }
- "payments" are not separate — use invoices.paymentMethod and invoices.status.
- "list of categories" / "what categories do we sell" -> distinct on the
  relevant collection's "category" field.
- If it needs data we don't have (${UNSUPPORTED_DOMAINS.join(', ')}),
  set "unsupported": true with a short "reason". Do not guess.
- "today"/"this month"/"this week"/"yesterday" -> compute real ISO date
  ranges yourself using the current date given below, filter on "date".
- Never invent fields. Never write/update/delete.
- For "list"/"show me"/"give me all" style requests, do not artificially cap
  results — set limit to 200 (the max allowed) rather than a small default,
  so the full list can actually be returned.
- For simple totals like "total invoices", "how many invoices in total",
  use operation "count" with an empty filter — do NOT use "aggregate" unless
  you actually need grouping, summing, or a "highest/most/top" style ranking.
- Set "minimal": true whenever the user asks for a brief/stripped-down answer
  (e.g. "just the name and price", "without extra info", "keep it short",
  "just tell me X"). This is a formatting preference on a normal data_query —
  see the rule below, it is NEVER an action request.

IMPORTANT — formatting requests are NOT actions:
- A user asking for a specific OUTPUT FORMAT or brevity ("just give me the
  name and price", "no extra information", "just list the names", "short
  answer please") is still asking a data_query — they are only describing
  HOW they want the answer presented, not asking you to create, edit, or
  store anything. Never classify these as smalltalk/action requests. Set
  "minimal": true and proceed with the data_query as normal.

General rule (important):
- This system is READ-ONLY — it can only look up and report existing data,
  it cannot perform actions (cannot process payments, create invoices,
  update records, cancel anything, delete anything, add products, etc.).
  If the user is trying to DO something to the underlying DATA rather than
  ask about or reshape how existing data is presented, classify as
  "smalltalk" and briefly, naturally explain in "reply" that you can only
  look up and report data, not perform actions. Use your own judgment to
  recognize genuine data-modifying action-intent — do not confuse a
  formatting/brevity request with an action request.

Return ONLY one JSON object, either shape above. Nothing else.
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