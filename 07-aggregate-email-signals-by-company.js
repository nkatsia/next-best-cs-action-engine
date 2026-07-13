/**
 * n8n Code node: "Aggregate Email Signals by Company"
 *
 * Multiple emails can map to the same account in a single run. This
 * collapses them to one row per company — keeping the most urgent
 * (and, on a tie, the most recent) — and drops any email that never
 * matched an account, so it doesn't pollute the join in the next step.
 */

const items = $input.all();

const urgencyRank = { high: 3, medium: 2, low: 1 };

const byCompany = {};

for (const item of items) {
  const j = item.json;
  const companyId = String(j.company_id || '').trim();
  if (!companyId) continue; // no matching account for this email — drop it

  const rank = urgencyRank[String(j.email_urgency_flag || '').toLowerCase()] || 0;
  const existing = byCompany[companyId];

  if (!existing) {
    byCompany[companyId] = { ...j, company_id: companyId, _rank: rank };
    continue;
  }

  const existingDate = new Date(existing.date || 0).getTime();
  const currentDate = new Date(j.date || 0).getTime();

  if (rank > existing._rank || (rank === existing._rank && currentDate > existingDate)) {
    byCompany[companyId] = { ...j, company_id: companyId, _rank: rank };
  }
}

return Object.values(byCompany).map(j => {
  const { _rank, ...rest } = j;
  return { json: rest };
});
