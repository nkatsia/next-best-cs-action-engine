/**
 * n8n Code node: "Compute Account Risk Scores"
 *
 * Turns raw account fields into four numeric 0-100 scores that feed
 * the ranking formula: renewal proximity, health/risk tier, open
 * escalations, and expansion signal (usage trend).
 * Input:  the merged company + ticket record for each account.
 * Output: the same record, with the four *_score fields added.
 * This is the 'rules layer' referenced in the case study — it exists
 * so the ranking is driven by explicit, tunable business logic rather
 * than asking the LLM to invent a score.
 */

const items = $input.all();

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Renewal proximity: closer renewal = higher score. Overdue counts as max urgency.
function renewalProximityScore(dateStr) {
  if (!dateStr) return 0;
  const renewal = new Date(dateStr);
  if (isNaN(renewal.getTime())) return 0;
  const now = new Date();
  const daysToRenewal = Math.ceil((renewal - now) / 86400000);
  if (daysToRenewal <= 30) return 100;
  if (daysToRenewal <= 60) return 75;
  if (daysToRenewal <= 90) return 50;
  if (daysToRenewal <= 180) return 25;
  return 5;
}

// Health / risk tier: worse health = higher score.
function healthRiskScore(status) {
  const v = String(status || '').toLowerCase().replace(/[^a-z]/g, '');
  const map = { atrisk: 100, critical: 100, watch: 55, monitor: 55, healthy: 10, good: 10, unknown: 35 };
  return map[v] ?? 35;
}

// Open escalations: ticket volume + highest severity.
function escalationScore(count, severity) {
  const sevMap = { LOW: 10, MEDIUM: 30, HIGH: 60, URGENT: 100, NONE: 0 };
  const sevScore = sevMap[String(severity || 'NONE').toUpperCase()] ?? 0;
  const countBonus = Math.min(num(count) * 8, 40);
  return Math.min(sevScore + countBonus, 100);
}

// Expansion signal: rising usage = upsell opportunity.
// NOTE: verify 'usage_trend' matches your actual HubSpot property values.
function expansionScore(trend) {
  const v = String(trend || '').toLowerCase();
  if (v.includes('increas') || v.includes('grow') || v.includes('expand')) return 80;
  if (v.includes('stable') || v.includes('flat')) return 20;
  return 0;
}

return items.map(item => {
  const j = item.json;
  return {
    json: {
      ...j,
      renewal_proximity_score: renewalProximityScore(j.renewal_date),
      health_risk_score: healthRiskScore(j.health_status),
      escalation_score: escalationScore(j.open_ticket_count, j.highest_severity),
      expansion_score: expansionScore(j.usage_trend),
    }
  };
});
