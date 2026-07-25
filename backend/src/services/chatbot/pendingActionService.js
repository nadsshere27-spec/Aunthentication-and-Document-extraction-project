// backend/src/services/chatbot/pendingActionService.js
//
// Helpers for interpreting a follow-up message in the middle of a
// create/update/delete flow (e.g. answering "what's the price?" with "2$",
// or confirming a delete with "yes").

const Groq = require('groq-sdk');
const { SCHEMA_CONTEXT, NON_WRITABLE_FIELDS } = require('../../config/schemaContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Strict, deterministic yes/no check — kept OUT of the LLM on purpose so a
// destructive delete confirmation never depends on model judgment calls.
function detectYesNo(message) {
  const m = message.trim().toLowerCase();
  if (/^(yes|yeah|yep|yup|confirm|go ahead|sure|ok|okay|do it|please do)\b/.test(m)) return 'yes';
  if (/^(no|nah|nope|cancel|stop|don't|dont)\b/.test(m)) return 'no';
  return null;
}

function stripCodeFences(text) {
  return text.replace(/^```json\s*|^```\s*|```$/gm, '').trim();
}

// Extract a single field's value from a free-form reply, e.g.
// fieldName="price", message="2$" -> 2
async function extractFieldValue(collection, fieldName, message) {
  const fieldType = SCHEMA_CONTEXT[collection].fields[fieldName] || 'String';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Extract the value for the field "${fieldName}" (type: ${fieldType}) from the `
          + `user's message. Reply with STRICT JSON only: { "value": <correctly typed value> } `
          + `or { "value": null } if you can't find one. Strip currency symbols/units from `
          + `numbers (e.g. "2$" -> 2). No prose, no markdown.`,
      },
      { role: 'user', content: message },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  try {
    const parsed = JSON.parse(stripCodeFences(completion.choices[0].message.content.trim()));
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

// Extract one or more field changes from an update message, e.g.
// "change its price to 3$" -> { price: 3 }
async function extractChanges(collection, message) {
  const allowed = Object.keys(SCHEMA_CONTEXT[collection].fields).filter(
    (f) => !NON_WRITABLE_FIELDS.includes(f)
  );

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `The user wants to update a ${collection} record. Allowed fields: `
          + `${allowed.join(', ')}. Extract which field(s) they want changed and the new `
          + `value(s). Reply with STRICT JSON only: { "changes": { "field": value, ... } }. `
          + `Only use fields from the allowed list. Strip currency symbols from numbers `
          + `(e.g. "3$" -> 3). If nothing clear, return { "changes": {} }. No prose.`,
      },
      { role: 'user', content: message },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  try {
    const parsed = JSON.parse(stripCodeFences(completion.choices[0].message.content.trim()));
    return parsed.changes || {};
  } catch {
    return {};
  }
}

module.exports = { detectYesNo, extractFieldValue, extractChanges };