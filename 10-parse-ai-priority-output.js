/**
 * n8n Code node: "Parse AI Priority Output"
 *
 * Same problem as step 06: the AI 'why + action' node's output
 * replaces the item's json with just its own completion, so
 * company_name / company_id / email_sentiment / overall_priority_score
 * would otherwise come through empty. This re-attaches them from the
 * 'Rank Top 5 Accounts' node's output by index, then extracts the
 * model's one-line reason and recommended action.
 */

const items = $input.all();
const source = $('Rank Top 5 Accounts').all();

function extractText(j) {
  return j.raw_ai_text
    ?? j.output?.[0]?.content?.[0]?.text
    ?? j.output?.content?.[0]?.text
    ?? j.output_text
    ?? '';
}

function parseJsonFromText(text) {
  if (!text) return {};
  const s = String(text).trim();
  if (!s) return {};
  try { return JSON.parse(s); } catch {}
  const arrayMatch = s.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  return {};
}

function first(v, fallback = '') {
  return v === undefined || v === null || String(v).trim() === '' ? fallback : v;
}

// The AI node's own output replaces each item's json — it does not carry
// forward company_name/company_id/email_sentiment/overall_priority_score
// from before the AI call. Pull those back in from Rank Top 5 Accounts by
// index (same pattern Parse Email Analysis uses for the other AI node).
return items.map((item, i) => {
  const j = item.json;
  const base = source[i] ? source[i].json : {};

  const raw = extractText(j);
  const parsed = parseJsonFromText(raw);
  const entry = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;

  return {
    json: {
      ...base,
      company_name: first(base.company_name),
      company_id: first(base.company_id),
      email_sentiment: first(base.email_sentiment),
      overall_priority_score: first(base.overall_priority_score),
      priority_rank: first(base.priority_rank, entry.rank),
      parsed_priority: first(entry.priority ?? entry.sentiment ?? entry.urgency_flag),
      parsed_reason: first(entry.why_today ?? entry.reason ?? entry.concern),
      parsed_action: first(entry.recommended_action ?? entry.action),
      raw_ai_text: raw,
    }
  };
});
