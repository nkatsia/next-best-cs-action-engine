/**
 * n8n Code node: "Apply Email Defaults"
 *
 * After left-joining email signals onto the full account list, some
 * accounts won't have a match (they simply didn't email recently —
 * which is exactly the case this workflow exists to catch). This
 * fills those with neutral defaults instead of leaving them blank,
 * and drops any stray join artifacts that aren't real accounts.
 */

const items = $input.all();

return items
  .filter(item => item.json.company_name !== undefined) // keep only real accounts
  .map(item => {
    const j = item.json;
    return {
      json: {
        ...j,
        email_sentiment: j.email_sentiment || 'None',
        email_urgency_flag: j.email_urgency_flag || 'Low',
        email_concern: j.email_concern || 'No recent email activity',
      }
    };
  });
