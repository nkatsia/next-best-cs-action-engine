/**
 * n8n Code node: "Extract Full Email Body"
 *
 * Takes raw Gmail API message objects (which nest the body under
 * different keys depending on MIME type) and normalizes each into a
 * flat { company_id, to, from, subject, date, body_text } record.
 * Matches each email back to an account by parsing the '+alias@gmail.com'
 * subaddress it was sent to, and looking that alias up against the
 * account list (referenced directly from the Merge node's output).
 */

const items = $input.all();
const companies = $items("Merge");

function getToAddress(j) {
  const candidates = [];
  if (j.to) candidates.push(j.to);
  if (j.payload?.headers) {
    const h = j.payload.headers.find(x => String(x.name).toLowerCase() === 'to');
    if (h?.value) candidates.push(h.value);
  }
  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate;
    if (candidate.address) return candidate.address;
    if (Array.isArray(candidate.value) && candidate.value[0]?.address) return candidate.value[0].address;
  }
  return '';
}

function aliasFromTo(toValue) {
  const m = String(toValue || '').toLowerCase().match(/\+([^@>]+)@gmail\.com/);
  return m ? m[1].replace(/[^a-z0-9]/g, '') : '';
}

function getText(j) {
  if (j.text && String(j.text).trim()) return String(j.text);
  if (j.textAsHtml && String(j.textAsHtml).trim()) return String(j.textAsHtml);
  if (j.html && String(j.html).trim()) return String(j.html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (j.payload?.body?.data) return Buffer.from(j.payload.body.data, 'base64').toString('utf-8');
  if (Array.isArray(j.payload?.parts)) {
    const part = j.payload.parts.find(p => p.mimeType === 'text/plain') || j.payload.parts[0];
    if (part?.body?.data) return Buffer.from(part.body.data, 'base64').toString('utf-8');
  }
  return j.snippet || '';
}

const map = new Map(
  companies
    .map(c => [
      String(c.json.mailbox_alias || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
      c.json.company_id || ''
    ])
    .filter(([k]) => k)
);

return items.map(item => {
  const j = item.json;
  const toValue = getToAddress(j);
  const alias = aliasFromTo(toValue);
  const companyId = map.get(alias) || '';

  return {
    json: {
      company_id: companyId,
      to: toValue,
      from: j.from?.value?.[0]?.address || j.from?.address || j.from || '',
      subject: j.subject || '',
      date: j.date || '',
      body_text: getText(j)
    }
  };
});
