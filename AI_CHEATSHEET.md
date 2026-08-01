# Working with AI — a field manual

**Prompting, agents, building software, getting found, and what your own hardware can and can't
do.** Everything worth knowing on day one, in the order it becomes useful.

Nothing here needs a technical background. Part 1 is the twenty minutes of theory that makes the
rest land; skip it and the others read like a list of tricks. Every prompt is meant to be copied as
written.

Parts 1-5 are the general manual. Parts 6-9 are the ones with Cardinal's own hardware, data and
numbers in them.

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

### Letting it run: `/goal`

Normally Claude does one turn and hands control back. `/goal` sets a **finish line** and keeps it
working across turns until that line is crossed, so you stop prompting every step. Setting it starts
work immediately — no second prompt needed.

*(It's `/goal`, with a slash. In Claude Code `@` pulls a file into your message — `@index.html` —
and `/` runs a command against the session. There is no `@goal`.)*

| Type this | What happens |
|---|---|
| `/goal <condition>` | Sets the finish line and starts working. One goal per session — a new one replaces the old |
| `/goal` | Status: the condition, how long it's run, turns evaluated, tokens spent, and the checker's most recent reason |
| `/goal clear` | Cancels it. `stop`, `off`, `reset`, `none` and `cancel` all work too |

**The mechanic that decides everything.** After each turn a *separate small model reads the
conversation* and answers one question: is the condition met, yes or no? No, and Claude keeps going
using that reason as its next instruction. Yes, and the goal clears itself.

**That checker can't run commands or open files.** It only sees what Claude has already put on
screen. This is the whole ballgame — a condition it can't verify from the transcript is a loop that
never ends.

#### Eight tips for using it well

1. **Write a finish line, not a task list.** "Migrate the module until every call site compiles and
   the tests pass" — not "do A, then B, then C." You're describing *done*, not the route.
2. **Make it provable on screen.** Name the command that proves it: *"`check_build.py` exits 0 and
   the full output is pasted."* If nothing prints, the checker has nothing to read.
3. **Always add a stop clause.** *"…or stop after 20 turns."* Without one, a badly worded condition
   keeps burning turns until you happen to look.
4. **Say what must not change.** "No other file is modified." Constraints are part of the finish
   line, not a footnote.
5. **Check on it with a bare `/goal`.** The checker's last reason is the useful bit — it tells you
   exactly what it's still waiting to see.
6. **If it won't finish, the condition is wrong — not the model.** Read that last reason. Nine times
   in ten it's asking for proof that never got printed.
7. **Never use it for taste.** Colour, layout, tone, "does this look right" — none of it has a
   finish line a checker can see. Those stay turn-by-turn with your eyes on them.
8. **Pair it with auto mode only when you mean it.** `/goal` doesn't change permissions on its own.
   Auto mode plus a goal means unattended edits — fine for an audit, risky for a build.

#### What that looks like here

| Won't finish | Will |
|---|---|
| `/goal` make the retail home page look better | `/goal` check_build.py passes on index.html with --prev and my marker, the app stamp is bumped, and a CHANGELOG entry exists for the new build. Paste the full gate output every turn. Stop after 15 turns. |
| `/goal` fix the estimates bug | `/goal` Every `.single()` call site in index.html is listed in a table with its position and how it guards. Paste the table in full. Change no code. Stop after 12 turns. |

The pattern in both: the good version names a command whose output lands in the transcript, and
bounds itself. The bad version asks for a judgment nobody can check.

**What it costs.** An agent runs many steps, so it costs meaningfully more than a single chat
message — you're trading tokens for your own time. Worth it when the job really is twenty minutes of
clicking. Not worth it for a question you could have just asked. A `/goal` multiplies this by
however many turns it takes, which is the real reason to write the stop clause.

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

## Part 6 — Local AI vs. the cloud

You own a DGX Spark, so this isn't theory. One piece of arithmetic decides what any machine can and
can't run — and it explains why the marketing numbers contradict each other.

### The only formula you need

> **Tokens per second ≈ memory bandwidth ÷ bytes read per token.**

Generating one token means reading the model's weights out of memory. So two numbers describe any
local box, and they answer different questions: **how much** memory decides what will fit; **how
fast** that memory is decides how fast it runs. People shop on the first and get bitten by the
second.

### What the four types actually do

Realistic tokens per second, dense model at 4-bit, one conversation at a time. A dash means it won't
fit. Reading speed is about 5 t/s; comfortable is 15; instant is 40.

| Machine | 8B | 20B | 30B | 70B | 120B | 200B |
|---|---:|---:|---:|---:|---:|---:|
| **DGX Spark** · 128 GB @ 273 GB/s | 40 | 16 | 11 | 5 | 3 | — |
| **Mac M4 Max** · 128 GB @ 546 GB/s | 80 | 32 | 21 | 9 | 5 | — |
| **Mac M3 Ultra** · 512 GB @ 819 GB/s | 119 | 48 | 32 | 14 | 8 | 5 |
| **AMD Ryzen AI Max+ 395** · 128 GB @ 256 GB/s | 37 | 15 | 10 | 4 | 2 | — |
| **RTX 5090** · 32 GB @ 1792 GB/s | 261 | 105 | 70 | — | — | — |

The 5090 is six times faster than everything else and holds a fraction as much. That's the real
trade in local AI, and it's a hard one — you're choosing between big-and-slow and small-and-fast,
not buying your way out.

**These figures are computed, not quoted** — bandwidth divided by model size at 4-bit, taken to 70%
for real-world overhead. Published benchmarks disagree with each other because they rarely say which
model they measured.

### Why the numbers you'll read contradict each other

One review says the Spark does 35–80 tokens a second. Another says 2.7 on a 70B model. Both are true
and neither says *of what*. The first is a small model, the second a large one — and a
mixture-of-experts model breaks the table entirely, because it only reads the *active* experts per
token rather than all the weights.

### Mixture-of-experts, on your Spark

| Model shape | Memory used | Speed |
|---|---:|---:|
| 35B total / 3B active | 21 GB | 106 t/s |
| 120B total / 5B active | 72 GB | 64 t/s |
| 235B total / 22B active | 141 GB | won't fit |
| 70B dense | 40 GB | 5 t/s |

Same box, twenty times the difference, entirely down to model architecture. **On a
bandwidth-limited machine like the Spark, pick mixture-of-experts models.** That single choice
matters more than anything else you can tune.

### What local does well

- **Image generation.** Your strongest case, and you're already on it — the Spark makes the Resource
  Library illustrations. Quality is genuinely competitive with paid APIs, iteration is free, and a
  LoRA gives you one house style no API will sell you at any price.
- **Transcription.** Whisper runs fast and local. Voice notes from a roof, straight to text.
- **Embeddings and search over your own documents.** Cheap, fast, and nothing leaves the building.
- **OCR and extraction** — pulling numbers off an insurance scope, in a batch, overnight.
- **Photo tagging and classification** at volume.

The pattern: high volume, latency doesn't matter, and the bar is "good enough and consistent."

### What local can't do

- **Frontier coding.** The big one, and it isn't close. The gap between the best local model and a
  top-tier cloud model on real code is the difference between a working feature and an afternoon of
  debugging. Cardinal is a 3 MB single file — nothing you can run at home will work on it
  competently.
- **Serve the live app.** The librarian, captions and analysis have to answer from anyone's phone at
  any hour. A box at your house is one power cut, one ISP outage, one driver update away from every
  user seeing an error. The cloud isn't buying intelligence there — it's buying uptime.
- **Long documents at speed.** Large context is exactly where the bandwidth ceiling bites hardest.
- **Anything needing current facts.** No web index, no search, and a training cutoff you can't move.

### So: what the Spark is for

It's a **generation and batch machine**, not a chat machine. Keep it making illustrations, add
transcription and bulk photo or document work. Don't move the app's live AI onto it — that trades a
working feature for a house that has to stay online.

And if you ever want a local chat model that doesn't feel slow, the answer isn't a bigger machine.
It's a mixture-of-experts model: 64 tokens a second instead of 5, on hardware you already own.

---

## Part 7 — What's worth building

Software is cheap to make now and just as expensive to own as it ever was. The question is no longer
"can we build it" — it's "should this exist at all."

### The deciding question

**Does it turn something you already have into something you can act on?** That's the whole test.
You already have 60,000 photographs, eighteen years of jobs and a supplier's price list. Software
that makes those usable is worth building. Software that re-creates what a vendor already sells for
thirty dollars a month is a hobby with a maintenance bill.

### Build, buy, or leave alone

| Build it when | Buy it when |
|---|---|
| The data is already yours and nobody sells the shape you need | It's a solved commodity — accounting, payroll, email, storage, phones |
| It's a small hinge in a big process: the handoff, the approval, the reminder | Being wrong is expensive and regulated — tax, payroll, anything the IRS reads |
| The current answer is a spreadsheet three people edit differently | The vendor's entire company exists to keep it working and yours doesn't |
| It has to match how *you* work, not how the industry averages out | You'd be rebuilding it every time a bank or a carrier changes a format |
| One screen would replace a group text nobody scrolls back through | It needs to keep running at 2am whether or not you're awake |

**There's a third answer people forget: leave it alone.** Plenty of small annoyances are cheaper to
live with than to automate. If the whole problem is fifteen minutes a month, it is not a software
problem.

### The business itself — the work moving through

These pay off because they compress a handoff. Every one of them replaces a moment where information
sits still, waiting for somebody to notice it.

- **The one-screen day.** What's happening today, who's on it, what's stuck. Not a dashboard of
  charts — a list you can act on before you finish your coffee.
- **The handoff from sold to scheduled.** The single most common place work falls on the floor in a
  contracting business. A signed job that nobody staged is invisible until the homeowner calls.
- **Anything currently living in a group text.** Group texts have no state. Nothing is open or
  closed, assigned or done — it just scrolls away.
- **Checklists that leave a record.** The value isn't the checklist, it's that finishing it produces
  something you can show a carrier six months later.
- **The nudge.** "This job hasn't moved in 21 days." One query, one message, and it recovers work
  you'd otherwise lose quietly.

### Organization — finding what you already own

This is the family people most consistently underrate, because nothing is *broken*. The photos
exist. The documents exist. You simply cannot get to them at the moment you need them, which in
practice is the same as not having them.

- **Search across things you already keep.** One box that looks in jobs, photos, documents and
  estimates at once. Unglamorous and used forty times a day.
- **Automatic naming.** The reason nothing is labelled is that labelling is nobody's job. A model
  that writes a plain-English line for every photo turns a pile into an index — and this is the
  cheapest AI in the whole document.
- **One place per concept.** Not "photos in three apps." The failure isn't storage, it's that nobody
  remembers which of the three.
- **The record that survives the person.** When a rep leaves, what did they know that nobody wrote
  down?

Part 8 is this family, worked all the way through on the biggest example you have.

### Money — and the one rule that matters

> **Never build the ledger.** Accounting, payroll and tax are bought, always. They are regulated,
> they change without asking you, and the cost of a subtle bug is not a bad afternoon — it's an
> amended return. Nothing below touches the books. It all sits *beside* them, answering questions
> the books are too slow to answer.

The gap worth building into is the one between what your accountant sees in April and what you need
to decide on Thursday.

| Money question | Verdict | Why |
|---|---|---|
| **What did this job actually cost?** | Build | Sold price minus materials, crew and disposal, per job. Your accounting package knows the totals and not the jobs |
| **Which trades and which reps make money?** | Build | Same data, sliced the way you actually make decisions. Nobody sells this shape |
| **Who owes us, and since when?** | Build | Deposits, draws and final payments against your own stages. Ageing that matches your process, not a generic 30/60/90 |
| **What's the pipeline worth?** | Build | Only you know which stages are real. Weighting is a judgment call and it belongs in your code |
| **Invoices, ledger, payroll, tax** | Buy | Solved, regulated, and a bad edge case costs more than the subscription ever will |
| **Taking a card payment** | Buy | Card data is a liability. Let a processor hold it and stay out of the compliance business entirely |
| **Material pricing** | Borrow | The supplier's sheet is the truth. Import it; never retype it, and never let anyone hand-edit the copy |

### One chokepoint per number

Every figure that matters should be computed in exactly one place. Cardinal has this already — every
money figure in the app goes through a single function, so a change to how a job is valued lands
everywhere at once instead of in eleven places minus the one you forgot. **When you find the same
calculation written twice, you have already found tomorrow's discrepancy.**

---

## Part 8 — A worked example: the photo binder

One thing built twice over — an organizer for you, and a sales binder for the kitchen table. It's
the same photographs either way. What changes is who's looking.

### The problem, in your own numbers

Cardinal's photo table holds **60,485 photographs** across **775 jobs** and 755 addresses, shot by
nine people between 2007 and July of this year. The median job has **49 photos**; the biggest has
738.

**107 of them have a caption.** That is under two in every thousand. You do not have a photo problem
— you have the best photographic record of roofing in Montgomery County and no way to find anything
in it.

### Why this one is worth building

It passes the deciding question twice. The photographs are already yours, nobody sells "your roofs,
arranged your way," and the same work produces two different things: a filing cabinet you'll use on
Tuesday and a sales tool you'll use on Saturday. The second one is what makes the first one get done
— organizing is a chore nobody finishes, but a rep who closes with it will keep it tidy.

### The pages

*(The web version draws these to scale. Here they're described.)*

| Page | Who it's for | What's on it |
|---|---|---|
| **1 · The shelf** | You | **Jobs, not photographs.** 775 rows, newest first, each with the one picture that says what it was. A search box across address, trade, colour and year, and filter chips for Roof / Siding / Gutters / Storm. Each row: address, what it was and when, and a photo count |
| **2 · One roof** | You | The 49 photos of a job **grouped by the stage they were shot at** — Before 9, Tear-off 22, Decking 7, After 23 — each with a one-line caption. **This grouping is the whole product** |
| **3 · Build the binder** | The rep | Pick six or eight, put them in order, write one line each. Name it for the situation, not the customer. Two minutes, and it's reusable forever. Options: which jobs it pulled from, price shown (no), address shown (street only) |
| **4 · At the kitchen table** | The homeowner, with a rep | One photograph at a time, full bleed, one sentence. Before / After pairs. A single fact line underneath — *"Kettering · 2,400 sq ft · finished in four days"* — and **no price on this page**. Nothing to tap by accident |
| **5 · The leave-behind** | The homeowner, alone | One sheet. Same binder, printed or sent as a link, with the rep's name and number on it and still no price. It survives the three weeks they spend deciding, and it beats a business card by a distance |

### What actually makes it work

- **Captioning is the product.** Every other feature is arranging things. Without a line of text per
  photograph there is nothing to search, nothing to group and nothing to pick from — you are back to
  scrolling 60,000 files.
- **Caption in a batch, overnight, on hardware you own.** This is exactly the job Part 6 says local
  AI is for: high volume, latency irrelevant, and a wrong answer is obvious at a glance. Sixty
  thousand captions through a paid API is a real bill; on the Spark it's electricity.
- **Let a person correct, never require it.** An AI caption that's 85% right is infinitely better
  than the blank you have now. Make the good ones easy to fix and leave the rest alone.
- **Group by stage, not by date.** The camera gives you time order. What sells is before,
  underneath, after — and that's a judgment the model can make from the picture.
- **Keep price out of the binder.** The binder builds belief. The estimate handles money. Putting a
  number under a photograph invites the comparison you least want.
- **Street, never the full address.** It's someone's house. "Kettering" and "2,400 sq ft" carry the
  whole argument; the house number carries only risk.

### What to skip

| Don't | Because |
|---|---|
| Rebuild the camera | You already have one that works and the crews already use it. Read from it; don't replace it |
| Editing, filters, retouching | A retouched roof is a lie in a sales meeting, and the photo editor you already have covers arrows and circles |
| Automatic before/after pairing | Sounds clever, fails on the ones that matter, and picking two photographs takes four seconds |
| Letting it caption the money | Square footage, age and cost come from the record, not from looking at a picture. Model reads pixels; database holds facts |
| A binder per customer | Five or six good binders by situation beat 775 bespoke ones nobody maintains |

### The honest order to build it in

**Captions first, alone, and stop there for a week.** If the captions are good, the shelf and the
search are a weekend. If they're not, nothing downstream can save it — and you'll have found that
out for the cost of one batch job instead of a month. That's Part 4's "one feature at a time,
verified," applied to the biggest thing you own.

---

## Part 9 — Which model, and when

**Checked 1 August 2026 · Anthropic figures cached 24 June 2026 · half-life ≈ six months.**

Four companies sell the cloud ones; a dozen more give theirs away. The names below will go stale.
The shape of the choice underneath them won't, and that's the part worth learning.

> **Read the date before the page.** This is the fastest-rotting section here. Every price and every
> name was true on the date above and some of them will be wrong within the year — one of these
> companies cut two of its prices the week this was written. **Nothing here is a reason to change
> what you're already doing.** Read it once for the shape, then use the last section, which doesn't
> expire.

### These change faster than anything else in this document

Here is what actually happened in the weeks around this being written:

- **8 July 2026** — xAI released Grok 4.5, a new flagship.
- **9 July 2026** — OpenAI released an entire new generation, GPT-5.6, in three sizes at once.
- **21 July 2026** — Google released Gemini 3.6 Flash.
- **30 July 2026** — OpenAI cut two of its prices, one of them by roughly 80%.
- **16 October 2026** — Gemini 2.5 Flash gets switched off. Anything still pointed at it simply
  stops working.

Three launches, a price cut and a shutdown, all inside one quarter — and that is a normal quarter.
Nobody tells you when it happens; you find out because something you built quietly changed behaviour
or stopped. **So treat every name and number here as true on one day and unverified after it.**

### Every family is the same three sizes

This is the part nobody explains, and it's most of what you need. Each company trains one model and
ships it in three sizes. Same knowledge, same manners, different amount of machine behind it —
bigger is slower, dearer and better at the hard parts.

| Size | What it's for | Anthropic | OpenAI | Google | xAI |
|---|---|---|---|---|---|
| **Big** | The hard one — right the first time | Claude Opus 5 | GPT-5.6 Sol | Gemini 3.1 Pro | Grok 4.5 |
| **Middle** | Everything you do all day. Leave this one open | Claude Sonnet 5 | GPT-5.6 Terra | Gemini 3.6 Flash | Grok 4.3 |
| **Small** | Volume. Ten thousand copies of one small job | Claude Haiku 4.5 | GPT-5.6 Luna | Gemini Flash-Lite | Grok 4.1 Fast |

**The common mistake is running the big one for everything.** It feels safe and it is quietly
expensive — and on a simple job it isn't even better, just slower. The other mistake is the mirror
of it: running the small one on something that needed thinking, then concluding AI is useless.

### How to read a price

Everything is priced per **million tokens**. A token is about three-quarters of a word, so a million
tokens is roughly 750,000 words — nine long novels. Two numbers are always quoted: **input**, what
you send it, and **output**, what it writes back. Output costs about five times input at every
vendor.

Which means a long question with a short answer is cheap, and "summarise these forty pages in a
paragraph" is one of the best-value things you can ask a computer to do.

### Six in the cloud

One of each *job* rather than one of each brand. Prices per million tokens, input / output.

**Claude Opus 5** · Anthropic · $5 / $25 · 1M context
*The one to reach for when being wrong is expensive.*
- **Strong** — changing code inside a large existing file without breaking the parts you didn't
  mention, which is the exact thing that goes wrong when an app is one big file. Follows a
  specification literally. Says "I don't know" more readily than the others.
- **Weak** — dearest of the six per token, and complete overkill for a two-line email. Slower,
  because it thinks longer.

**Claude Sonnet 5** · Anthropic · $3 / $15 · 1M context
*The daily driver. Most people's default, and it should be yours.*
- **Strong** — close to the top on writing and everyday code at a fraction of the cost. Fast enough
  that you stop noticing it. Discounted to $2 / $10 through 31 August 2026.
- **Weak** — on genuinely hard debugging it may take three passes where the big one takes one, which
  can cost more than the difference you saved.

**GPT-5.6 Terra** · OpenAI · ≈ $2 / $12 · 1.05M context
*The one everything else plugs into.*
- **Strong** — the widest ecosystem by a distance; nearly every third-party tool speaks to it first.
  Strong general writing. *Sol* sits above it for the hardest work; *Luna* below it, cut roughly 80%
  on 30 July 2026, which makes it very cheap for volume.
- **Weak** — the names change fast, and a tool you bought last year may quietly still be pinned to
  an old one. If a vendor says "powered by GPT", ask which.

**Gemini 3.1 Pro** · Google · $2 / $12 up to 200k · 1M context
*For piles of paper.*
- **Strong** — hand it a carrier policy, the whole contract set and last year's correspondence in
  one go and ask a question across all of it. Cheapest serious model per page of long input; the
  rate steps up to $4 / $18 past 200,000 tokens, still a bargain at that length.
- **Weak** — more variable at following a fussy instruction exactly. Check the details it produced,
  not the confidence it produced them with.

**Grok 4.5** · xAI · $2 / $6 · 500k context
*The newest of the four, and the odd one out: built into X (formerly Twitter), and it reads the live
internet by default rather than answering from what it was taught months ago. Launched 8 July 2026.*
- **Strong** — the best scores on the board for *using tools* (searching, calling things, chaining
  steps) at its price. Within a point of Gemini 3.1 Pro on hard science questions at half the output
  cost. Its answer to "what is being said about this right now" is genuinely better than the others,
  because the others are not looking. *Grok 4.3* sits under it as the everyday one (1M window, $1.25
  / $2.50); *Grok 4.1 Fast* below that at $0.20 / $0.50.
- **Weak** — reading the live internet cuts both ways: on a narrow question it will repeat something
  unverified it found five minutes ago, in the same confident voice as everything else. **Every rate
  doubles past 200,000 tokens**, so it is the wrong choice for long documents. Loses to Claude on
  the hardest real-repository code, and it's the least battle-tested of the four for business
  paperwork.

**Gemini Flash-Lite** · Google · $0.25 / $1.50
*The volume tier — and the one already running in your app.*
- **Strong** — anything you need to do to *every* record you own lives here: ten thousand copies of
  one small job for the price of dinner. Cardinal's librarian already runs on this family.
- **Weak** — it is a small model and it knows it. Ask it to describe, classify or extract, not to
  reason. Give it a job with three steps and it will do two.

> **One worked example — what the tier is actually worth.** Captioning all **60,485** CompanyCam
> photographs is about 78 million tokens in and 2.4 million out. On **Flash-Lite that's roughly $24,
> once.** The identical job on **Opus 5 is about $450** — eighteen times the money to describe a
> photograph, which is not a task that rewards a bigger brain. *Computed from the posted rates, not
> quoted from a benchmark; the arithmetic is yours to redo when the prices move.*

### Five you can run yourself

Free to download and yours to keep. Part 6 has the hardware arithmetic — speed is memory bandwidth
divided by model size, and mixture-of-experts models cheat that division in your favour.

| Model | Strong | Weak |
|---|---|---|
| **Llama 4** · Meta<br>*mixture-of-experts* | The most-supported open name on earth — every tool, tutorial and compressed build targets it first. Runs far quicker on a Spark than its size suggests | The licence is Meta's own, not a real open one: it restricts use in the EU and by companies above a size threshold. Read it before it goes near something you sell |
| **Qwen 3** · Alibaba<br>*Apache 2.0, tiny → 235B* | No strings at all. The coding variant fixes real bugs in real repositories at around 70% on the standard test — best open score outside GLM. Sizes from laptop to Spark | Chinese-origin weights are a procurement question for some customers even when the model never leaves your building. Know your answer before somebody asks |
| **DeepSeek V3.2 / R1**<br>*mixture-of-experts* | Very strong at maths and step-by-step work for what it costs to run. Punches well above the memory bandwidth it needs | Reasoning models think out loud at length before answering — you pay for that in seconds. Same procurement question as Qwen |
| **GLM-5** · Zhipu | The highest open score on real repository bug-fixing, around 78% — within sight of the cloud models rather than a curiosity. If the local box is going to write code, start here | Thinner tooling and fewer prepared builds than Llama or Qwen. Expect an evening of setup rather than an hour |
| **Gemma 3 27B** · Google | The one that actually fits: runs comfortably on a single graphics card. Reads images as well as text, which most models this small can't do at all — the usual reason to want one locally | Small, and it shows the moment a job needs several steps held in mind at once. Excellent describer, mediocre thinker |

**Also worth knowing by name:** *Mistral* (French, permissive, the usual answer when European data
rules are the problem) and *Kimi K2* (built for agent work — tools and multi-step jobs). Both are
real contenders; neither was measured on the date at the top of this part, so no numbers are quoted.

### Which one for which job

| The job | In the cloud | Run it yourself? |
|---|---|---|
| **One small job, run across every record you own** | Flash-Lite, Luna or Haiku. Cheapest tier, no exceptions | **Yes** — Gemma 3. Free to repeat, and repeating is the entire point |
| **Write or change code in the app** | Opus 5 for anything structural; Sonnet 5 for the routine | Practice only — GLM-5 or Qwen coder. The gap is still real here |
| **Customer email, review reply, a page for the site** | Sonnet 5 or Terra. Any middle tier does this well | Yes, then read it. Local prose is fine, not good |
| **Read a 90-page carrier policy** | Gemini 3.1 Pro — cheapest per page at that length | No. Long documents are where local hardware runs out first |
| **Transcribe and summarise a call** | Any middle tier, if you don't mind it leaving | **Yes** — and this is the row where "local" earns its keep. Nothing leaves the building |
| **Search across your own documents** | Any tier for the answer | Yes for the indexing half — cheap, constant, and it touches everything you own |
| **Something that turns on what happened this week** | Grok 4.5 — the only one of the six reading the live web by default | No. A model on your own machine knows nothing after the day it was built |
| **Anything with a dollar figure a customer will see** | The big tier, then you check every number yourself | No |
| **Anything a homeowner reads unedited** | *There is no model for this row. Somebody at Cardinal reads it first, every time* | |

### The part that doesn't expire

If the rest of this is out of date by the time you read it, these six still hold.

1. **There are always three sizes.** Work out which of your jobs is big, middle and small once; the
   names underneath will keep changing and it won't matter.
2. **Output costs about five times input.** Everywhere, every vendor. Long question, short answer is
   the cheap shape.
3. **The middle tier does ninety per cent of the work.** Reach up only after you've watched the
   middle one actually fail at the thing.
4. **Local wins on volume, privacy and repetition. Cloud wins on hard reasoning, long documents, and
   anything that must be right the first time.** That line has not moved in two years.
5. **A new model is not automatically better for you.** Test it on one job where you already know
   the right answer. That takes ten minutes and settles it.
6. **Never let a price table decide a customer-facing answer.** Save money on the ten thousand small
   jobs, not on the one that goes to a homeowner.

> **Re-checking this takes five minutes.** Each of the four companies publishes a pricing page and a
> models page, and they're the only sources that are ever current — open the vendor links at the
> bottom and you're done. **Do not ask a model what the current models are.** Its knowledge stops at
> its training date and it will name versions that don't exist, in the same confident voice it uses
> for everything else. That's Part 1, arriving exactly where you'd expect it to.

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

### Letting it run — /goal

`/goal <finish line>` keeps it working turn after turn until a checker agrees it's done. `/goal` on
its own shows status. `/goal clear` stops it. (Slash, not `@`.)

- Describe **done**, not the steps to get there.
- The checker only reads the chat — name the command that proves it.
- Always end with "or stop after 20 turns."
- Never for looks, colour or tone. Nothing there to check.

### Local vs. cloud, in four lines

- **Local** — images, transcription, search, batch jobs. Free to repeat, nothing leaves the
  building.
- **Cloud** — code, anything live, anything that must be right the first time.
- Speed = memory bandwidth ÷ model size. Big model on a slow bus is **slow**.
- On the Spark, pick mixture-of-experts models. 64 t/s instead of 5.

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

## Sources

Parts 1-4 and 7-8 are practice rather than claims. Everything below backs a number in Part 5, 6 or 9.

### Part 5 — marketing and SEO

- [AirOps — AEO guide 2026 (citation freshness data)](https://www.airops.com/blog/aeo-answer-engine-optimization)
- [ALM Corp — AEO playbook for AI Overviews, ChatGPT, Perplexity and Claude](https://almcorp.com/blog/answer-engine-optimization-2026/)
- [Position Digital — AEO best practices](https://www.position.digital/blog/answer-engine-optimization-best-practices/)
- [Minyona — Google Business Profile for contractors, 2026](https://minyona.com/blog/google-business-profile-contractors)
- [Web Tonic — roofing local SEO statistics](https://www.webtonic.io/blog/roofing-local-seo-statistics)
- [LocalHero — local SEO for roofers](https://localhero.live/blog/local-seo-for-roofers)
- [Google Search — spam policies (scaled content abuse)](https://developers.google.com/search/docs/essentials/spam-policies)
- [Rankability — study on Google and AI-generated content](https://www.rankability.com/data/does-google-penalize-ai-content/)

### Part 6 — hardware

- [NVIDIA — DGX Spark product page](https://www.nvidia.com/en-us/products/workstations/dgx-spark/)
- [Tom's Hardware — M4 Max vs GB10 vs Strix Halo decode throughput](https://www.tomshardware.com/desktops/exploring-apple-silicons-local-ai-performance-with-the-mac-studio-and-m4-max-m4-max-beats-gb10-and-strix-halo-in-decode-throughput-but-memory-bandwidth-isnt-everything)
- [Tech Insider — DGX Spark vs Mac Studio, memory and bandwidth](https://tech-insider.org/dgx-spark-vs-mac-studio-2026/)
- [Strix Halo — production ROCm llama.cpp build recipe](https://github.com/LucRoot/Strix-Halo-Linux-Llama_cpp-ROCm)
- [ModelFit — RTX 5090 local LLM benchmarks](https://modelfit.io/gpu/rtx-5090/)

### Part 9 — the model line-up

Six of these are vendor pages and will always be current. Check those, not this document.

- [Anthropic — model pricing](https://docs.claude.com/en/docs/about-claude/pricing) *(Claude figures here are cached at 24 June 2026)*
- [Anthropic — models overview and context windows](https://docs.claude.com/en/docs/about-claude/models/overview)
- [OpenAI — API pricing, current tiers](https://developers.openai.com/api/docs/pricing)
- [Google — Gemini API pricing, including the 200k context step](https://ai.google.dev/gemini-api/docs/pricing)
- [Google — Gemini model list and deprecation dates](https://ai.google.dev/gemini-api/docs/models)
- [xAI — Grok model list and rates](https://docs.x.ai/docs/models) *(rates double past 200k tokens)*
- [CloudZero — OpenAI pricing tracked over time, including the 30 July 2026 cuts](https://www.cloudzero.com/blog/openai-pricing/)
- [Morph — Grok API pricing across every model, 2026](https://www.morphllm.com/grok-api-pricing)
- [Snorkel — Grok 4.5 tested against Opus 4.8 and GPT-5.5 on professional work](https://snorkel.ai/blog/grok-4-5-testing-results-how-spacexais-new-model-performs-on-real-professional-work/)
- [LM Council — July 2026 benchmark board, all four families](https://lmcouncil.ai/benchmarks)
- [LLM-Stats — open-weight leaderboard](https://llm-stats.com/leaderboards/open-llm-leaderboard)
- [MindStudio — open models for agentic coding, 2026](https://www.mindstudio.ai/blog/best-open-source-llms-agentic-coding-2026)
- [Wavect — open-weight comparison and licence terms](https://wavect.io/blog/open-weight-llm-comparison-2026)

### On the computed figures

The Part 6 tokens-per-second numbers and the two Part 9 cost examples are **computed, not quoted** —
bandwidth divided by model size, and posted rates times token counts. The arithmetic is shown so you
can redo it when the hardware or the prices move.
