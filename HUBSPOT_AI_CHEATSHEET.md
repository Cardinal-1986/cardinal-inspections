# HubSpot AI — cheat sheet

**Compiled 1 Aug 2026 · covers through the Spring 2026 Spotlight (14 Apr 2026).**

HubSpot renamed most of this in the last eighteen months and a lot of the guidance online still
uses dead names. This sheet uses the current ones, separates the free parts from the metered
parts, and ends with the limitations that are easiest to find out about after you've paid.

> **How solid these numbers are.** The feature list and the April pricing change come from
> HubSpot's own newsroom and investor release. The credit allowances and overage rates come from
> trade coverage — `knowledge.hubspot.com` blocks automated access, so **none of the figures here
> were read from HubSpot's own documentation or from a live portal.** HubSpot repackages tiers most
> years. Treat every number below as the right order of magnitude and check the current figure in
> the account's billing page before committing to a plan.

---

## 1. Names that are dead

**Breeze** is the umbrella brand for every AI feature HubSpot ships. If a guide doesn't say
"Breeze," check its date before trusting the rest of it.

| You'll see | Status | Call it |
|---|---|---|
| **ChatSpot** | Retired | **Breeze Assistant** — retired at INBOUND 2025 |
| **Breeze Copilot** | Renamed | **Breeze Assistant** — same product, new name. Most tutorials still say Copilot |
| **Breeze Credits** | Renamed | **HubSpot Credits** — renamed June 2025 |
| **Breeze Intelligence** | Folded in | **Data enrichment** — used to have its own separate credit pool; it no longer does. Legacy plans were converted at published rates |

---

## 2. Three layers, and only one is free

Nearly all the confusion about HubSpot AI pricing comes from treating these as one product. They
bill completely differently.

| Layer | Who drives | What it is | Cost |
|---|---|---|---|
| **Breeze Assistant** | You | Chat box that can see the CRM. You ask, it answers or drafts | **Included on every plan, including the free CRM** |
| **Breeze Agents** | Itself | Six agents running unattended — support, prospecting, content, data | **Metered.** Not available at all on the free plan |
| **Data enrichment & intent** | Background | Fills in company fields nobody typed; flags buying signals | **Partly free** (standard fields), partly metered |

---

## 3. Breeze Assistant

The highest-value thing here, because it costs nothing and works on the free tier.

It is **context-aware** — open a contact, deal or ticket and say "summarize this" and it knows
which record is meant without being told. It also remembers pages visited and previous requests.

| It will | What that looks like in practice |
|---|---|
| **Summarize** | Compress a long email thread, a record's whole history, or a report into plain language |
| **Query** | Answer questions against live CRM data — pipeline state, stalled deals, trends — with no report building |
| **Draft** | Write emails and content, then push the draft back into the tool you were in |
| **Create tasks** | With due dates, descriptions, record associations and instructions. Genuinely useful from a phone |
| **Build workflows** | Describe the automation you want; it assembles it for review |
| **Prep you** | Pre-meeting briefings pulled from the record |

Two features worth knowing on day one: **saved prompts** (yours and HubSpot's, shareable across the
team) and **projects**, which keep a line of conversation together instead of one endless thread.

---

## 4. The agents

Six generally available, two in beta. Costs shown are the outcome-based rates HubSpot moved to on
**14 April 2026** — billed when the job completes, not when the agent attempts it.

| Agent | Status | What it does | Cost |
|---|---|---|---|
| **Customer** | GA | Support chatbot in the HubSpot chat widget, answering from knowledge base, website and uploaded files. Nine channels including WhatsApp and SMS; voice channel in beta. HubSpot reports it resolving 65% of conversations across 8,000 customers | **50 credits ≈ $0.50** per *resolved* conversation |
| **Prospecting** | GA | Rebuilt Spring 2026 to run the whole top of funnel — buying signals, company research, personalised outreach, booking the meeting, pre-call brief | **$1.00** per qualified lead handed to the team |
| **Content** | GA | Landing pages, blog posts, case studies and podcasts in brand voice, fed by CRM data | Credits per generation |
| **Social Media** | GA | Reads existing social presence, writes posts from company details, audience and industry. **English only** | Credits per generation |
| **Knowledge Base** | GA | Mines existing tickets and conversations into KB articles. Pairs directly with Customer Agent, which reads that same base | Credits per article |
| **Data** | GA | Ongoing CRM hygiene — enriching records, fixing gaps, keeping properties current | **Free** for standard fields; deeper properties bill |
| **Company Research** | Beta | Deeper account research on demand | — |
| **Customer Health** | Beta | Watches accounts for churn and expansion signals | — |

---

## 5. What it costs

Every AI feature draws from a single monthly allowance of **HubSpot Credits**.

| Plan | Credits / month | Agents available |
|---|---:|---|
| Free CRM | — | **Assistant only** — no agents at all |
| Starter | 500 | Yes |
| Professional | 3,000 | Yes |
| Enterprise | 5,000 | Yes |
| Customer Platform Enterprise | 10,000 | Yes |

Allowances vary somewhat by Hub. Overage runs about **$9–10 per 1,000 credits**, the lower end tied
to an annual commitment.

### The two rules that cost people money

- **Credits do not roll over.** Whatever isn't spent this month is gone. Over-buy and you burn it;
  under-buy and the agents stop mid-month.
- **Standard enrichment is now free** with Core seats — company revenue, industry, employee count
  and location auto-populate at no credit cost. Any guide telling you to budget credits for basic
  firmographics predates that change.

---

## 6. New in 2026 — Spring Spotlight, 14 April, 99 updates

| Feature | What it is |
|---|---|
| **HubSpot AEO** | Answer Engine Optimization — track and improve how the business shows up when someone asks ChatGPT or Gemini about it. The SEO equivalent for the era where customers ask a chatbot instead of searching |
| **Smart Deal Progression** | AI reads full deal history and pushes deals forward. **Suggestion model** — a rep approves every proposed update |
| **AI Connectors** | Official connectors putting CRM data inside Claude, ChatGPT, Gemini and Microsoft Copilot, plus a remote MCP server for building your own. The Claude connector was extended 29 Jul 2026 to reach landing pages, campaigns and revenue objects |
| **Run Agent action** | A workflow step that fires an agent, making agents something automation can trigger rather than a separate thing you go and use |
| **Audit Cards** | Show why an agent did what it did — the accountability layer that was missing |

---

## 7. Prompts worth saving

Assistant is contextual, so the short ones work best while you're looking at the record they refer
to. Saved prompts are shareable to the whole team.

| Use | Prompt |
|---|---|
| On any record | *Summarize this — what's happened, where it stands, what I owe them.* |
| Pipeline triage | *Which deals haven't moved in 21 days, and what was the last thing that happened on each?* |
| Before a call | *Brief me on this company before my call: what they do, who I'm meeting, and everything we've discussed.* |
| Follow-up | *Draft a follow-up to this contact referencing our last conversation. Under 120 words, plain, no exclamation marks.* |
| List building | *Build me a list of contacts with no activity in 60 days on deals worth over $10,000.* |
| What changed | *What changed on this deal since last Monday?* |
| Automation | *Build a workflow that assigns a task to the deal owner when a deal sits in Proposal for 10 days.* |
| Support into docs | *Turn these tickets into one knowledge base article, written for a customer not a rep.* |

---

## 8. Gotchas

- **"Resolution" is generously defined.** Customer Agent bills per resolved conversation — but if
  the agent shares *any* knowledge source, that counts as a resolution. You can pay for answers
  that didn't help.
- **Knowledge sources are fenced.** Agents can learn from HubSpot help center content, your
  website, and file uploads. That's the list. If procedures live in Notion, Google Drive or
  Confluence, you're exporting and re-uploading them, and re-doing it every time they change.
- **No custom instructions.** You can't give an agent standing behavioural rules — no "always push
  this offer," no "ask about roof age first," no house tone of voice.
- **Credits expire monthly.** No rollover. Sizing the pack is a recurring guess with a cost
  attached in both directions.
- **Suggestions still need a human.** Smart Deal Progression proposes; a rep approves each one.
  Budget the review time, not just the licence.
- **Insight, not orchestration.** Breeze reasons well over data already in HubSpot. It does not run
  your process across other systems — routing, qualification and scheduling that live elsewhere
  stay elsewhere.
- **Social Media Agent is English-only**, per HubSpot's own product page.

---

## Sources

- [HubSpot IR — Spring 2026 Spotlight release](https://ir.hubspot.com/news-releases/news-release-details/hubspot-puts-growth-context-work-new-hubspot-aeo-smart-deal)
- [HubSpot — outcome-based pricing announcement](https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete)
- [HubSpot Knowledge Base — Understand Agent Hub](https://knowledge.hubspot.com/ai/understand-breeze)
- [HubSpot Knowledge Base — Manage HubSpot Credits](https://knowledge.hubspot.com/account-management/understand-hubspot-credits-and-billing)
- [MarTech — outcome-based pricing for Breeze agents](https://martech.org/hubspot-moves-to-outcome-based-pricing-for-some-breeze-ai-agents/)
- [Martech Notes — Claude connector expansion, 29 Jul 2026](https://www.martechnotes.com/hubspot-expands-claude-connector-with-landing-pages-campaigns-and-revenue-objects-in-july-29-update/)
- [Stream Creative — HubSpot AI agents overview 2026](https://www.streamcreative.com/hubspot-ai-agents)
- [eesel AI — Breeze limitations review](https://www.eesel.ai/blog/is-hubspot-breeze-worth-it)
- [My AskAI — Breeze features, pricing and limitations](https://myaskai.com/blog/hubspot-breeze-ai-agent-complete-guide-2026)
- [Vantage Point — HubSpot AI credit allowances](https://vantagepoint.io/blog/hs/hubspot-ai-credits-free-allowance-guide)
