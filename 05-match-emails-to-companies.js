/**
 * n8n Code node: "Match Emails to Companies"
 *
 * Light normalization pass on each email (lowercased, punctuation-
 * stripped versions of subject/from/body) so the AI classifier step
 * gets clean, consistent input.
 */

const items = $input.all();

function getBodyText(s) {
  return String(s || '').trim();
}

function extractMailText(item) {
  const j = item.json;
  return String(j.body_text || j.text || j.snippet || '');
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

return items.map(item => {
  const j = item.json;
  const body = extractMailText(item);
  const subject = String(j.subject || '');
  const from = String(j.from || '');

  return {
    json: {
      ...j,
      subject,
      from,
      body_text: body,
      body_norm: normalize(body),
      subject_norm: normalize(subject),
      from_norm: normalize(from),
    }
  };
});
