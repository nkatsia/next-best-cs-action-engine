# Debugging notes

The first version of this workflow ran without errors and posted a Slack message every morning. It still had two bugs that wouldn't have shown up unless you actually checked whether the *ranking* made sense, not just whether the workflow completed.

## Bug 1: silent accounts never reached the ranking step

**Symptom:** the queue only ever contained accounts that had emailed recently. An account approaching renewal with zero email activity — arguably the accounts this workflow exists to catch — never appeared, no matter how urgent its underlying risk.

**Cause:** the item list downstream of the account merge was driven by the Gmail search results, not the full account list. An account with no matching email simply had no item to carry it through the rest of the pipeline.

**Fix:** restructured the flow so the full merged account list is the "spine," and email signal is *enriched* onto it via a left join (`Enrich Accounts With Email Signals` → `Apply Email Defaults`), instead of gating which accounts get considered at all. An account with no recent email now gets a neutral default (`email_urgency_flag: "Low"`, `email_sentiment: "None"`) and is still scored on renewal proximity, health tier, and open tickets.

I also caught, while fixing this, that the scoring formula itself weighted email urgency roughly 1000x more than every other factor — meaning even when an account did reach the ranking step, whoever emailed most urgently basically always won, which is the exact bias this workflow was supposed to correct. Rebalanced the weights to match the stated priority order: renewal proximity highest, then health/risk tier, then open escalations, then expansion signal, with email activity as a minor modifier.

📸 *Screenshot: before/after — a silent, at-risk account missing from the old ranked output vs. present in the new one*

## Bug 2: the AI step was silently dropping fields

**Symptom:** the final Slack message had the right reasoning and recommended action for each account, but company name, email sentiment, and priority score all showed up blank (`—`).

**Cause:** the LLM node that writes the "why this, why now" justification returns *only* its own completion as the item's data — it doesn't carry forward whatever was on the item before the AI call. Rank, oddly, still worked, because the model happened to echo `"rank"` back inside its own JSON response; company name and sentiment weren't part of what I'd asked the model to return, so once the AI node ran, they were just gone.

**Fix:** in the parsing step immediately after the AI call, pulled the original account data back in by matching item index against the node's output *before* the AI call (`$('Rank Top 5 Accounts').all()`), the same pattern already used elsewhere in the workflow for the email-classification step. The AI's own JSON reply is still used for the reasoning and action text — just not trusted for anything it wasn't explicitly asked to return.

📸 *Screenshot: the empty `company_name` / `email_sentiment` columns in the Parse step, next to the same node after the fix*

## Takeaway

Both bugs were invisible from the workflow's execution status — n8n reported success both times. They only showed up by actually reading the output against what I knew the underlying accounts looked like. That's the same instinct a CSM needs when a health score dashboard says everything's green but a specific account clearly isn't: trust the specifics over the summary.
