/**
 * n8n Code node: "Rank Top 5 Accounts"
 *
 * The core scoring formula. Combines the four risk scores from step
 * 03 with a small modifier from the day's email activity, weighted in
 * the priority order from the case study: renewal proximity highest,
 * then health/risk tier, then open escalations, then expansion
 * signal. Sorts and keeps the top 5, tie-broken by ARR.
 */

const items = $input.all();

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Small modifier from the day's email activity — context, not the primary driver.
function emailModifier(flag, sentiment) {
  const f = String(flag || '').toLowerCase();
  let m = 0;
  if (f === 'high') m += 30;
  else if (f === 'medium') m += 15;

  const s = String(sentiment || '').toLowerCase();
  if (s.includes('negative')) m += 10;

  return m;
}

const ranked = items.map(item => {
  const j = item.json;

  const renewalProximity = num(j.renewal_proximity_score);
  const healthRisk = num(j.health_risk_score);
  const escalation = num(j.escalation_score);
  const expansion = num(j.expansion_score);
  const arr = num(j.arr);
  const emailMod = emailModifier(j.email_urgency_flag, j.email_sentiment);

  // Weighted by stated priority: renewal proximity > health/risk tier >
  // open escalations > expansion signal. Email activity is a light modifier.
  const overall_priority_score =
    (renewalProximity * 5) +
    (healthRisk * 3) +
    (escalation * 2) +
    (expansion * 1) +
    emailMod;

  return {
    json: {
      ...j,
      overall_priority_score,
    }
  };
});

ranked.sort((a, b) => {
  const sa = num(a.json.overall_priority_score);
  const sb = num(b.json.overall_priority_score);
  if (sb !== sa) return sb - sa;

  const ta = num(a.json.arr);
  const tb = num(b.json.arr);
  return tb - ta;
});

return ranked.slice(0, 5).map((item, index) => ({
  json: {
    ...item.json,
    priority_rank: index + 1,
    run_date: item.json.run_date || new Date().toISOString().slice(0, 10),
  }
}));
