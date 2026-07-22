# Next Best CS Action Engine

An n8n workflow that scans a full book of 30–60 customer accounts every morning and outputs the top 5 to focus on today, each with a specific, explainable recommended action, not a generic "reach out".

Built to solve a real problem: without prioritization, a CSM's attention defaults to whoever emailed most recently, not whoever actually needs help most. The accounts most likely to churn quietly are often the ones generating *no* signal at all (no ticket, no email) just a renewal getting closer while nobody's looking.

📄 Full write-up with the "why" behind the design decisions: **[Case study →](#)**

## How it works

1. **Merge account data.** Pull companies and open tickets from HubSpot and combine them into one record per account — ARR, renewal date, health tier, open ticket count and severity.
2. **Score each account.** A rules layer (not the AI) converts those raw fields into four 0–100 scores — renewal proximity, health/risk tier, open escalations, expansion signal — see [`code/03-compute-account-risk-scores.js`](https://github.com/nkatsia/next-best-cs-action-engine/blob/main/03-compute-account-risk-scores.js).
3. **Enrich with email signal.** Recent inbound emails are classified for urgency/sentiment by an LLM, then **left-joined** onto the full account list, so an account with no recent email still gets ranked on its underlying risk — it isn't dropped for having gone quiet.
4. **Rank.** The four scores are combined into a single weighted priority score (weights match the order above) — see [`code/08-rank-top-5-accounts.js`](https://github.com/nkatsia/next-best-cs-action-engine/blob/main/08-rank-top-5-accounts.js) — and the top 5 are kept.
5. **Explain.** A second LLM call writes a one-line "why this, why now" and a specific recommended action for each of the top 5, referencing the actual signal (the ticket number, the renewal date, the email complaint) rather than a generic nudge.
6. **Post.** The formatted queue goes to Slack every morning.

## Repo structure

```
├── workflow/
│   └── next-best-cs-action-engine.json   ← import this directly into n8n
├── code/
│   └── 01–11 …                           ← every Code node's JS, commented, in pipeline order
├── docs/
│   └── debugging-notes.md                ← two real bugs found and fixed after the first version
└── README.md
```

## Running it yourself

1. Import [`workflow/next-best-cs-action-engine.json`](https://github.com/nkatsia/next-best-cs-action-engine/blob/main/next-best-cs-action-engine.json) into your own n8n instance (**Workflows → Import from File**).
2. Connect your own HubSpot, Gmail, Slack, and OpenAI credentials to the corresponding nodes — the JSON ships with placeholder credential references, not real ones, so nothing here works until you swap those in.
3. Point the Slack node at your own channel.
4. The `code/` folder mirrors the logic inside the workflow's Code nodes 1:1, in case you want to read through the scoring/parsing logic without opening n8n.

## Why this exists

I put this together as part of my Customer Success portfolio, to work through what "AI-fluent, automation-minded CSM" actually looks like in practice rather than as a buzzword, including the debugging, not just the demo. See [`docs/debugging-notes.md`](https://github.com/nkatsia/next-best-cs-action-engine/blob/main/debugging-notes.md) for two real correctness bugs I found and fixed after the first version looked like it was working.

## Tech stack

n8n · HubSpot API · Gmail API · OpenAI API · Slack API

## License

MIT — see [LICENSE](https://github.com/nkatsia/next-best-cs-action-engine/blob/main/LICENSE).
