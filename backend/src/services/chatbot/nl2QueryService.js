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
   asking about invoices, customers, payments, products, or sales, treat it
   as data_query. Do NOT require exact phrasing like "how many X" — infer
   intent the way a human accountant would.
   Output shape:
   {
     "intent": "data_query",
     "collection": "invoices" | "products",
     "operation": "find" | "count" | "aggregate",
     "filter": {},
     "pipeline": [],
     "sort": {},
     "limit": 50,
     "unsupported": false,
     "reason": ""
   }

Schema (only these collections/fields exist, never invent others):
${JSON.stringify(SCHEMA_CONTEXT, null, 2)}

Allowed operations: ${ALLOWED_OPERATIONS.join(', ')}

Rules for data_query:
- "customers" are not a separate collection — customer questions run against
  invoices.customerName (e.g. group by customerName using aggregate).
- "payments" are not separate — use invoices.paymentMethod and invoices.status.
- If it needs data we don't have (${UNSUPPORTED_DOMAINS.join(', ')}),
  set "unsupported": true with a short "reason". Do not guess.
- "today"/"this month"/"this week"/"yesterday" -> compute real ISO date
  ranges yourself using the current date given below, filter on "date".
- Never invent fields. Never write/update/delete.

General rule (important):
- This system is READ-ONLY — it can only look up and report existing data,
  it cannot perform actions (cannot process payments, create invoices,
  update records, cancel anything, delete anything, add products, etc.).
  If the user is trying to DO something rather than ask about existing data,
  classify as "smalltalk" and briefly, naturally explain in "reply" that you
  can only look up and report data, not perform actions. Use your own
  judgment to recognize action-intent in any phrasing — do not rely on a
  fixed list of trigger words.

Return ONLY one JSON object, either shape above. Nothing else.
- For simple totals like "total invoices", "how many invoices in total",
  use operation "count" with an empty filter — do NOT use "aggregate" unless
  you actually need grouping, summing, or a "highest/most/top" style ranking.
  
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
    if (!spec.reply) spec.reply = "Hey! Ask me anything about invoices, payments, customers, or sales.";
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