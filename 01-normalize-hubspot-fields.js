/**
 * n8n Code node: "Normalize HubSpot Fields"
 *
 * Cleans up raw HubSpot company records into a consistent shape.
 * Input:  raw company objects from the HubSpot 'Get Companies' node.
 * Output: one flat object per company (company_id, name, ARR, renewal
 *         date/stage, health status, mailbox alias, usage trend, etc).
 * HubSpot properties can live at different paths depending on how they
 * were created, so this leans on small helpers (getVal/firstNonEmpty)
 * to pull the first usable value from a list of possible field names.
 */

function getVal(obj, key) {
  if (!obj || !key) return '';
  if (typeof obj[key] === 'object' && obj[key] !== null && 'value' in obj[key]) {
    return obj[key].value;
  }
  return obj[key] ?? '';
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return v;
    }
  }
  return '';
}

function extractMailboxAlias(email) {
  const s = String(email || '').toLowerCase().trim();
  const match = s.match(/\+([^@]+)@gmail\.com$/);
  return match ? match[1].replace(/[^a-z0-9]/g, '') : '';
}

return items.map(item => {
  const j = item.json;
  const p = j.properties || {};

  const hubspotCompanyId = firstNonEmpty(
    j.companyId,
    j.id,
    j.hs_object_id,
    getVal(p, 'hs_object_id')
  );

  const companyCode = firstNonEmpty(
    getVal(p, 'company_id'),
    getVal(p, 'company_code'),
    getVal(p, 'company_code_id'),
    getVal(p, 'client_id'),
    getVal(p, 'customer_id'),
    getVal(p, 'external_company_id')
  );

  const contactEmail = firstNonEmpty(
    getVal(p, 'contact_email'),
    getVal(p, 'Contact Email'),
    ''
  );

  return {
    json: {
      hubspot_company_id: String(hubspotCompanyId || '').trim(),
      company_id: String(companyCode || '').trim(),
      mailbox_alias: extractMailboxAlias(contactEmail),
      company_name: firstNonEmpty(
        getVal(p, 'company_name'),
        getVal(p, 'name'),
        j.name
      ),
      domain: firstNonEmpty(
        getVal(p, 'domain'),
        ''
      ),
      contact_email: contactEmail,
      primary_contact_name: firstNonEmpty(
        getVal(p, 'primary_contact_name'),
        ''
      ),
      renewal_date: firstNonEmpty(
        getVal(p, 'renewal_date'),
        ''
      ),
      renewal_stage: firstNonEmpty(
        getVal(p, 'renewal_stage'),
        ''
      ),
      arr: firstNonEmpty(
        getVal(p, 'arr'),
        j.amount,
        0
      ),
      health_status: firstNonEmpty(
        getVal(p, 'health_status'),
        'unknown'
      ),
      cs_notes: firstNonEmpty(
        getVal(p, 'cs_notes'),
        ''
      ),
      // NOTE: verify this matches your actual HubSpot internal property name
      usage_trend: firstNonEmpty(
        getVal(p, 'usage_trend'),
        getVal(p, 'product_usage_trend'),
        ''
      )
    }
  };
});
