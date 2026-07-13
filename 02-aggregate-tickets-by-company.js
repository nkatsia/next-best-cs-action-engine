/**
 * n8n Code node: "Aggregate Tickets by Company"
 *
 * Collapses individual support tickets into one summary row per
 * company: open ticket count and the single highest severity seen.
 * Input:  raw ticket objects from the HubSpot 'Get Tickets' node.
 * Output: one object per company_id with open_ticket_count,
 *         highest_severity, and a human-readable tickets_summary.
 */

const items = $input.all();

function getVal(obj, key) {
  if (!obj || !obj[key]) return '';
  if (typeof obj[key] === 'object' && obj[key] !== null) {
    if ('value' in obj[key]) return obj[key].value;
    if (obj[key].versions && obj[key].versions[0] && 'value' in obj[key].versions[0]) {
      return obj[key].versions[0].value;
    }
  }
  return obj[key];
}

const grouped = {};

for (const item of items) {
  const j = item.json;
  const p = j.properties || {};

  const id = getVal(p, 'company_id') || j.company_id || '';
  if (!id) continue;

  if (!grouped[id]) {
    grouped[id] = {
      company_id: id,
      open_ticket_count: 0,
      highest_severity: 'None',
      tickets_summary: []
    };
  }

  grouped[id].open_ticket_count += 1;

  const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

  const sevRaw = getVal(p, 'hs_ticket_priority') || 'LOW';
  const sev = String(sevRaw).toUpperCase();

  const subject = getVal(p, 'hs_ticket_id') || 'Untitled ticket';

  if ((rank[sev] || 0) > (rank[grouped[id].highest_severity.toUpperCase()] || 0)) {
    grouped[id].highest_severity = sevRaw;
  }

  grouped[id].tickets_summary.push(`${subject} (${sevRaw})`);
}

return Object.values(grouped).map(g => ({
  json: {
    ...g,
    tickets_summary: g.tickets_summary.join(' | ')
  }
}));
