/**
 * n8n Code node: "Message"
 *
 * Formats the final ranked list into the plain-text block that gets
 * posted to Slack, with graceful fallbacks ("—") for any field that's
 * still missing so a formatting bug never breaks the whole message.
 */

const items = $input.all();

function clean(v, fallback = '—') {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s === '' ? fallback : s;
}

function pick(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

return [{
  json: {
    message: items.map(item => {
      const j = item.json;

      const company = pick(j.company_name, j.company_id);
      const why = pick(j.parsed_reason, j.why_today, j.parsed_priority, j.raw_ai_text);
      const action = pick(j.parsed_action, j.recommended_action);

      return `📋 Rank: ${clean(j.priority_rank)} (score ${clean(j.overall_priority_score)})
Company: ${clean(company)}
Email sentiment: ${clean(j.email_sentiment)}
Why today: ${clean(why)}
Action: ${clean(action)}`;
    }).join('\n\n---\n\n')
  }
}];
