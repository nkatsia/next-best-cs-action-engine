/**
 * n8n Code node: "Parse Email Analysis"
 *
 * The AI email-urgency classifier node only returns its own
 * completion — it doesn't carry forward the email's original fields.
 * This node re-attaches them by matching item index against the
 * 'Match Emails to Companies' node's output, and safely parses the
 * model's JSON reply (falling back to a manual-review flag if the
 * model returns something unparseable).
 */

const items=$input.all();
const source=$('Match Emails to Companies').all();
return items.map((item,i)=>{
  let parsed;
  try { parsed=JSON.parse(item.json.output[0].content[0].text); }
  catch(e){ parsed={sentiment:'Parse error', concern:'Review manually', urgency_flag:'Medium'}; }
  return {json:{...source[i].json, email_sentiment:parsed.sentiment, email_concern:parsed.concern, email_urgency_flag:parsed.urgency_flag}};
});
