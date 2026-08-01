# Working with AI — a field manual

**Prompting, agents, building software, and getting found.** Everything worth knowing on day one,
in the order it becomes useful.

Nothing here needs a technical background. Part 1 is the twenty minutes of theory that makes the
other four parts land; skip it and the rest reads like a list of tricks. Every prompt is meant to be
copied as written.

---

## Part 1 — What you're actually talking to

Four facts. They explain nearly every surprising thing AI does, good and bad.

1. **It predicts text.** It isn't looking anything up unless you hand it something to read or give
   it a search tool. Everything it "knows" is a statistical impression of an enormous amount of
   writing. That's exactly why it's superb at phrasing and unreliable on facts — those are the same
   ability.
2. **It has no memory unless something gives it one.** A new chat starts from nothing. It doesn't
   remember yesterday, your prices, or the decision you made last week. Anything it needs to know,
   you supply — which is why the project instructions file in Part 4 is such a large lever.
3. **It is exactly as confident when it's wrong.** There's no tell. An invented part number reads
   identically to a real one. Anything with a number, a name, a price, a date, or a citation gets
   verified before you act on it.
4. **It agrees with you too easily.** Push back and it will often fold, including when it was right.
   So don't ask "is this correct?" — ask "what's wrong with this?" The second question gets you a
   real answer.

### Three shapes, and they get confused constantly

| Shape | What it is | What that looks like for you |
|---|---|---|
| **Chat** | You ask, it answers. One exchange at a time, you drive | "Rewrite this estimate email so it doesn't sound like a lawyer wrote it." |
| **Agent** | You give it a goal and tools. It takes steps on its own until the job is done | "Go through last week's unanswered email and draft a reply to each one." |
| **App** | AI wired into software, doing one job invisibly | The photo captioner and the librarian inside the Cardinal app |

Most people's disappointment comes from using the wrong shape — asking a chat window to do an
agent's job, or building an app for something a two-line prompt already handles.

---

## Part 2 — Prompting

A prompt is a work order, not a wish. You'd never tell a crew "do the roof" and walk away — same
principle, and the same four things are missing when it goes wrong.

### Every good prompt has four parts

| Part | The question it answers |
|---|---|
| **Context** | What's going on, and who is this for? |
| **Task** | What do you actually want it to do — the verb? |
| **Format** | How long, what shape, what does the output look like? |
| **Constraints** | What should it leave out, avoid, or not assume? |

**What most people write:**

> Write an email to a customer about a delay.

**What gets a usable first draft:**

> We're a roofing contractor in Dayton. A supplier delay pushed a homeowner's tear-off from Tuesday
> to the following Monday, and she's already taken a day off work for it. Write her a short email —
> under 120 words, plain, no apologising three separate times. Say what happened, give the new date,
> and offer to work around her schedule. Don't offer a discount.

Same request. The second one takes forty seconds longer to type and saves three rounds of "no,
shorter."

### The eight habits, in order of how much they're worth

1. **Show it an example.** The single biggest jump in quality available to you. Paste an estimate or
   email you were happy with and say "match this." One example beats any amount of describing what
   you want.
2. **Give it the raw material — don't summarise for it.** Paste the whole email thread, the whole
   spec sheet, the actual photo. Your summary throws away the details it would have picked up on.
3. **Let it interview you first.** *"Before you answer, ask me up to five questions that would
   change your answer."* This is the highest-value sentence in this document for someone new. It
   surfaces everything you forgot to mention.
4. **Ask for options, not an answer.** "Give me three versions — one blunt, one warm, one formal."
   Picking is faster than iterating, and you learn what you actually wanted.
5. **Steer, don't restart.** "Shorter. Cut the second paragraph. Less salesy." A conversation
   converges on what you want. Opening a fresh chat throws away everything it learned.
6. **Make it attack its own work.** "What's wrong with this? What did you miss? What would a
   sceptical homeowner push back on?"
7. **Ask what it's unsure about.** "Which parts of that are you least confident in?" It's
   surprisingly honest, and it hands you a precise list of what to verify.
8. **Name the audience.** "Explain this to a homeowner who has never filed a claim" produces a
   different — and better — answer than the same question with no audience attached.

### Swaps worth memorising

| Instead of this | Write this |
|---|---|
| "Write a blog post about roofing." | "Write 400 words for homeowners in Montgomery County who just found a leak after a storm — what to do in the first 48 hours. Plain language, no scare tactics." |
| "Is this right?" | "What's wrong with this? What did you miss?" |
| "Make it better." | "Cut it to half the length and drop the marketing adjectives." |
| "Don't make it too long." | "Under 150 words." |
| Asking it for current material prices | Pasting your supplier's current sheet, then asking |
| Starting a new chat when it gets something wrong | Correcting it in the same chat |

### Four things that don't help, so you can stop doing them

- **Shouting.** "CRITICAL — YOU MUST ALWAYS…" was necessary on older models and is now actively
  counterproductive. Current models follow plain instructions closely, and aggressive phrasing makes
  them overcorrect. Write it like a normal sentence.
- **"Act as a world-class expert…"** Mostly theatre now. Telling it the *audience* and the
  *constraints* does real work; telling it it's brilliant does not.
- **Length for its own sake.** A long prompt isn't a good prompt. Structure beats volume — four
  clear sentences beat four rambling paragraphs.
- **Politeness.** "Please" and "thank you" don't improve the output. They don't hurt either, and
  they cost nothing, so do whatever feels normal.

---

## Part 3 — Agents, when it does the work

Chat answers a question. An agent does a job. That's the entire distinction, and it's where most of
the real time savings live.

**The loop, in full:** goal → make a plan → take an action with a tool → look at what actually
happened → adjust → repeat → stop when done. Everything else is detail. The tools are what make it
an agent: reading files, searching the web, running a command, sending an email, querying your
database.

### Worth handing over vs. not

| Hand it over when | Keep it yourself when |
|---|---|
| It takes many steps and you can check the result | It's a judgment call with real consequences — who to hire, what to bid |
| It needs tools: files, email, a browser, a database | It depends on things it can't see — the yard, the crew, what the adjuster said on the phone |
| It's twenty minutes of clicking you'd rather not do | Ninety percent right is worse than not doing it — sending, paying, deleting |
| "Done" is obvious when you see it | You couldn't tell a good result from a bad one at a glance |

### The one rule

**Review before it's irreversible.** Draft, don't send. Stage, don't push. And on anything of
consequence, open with seven words: *"Show me your plan before you start."* That single sentence
catches most bad runs while they're still free.

### Jobs that genuinely fit

| Job | Why it fits |
|---|---|
| Turn a week of jobsite photos into captioned records | Repetitive, many steps, and wrong answers are obvious at a glance |
| Read a 40-page insurance scope and flag every line that doesn't match your estimate | Tedious and mechanical — exactly what it's good at — and the output is a checkable list |
| Draft replies to a week of unanswered email, none sent | Multi-step, and the review gate is built in |
| Pull every job that hasn't moved in 21 days with a one-line status each | Data gathering plus writing, and you can spot-check any row |
| Watch a deploy and fix what breaks | Needs tools, has an unambiguous finish line: it's green or it isn't |

**What it costs.** An agent runs many steps, so it costs meaningfully more than a single chat
message — you're trading tokens for your own time. Worth it when the job really is twenty minutes of
clicking. Not worth it for a question you could have just asked.

---

## Part 4 — Building apps and features

You're already doing this — the Cardinal app is the proof. So this part is the leverage list rather
than an introduction.

### Start here — worth more than everything below combined

**Write a project instructions file.** One document at the root of the project explaining what it
is, how it's built, the rules that must not be broken, and what's already been tried and failed.
Every new session starts informed instead of guessing, and stops re-learning the same lessons.
Cardinal has one — that's the reason a fresh session can find its way around a 3 MB file instead of
inventing a second version of something that already exists.

### The eight rules

1. **Describe the outcome, not the code.** "When a photo has no caption, show a pencil that opens
   the editor" beats any attempt to specify the implementation. You know what it should do; it knows
   how to do it.
2. **Give it the existing code before asking for a change.** Most bad AI code is invented from
   scratch right next to something that already worked. Show it what's there.
3. **Ask it to find the feature before building it.** A surprising share of "missing" features
   already exist and are just unreachable — hidden behind a z-index, mounted to an anchor that's
   gone. "Search for this before you add it" costs one sentence and saves whole builds.
4. **One feature at a time, verified.** A big ask returns a big pile you can't check. Small steps
   you can watch working beat one giant leap every time.
5. **Say how you'll know it worked.** "I'll know it's right when I tap the pencil and the editor
   opens over the photo." That's an acceptance test, and stating it up front changes what gets
   built.
6. **Ask for the plan before the code.** "Before writing anything, tell me what you'll change and
   where." Catching a wrong approach here is free; catching it after is a rebuild.
7. **Ask for options with real costs.** "Give me two ways — one patch, one replace — and what each
   one costs." You're the one who knows which trade-off is acceptable.
8. **Commit before anything ambitious.** Version control is the undo button. With a clean commit
   behind you, bold changes cost nothing to try.

### Where it shines, where it doesn't

| Genuinely excellent | Still shaky |
|---|---|
| Boilerplate, forms, styling, glue code | Knowing what your users actually need |
| Explaining code somebody else wrote | Architecture calls with long consequences |
| Finding a bug once you can reproduce it | Guessing at a bug you can't reproduce |
| Writing the tests you'd never write yourself | Noticing that its own code does nothing |
| Refactoring toward a target you've named | Stopping when it should stop |

### The failure nobody warns you about

It can write code that is perfectly valid, runs without a single error, and **does nothing at all**
— because it was built against a data shape that doesn't exist in your database. It passes every
check. It ships. It's inert. This has happened on Cardinal: a photo-signing change was verified
against tidy example data and shipped completely dead, because no real photo record had the fields
the code was looking for. **Check the real data shape first, then build.**

### One note on which AI

For writing an email, the choice barely matters. For code, it matters a lot — the gap between a
top-tier model and a cheap one is the difference between a working feature and an afternoon of
debugging. Use the strongest coding model you have access to; you're already on Claude Opus 5 in
Claude Code, which is the right end of that scale.

---

## Part 5 — Marketing, SEO and the website

One genuinely new thing has happened, one old thing still pays better than anything else, and one
widespread belief is simply false.

### The new thing: people ask instead of searching

Roughly half of US adults now use ChatGPT, Gemini, Claude or Copilot. A real share of "who's a good
roofer in Dayton" now happens inside a chatbot rather than a search box — which means there's a
second front door to your business, and it isn't ranked the way Google's is. The discipline has a
name: **AEO**, answer engine optimization.

Three levers actually move it, and all three are under your control:

1. **Structure.** Answer engines extract passages. Clear headings, one question per section, and the
   direct answer near the top rather than buried under three paragraphs of throat-clearing.
2. **Freshness.** The one people underrate. Of AI citations on commercial queries, 83% came from
   pages updated within twelve months, and over 60% from pages updated within six. A page you
   haven't touched since 2023 is invisible here.
3. **Clear identity.** Say plainly who you are, where you work, and what you do — and put it in
   schema markup (`LocalBusiness`, reviews, FAQ) so it's machine-readable. That's how an answer
   engine knows you're a real Dayton roofer and not a directory page.

The scoreboard changes too. It's no longer rankings and clicks; it's **do you appear at all** and
**how often are you cited**. You can run the entire measurement programme yourself: once a month,
ask ChatGPT, Gemini and Perplexity "best roofing contractor in Dayton Ohio," and write down what
comes back.

### The old thing that still pays best: your Google Business Profile

For a contractor, nothing else comes close. Google Business Profile signals drive around 32% of Map
Pack rankings — the single largest factor, and eight of the top ten local signals come straight from
the profile.

| Lever | What to know |
|---|---|
| **Primary category** | Set it to *Roofing Contractor*, not *General Contractor*. Reported as the single most impactful change available on the profile, and it takes one minute |
| **Reviews** | About 20% of local ranking. **Recency counts as much as volume** — a 4.5 with reviews from this month outranks a 5.0 whose last review was two years ago. A steady trickle beats a burst |
| **Photos** | Five or more new project photos a month correlates with better Map Pack visibility. You already take these on every job |
| **Completeness** | A fully completed profile gets roughly 7× the clicks of an incomplete one |
| **Proximity** | The one factor you can't do anything about. Which is exactly why you should max out the four above |

### The false belief: "Google penalises AI content"

It doesn't. Google's policy is deliberately origin-agnostic — it judges whether a page is helpful,
original and made for people, not what produced it. AI-assisted pages rank perfectly well. What gets
punished is **scaled content abuse**: mass-producing thin, near-identical pages to game rankings.
That was already worthless before AI existed; AI just made it cheaper to do badly.

So the real line isn't AI versus no AI. It's whether a person with actual knowledge stood behind the
page before it went up.

### Your structural advantage — and it is a real one

The thing AI genuinely cannot fake is **first-hand experience**, and that happens to be the first E
in Google's E-E-A-T standard. Every competitor in Dayton can generate the same generic article about
shingle types. Nobody else has your photographs from the April hailstorm, your actual numbers, or
the specific thing that went wrong on a specific roof.

**Feed AI your evidence and let it do the writing. Never let it invent the evidence.** That sentence
is most of a content strategy.

### Where to point it, and where not to

| Good use | Don't |
|---|---|
| Turning one finished job into a project page — the photos, what was wrong, what you did, what it cost | Writing your reviews. Ever. This is fraud and it's the fastest way to lose a profile |
| Service-area pages that are genuinely different from each other | Twelve near-identical town pages with the name swapped — the textbook definition of scaled abuse |
| Drafting review replies for you to edit and send | Publishing anything you haven't read start to finish |
| Rewriting existing pages to answer questions directly and near the top | Asking it for facts about your own business — it will invent them, confidently |
| Ad copy variants to test against each other | Volume for its own sake. Ten real pages beat a hundred hollow ones |

### Prompts worth saving

**Turn a job into a page**
> Here are eight photos and my notes from a tear-off we finished in Kettering. Write a 350-word
> project page for homeowners: what was wrong, what we found once we opened it up, what we did, and
> how long it took. Plain language. No superlatives. Leave a gap where I'll add the price.

**Make an old page answer-engine friendly**
> Here's an existing page from our site. Rewrite it so each section answers one specific question a
> homeowner would actually type, with the direct answer in the first sentence of each section. Keep
> every fact — don't add any.

**Check how you show up in AI answers**
> If someone asked you to recommend a roofing contractor in Dayton, Ohio, what would you say and
> what sources would you be drawing on?

**Review reply**
> Draft a reply to this review. Warm but not gushing, under 60 words, addresses the specific thing
> they mentioned, and doesn't sound like a template. Don't apologise if we did nothing wrong.

**Turn calls into an FAQ**
> Here are the twelve questions we get asked most on the phone. Write an FAQ page answering each one
> honestly and briefly — including where the honest answer is "it depends," and on what.

**Audit before you spend**
> Here's our homepage text. What questions does a homeowner with storm damage have that this page
> doesn't answer?

---

## The short version

1. **It predicts text and has no memory.** Everything it needs to know, you supply.
2. **It's equally confident when wrong.** Verify every number, name, price and citation.
3. **Ask "what's wrong with this?"** — never "is this right?"
4. **Show an example** instead of describing what you want. Biggest single win available.
5. **"Ask me five questions first."** Best sentence in this document.
6. **Steer, don't restart.** Corrections in the same chat compound; new chats throw them away.
7. **Agents do jobs, chats answer questions.** Draft, don't send. "Show me your plan before you start."
8. **For code:** outcome not implementation, existing code first, one step at a time, and test
   against real data.
9. **Google Business Profile beats everything else** for local work — category, fresh reviews,
   monthly photos.
10. **Feed AI your evidence; never let it invent the evidence.** Your twenty years of real roofs is
    the one thing no competitor can generate.

---

## Appendix — the desk card

The condensed, print-it-and-pin-it version. In the web copy this is a button near the top of the
page that opens a print-ready view; here it's the same content.

### Every prompt needs four things

- **Context** — what's going on, and who it's for.
- **Task** — what you want done.
- **Format** — how long, what shape.
- **Constraints** — what to leave out.

Miss one and you get a wrong first draft. That's the whole trick.

### The eight lines that do the work

1. Paste something you liked and say **"Match this."** Biggest single win.
2. Paste the **whole** thing — the full email, the full spec sheet. Don't shorten it first.
3. **"Before you answer, ask me up to five questions."**
4. **"Give me three versions."** Picking beats rewriting.
5. Correct it in the same chat: **"Shorter. Cut paragraph two."** Don't start over.
6. **"What's wrong with this? What did you miss?"**
7. **"Which parts are you least sure about?"** Tells you what to check.
8. Say who it's for: **"Explain this to a homeowner who's never filed a claim."**

### Say this, not that

| Not this | This |
|---|---|
| "Make it better." | "Cut it in half. Drop the sales words." |
| "Don't make it too long." | "Under 150 words." |
| "Is this right?" | "What's wrong with this?" |
| "Write a blog post about roofing." | "400 words for a homeowner who just found a leak after a storm." |
| "What do shingles cost?" | Paste your price sheet first, then ask. |

### Before it does anything you can't undo

> **"Show me your plan before you start."**
>
> Then: draft, don't send. Stage, don't push. Check it before it goes out.

### What it can't do

- It doesn't remember. Every new chat starts from nothing.
- It only knows what you've given it. If it hasn't seen it, it guesses.
- It sounds the same right or wrong. There is no tell.

**So check yourself:** numbers · names · prices · dates · links · anything about our business.

### Four you can copy as-is

**Customer email**
> We're a roofing contractor in Dayton. [what happened]. Write a short email to the homeowner —
> under 120 words, plain, no apologising twice. Say what happened, give the new date, offer to work
> around them. Don't offer a discount.

**Job → website page**
> Here are photos and my notes from a job we finished. Write 350 words for homeowners: what was
> wrong, what we found, what we did, how long it took. Plain words. No superlatives.

**Review reply**
> Draft a reply to this review. Warm but not gushing, under 60 words, mentions the specific thing
> they said. Don't apologise if we did nothing wrong.

**Anything long**
> Summarise this. What's happened, where it stands, what I owe them.

### Don't bother

- **Shouting.** "CRITICAL — YOU MUST" makes it worse now, not better.
- **"Act as a world-class expert."** Does nothing. Say who it's for instead.
- **A wall of text.** Four clear sentences beat four paragraphs.
- **Manners.** "Please" changes nothing either way.

---

## Sources for the figures in Part 5

- [AirOps — AEO guide 2026 (citation freshness data)](https://www.airops.com/blog/aeo-answer-engine-optimization)
- [ALM Corp — AEO playbook for AI Overviews, ChatGPT, Perplexity and Claude](https://almcorp.com/blog/answer-engine-optimization-2026/)
- [Position Digital — AEO best practices](https://www.position.digital/blog/answer-engine-optimization-best-practices/)
- [Minyona — Google Business Profile for contractors, 2026](https://minyona.com/blog/google-business-profile-contractors)
- [Web Tonic — roofing local SEO statistics](https://www.webtonic.io/blog/roofing-local-seo-statistics)
- [LocalHero — local SEO for roofers](https://localhero.live/blog/local-seo-for-roofers)
- [Google Search — spam policies (scaled content abuse)](https://developers.google.com/search/docs/essentials/spam-policies)
- [Rankability — study on Google and AI-generated content](https://www.rankability.com/data/does-google-penalize-ai-content/)
