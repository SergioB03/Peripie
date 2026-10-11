# Peripie: execution plan

Product name: Peripie (say "PAIR-ih-pie"), from the Greek emperipateo, "to walk about among." HackLanta '26, solo entry.
**Submission deadline: Sunday Oct 11, 9:00 am ET. Feature freeze: 7:00 am.**

This file is the single source of truth for everyone working on the repo: Claude Code, its subagents, Ollama, and Sergio. If something here conflicts with a chat message from Sergio, Sergio wins, and this file gets updated in the same commit.

## 1. What we are building

A small shop's website that you walk into. The visitor sees the storefront from the street, the camera moves through the door, and a clerk at the counter greets them out loud. The visitor asks for a product, the clerk checks with a stock agent, and answers by voice: in stock, or out of stock and back on a given date.

The audience is small local shops, which the existing virtual-store platforms (Obsess, Emperia) do not serve; they sell to large brands. Sergio runs a small business himself, and the pitch opens with that.

The second audience is the customer who would rather not walk in and ask. Sergio is one of them some days: he will take a drive-through or an online order over asking at a counter. A website cannot answer the question, and the phone call is the thing being avoided. Peripie is a counter you can walk up to from wherever you are, and because the clerk visibly turns to the stock room before answering, the visitor sees the work being done and can trust the answer.

Design rule that follows: **the hand-off stays visible and legible on every screen size.** The "Checking with the stock room" state and the stock-room figure are a trust signal, not decoration; no visual change may hide or shorten them.

Where we compete:

| Entry | What earns it |
|---|---|
| AI/ML track | Two agents with a visible hand-off that take a real task off a shop owner's plate |
| Replit "Small Business" challenge | A working, creative small business app hosted on Replit |
| Best Use of ElevenLabs | The clerk's voice is the product |
| Best Use of Gemini API | Gemini runs the clerk and decides when to call the stock tool |
| Best Use of Tiger Data | Restock history as time-series data, used in the clerk's answers |
| Zero Data challenge | No accounts, tracking, profiles, or stored personal info |
| GoDaddy Registry | A good domain name |

Not used, on purpose: Auth0 (logins contradict Zero Data), Vultr (Replit hosts it), Solana (no checkout in scope).

## 2. Definition of done

The demo succeeds if a judge can do this on the deployed link, from their own phone:

1. Open the site, pick the bakery, tap "Enter shop."
2. Hear the clerk's greeting in an ElevenLabs voice.
3. Ask for an in-stock item and an out-of-stock item, by typing or speaking.
4. Hear correct answers that come from the database, including a restock date.

Everything else is secondary to those four steps working every time.

## 3. Architecture

```
Browser (public/index.html, Three.js)
   |  POST /api/clerk  { shop, text }
   v
Node + Express server (server/index.js)  -- hosted on Replit
   |-- Gemini API: clerk persona + check_stock tool
   |       `-- check_stock(shop, product) -> SQL query
   |               `-- Tiger Data (Postgres): inventory, stock_events
   `-- ElevenLabs API: reply text -> mp3
   ^
   |  { reply, audioUrl, stock }
Browser plays audio, animates clerk
```

### The contract (v2, approved at checkpoint 1; do not change without the staff engineer's sign-off)

One endpoint, two request shapes. `shop` must be one of `bakery | paint | plants`.

Question: `POST /api/clerk`, JSON body
```json
{ "shop": "bakery", "text": "do you have croissants?" }
```
`text` is 1 to 300 characters. The server uses `express.json({ limit: "4kb" })`.

Greeting: `POST /api/clerk`, JSON body
```json
{ "shop": "bakery", "greet": true }
```
Gemini is not called for a greeting. The server uses fixed text per shop and caches the mp3 per shop in memory (the shop id is not visitor data; this also protects the ElevenLabs credit budget). The page sends this request on the Enter tap, in parallel with the camera move, so the audio is ready at the counter.

Response: 200, JSON
```json
{
  "reply": "We're out of croissants right now. They'll be back Tuesday, October 13.",
  "audioUrl": "data:audio/mpeg;base64,...",
  "stock": { "product": "croissant", "inStock": false, "onHand": 0, "nextRestock": "2026-10-13",
             "nextRestockText": "Tuesday, October 13", "typicalRestockDays": 3 }
}
```

Errors, JSON:
- 400 `{ "error": "bad_shop" }` or `{ "error": "bad_text" }`
- 502 `{ "error": "clerk_unavailable" }` only when Gemini fails or times out **and no stock lookup found a product**; the page then falls back to its canned answers. When a lookup did find the product (a tool round, or the direct lookup of the visitor's words that runs alongside the first model call), the server answers 200 with a reply composed from that record (`server/template.js`: "We're out of croissant right now. It's back Tuesday, October 13, and it usually takes about 3 days."), with `stock` set and audio as usual, and logs `clerk: templated reply, model unavailable`. Added Oct 10, 9:00 pm at Sergio's direction after live runs showed model outages and rate limits; the page needs no change for it.
- A body the server cannot read is also 400: not JSON, not an object, or missing `Content-Type: application/json` is `bad_shop`; over 4 kb is `bad_text` (never 413). The page treats every non-2xx alike, so these matter only for curl.
- Timing (checkpoint 2): the page waits 15 s for a question (`CLERK_TIMEOUT_MS = 15000`) and 2 s past the walk-in for the greeting. The server gives the whole Gemini tool loop 10 s (`server/clerk.js` `TIMEOUT_MS`), then ElevenLabs only the time left before 12.5 s after the request arrived (`server/index.js` `RESPONSE_BUDGET_MS`), at least 1.5 s and at most 6 s, otherwise `audioUrl` is null. A 200 leaves the server by about 12.5 s and a 502 by about 10 s, both at least 2.5 s inside the page's limit.
- The first Gemini round forces a `check_stock` call (`toolConfig.functionCallingConfig.mode = ANY`, `allowedFunctionNames: ['check_stock']`), so the model cannot answer a product question from memory. A greeting-like question costs one `found: false` lookup, which the prompt already handles.

- `reply` is always present. `audioUrl` and `stock` may be null.
- `stock` is the found shape, minus `found`, of the last `check_stock` call in the turn that found a product (calls count in the model's order; a parallel batch in the order the model listed them). It is null when no call found a product, when none was called, or for a greeting. When a question names several products, `reply` covers all of them and `stock` describes the last one found; the page speaks `reply` and may use `stock` for display only.
- `audioUrl` is a base64 data URL, so no audio file is ever written to disk.
- If ElevenLabs fails, return the reply with `audioUrl: null`; the page falls back to the browser's voice.
- Keep replies to one or two short sentences. They are spoken aloud.

`check_stock(shopId, query)` returns one of:
```json
{ "found": true, "product": "croissant", "inStock": false, "onHand": 0, "nextRestock": "2026-10-13",
  "nextRestockText": "Tuesday, October 13", "typicalRestockDays": 3 }
```
```json
{ "found": false, "inStockProducts": ["sourdough", "concha"] }
```
`nextRestockText` is computed in Node in America/New_York so the model never does weekday math; that is what makes step 4 of section 2 "correct". `typicalRestockDays` is null when the item has never hit zero, and the clerk prompt must tolerate that.

### Data model (Tiger Data)

```
inventory(shop_id text, product text, on_hand int, next_restock date,
          primary key (shop_id, product))
stock_events(ts timestamptz, shop_id text, product text, on_hand int)   -- hypertable on ts
```

`check_stock` returns the shape in the contract above. `typicalRestockDays` is computed from `stock_events` with `LAG(on_hand) OVER (PARTITION BY shop_id, product ORDER BY ts)`: each 0 to positive transition is a restock, the gap in days from the first zero is averaged, and the result is null when the item never hit zero. That number is what makes this a real use of a time-series database, so the clerk should use it: "that usually comes back within three days."

Hypertable rules: `SELECT create_hypertable('stock_events', by_range('ts'))`; no `serial primary key` on it (any unique index must include `ts`). Match products loosely ("croissants" finds "croissant") and with parameterized queries only.

Seed three shops to match the `SHOPS` list in `public/index.html`: `bakery`, `paint`, `plants`, with the same four products each and the same in/out status. Seed `next_restock` relative to `current_date` so it is still in the future on Sunday (the page's wording: croissant back Tuesday, baguette tomorrow at 7 am, roller Friday, monstera next Saturday). If `DATABASE_URL` is unset, `server/stock.js` serves an in-memory copy of the seed and logs one warning, so M4 stays testable before the database is ready.

### Repo layout

```
PLAN.md            this file
TASKS.md           live task board (section 7)
public/index.html  the 3D page (starts as the existing shop.html)
server/index.js    Express app, /api/clerk
server/clerk.js    Gemini call and tool loop
server/stock.js    check_stock and SQL
server/voice.js    ElevenLabs call
db/schema.sql      tables
db/seed.sql        seed data
.env.example       variable names only, never real keys
.claude/agents/    subagent definitions (section 6)
README.md          project page for judges (section 10)
docs/              diagrams, decision log, screenshots (section 10)
```

Environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL` (optional), `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (optional), `TIGER_DATABASE_URL` (preferred; `DATABASE_URL` is read as a fallback, but Replit assigns that name to its own Postgres, so on Replit always use `TIGER_DATABASE_URL`), `PORT` (set by Replit). On Replit these go in Secrets. `.env` is in `.gitignore` from the first commit.

### SDK and runtime pins (checked against current docs by the staff engineer, Oct 10 1:40 pm ET; builders re-check per rule 1)

- **Gemini** (`@google/genai`): `ai.models.generateContent` with `tools: [{ functionDeclarations }]`, read `response.functionCalls`, answer with `functionResponse` parts; a manual loop of at most two tool rounds. Do not use the Interactions API. Model from `GEMINI_MODEL`, with `thinkingConfig: { thinkingLevel: 'low' }` (the default level adds seconds). **Measured Oct 10, 3:40 pm, on Sergio's key: `gemini-3.8-flash` answered 503 to every call and then 429; `gemini-3.5-flash-lite` answered every question in 0.9 to 1.4 s with correct facts.** So the primary is `gemini-3.5-flash-lite` (set `GEMINI_MODEL=gemini-3.5-flash-lite` in `.env` and in Replit Secrets; the code default is the same) and `gemini-3.8-flash` is the fallback. A single model attempt is capped at 5 s so a hanging model cannot eat the fallback's time; the loop total stays 10 s. `gemini-2.0-flash` is shut down and `gemini-2.5-*` is limited access; do not write those from memory.
- **ElevenLabs** (plain `fetch`, no SDK, since Oct 10 8:10 pm): `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_64` with headers `xi-api-key` and `Content-Type: application/json`, body `{ "text", "model_id": "eleven_flash_v2_5" }`; the body comes back as audio and is returned as a `data:audio/mpeg;base64,` URL. Checked against the current API reference; it is the exact request the SDK sent. The `@elevenlabs/elevenlabs-js` SDK was removed because its 72 MB import blocked the event loop for 1 to 48 s on a cold start, right when Replit's publish probe and the first visitor arrive. Default voice id `JBFqnCBsd6RMkjVDRZzb` ("George"). One or two sentences is about 40 to 60 KB of base64. Free tier is 10k credits a month; the greeting cache protects most of it.
- **Tiger Data** (`pg`): `DATABASE_URL` ends in `?sslmode=require`; node-postgres lets `sslmode` in the URL override an `ssl` object, so if connecting fails with a certificate error, strip `sslmode` and pass `ssl: { rejectUnauthorized: false }`.
- **Replit** (checked against docs.replit.com Oct 10, 3:50 pm; steps in `docs/deploy-replit.md`, config in `.replit`): `app.listen(process.env.PORT || 3000, '0.0.0.0')` before any database connect. Before publishing, Replit requests the **homepage** `/` and needs an answer within 5 s (there is no health-check path setting; `/health` is for us). One exposed port only: `.replit` maps 3000 to 80. Autoscale (`cloudrun`) sleeps after 15 min idle, so the first judge hit is a cold start plus a TLS handshake to Tiger: warm the link from the second device before each judge, or choose Reserved VM in Publishing > Adjust settings (smallest machine about $0.02 an hour; may need the Core plan). Replit does not pull from GitHub on its own: after a push, Pull in the Git pane, then Republish; keep Git auto-sync off (it pushes Replit's edits back to `main`). Check Production app secrets before publishing; the docs disagree on whether workspace secrets copy over. Keep Enable analytics, the feedback widget and Agent metrics off.

## 4. Rules for everyone

1. **Look up SDK calls; do not write them from memory.** Gemini (`@google/genai`), ElevenLabs (`@elevenlabs/elevenlabs-js`) and Tiger Data all change often. Before writing a call, read the current quickstart and confirm the package name, the function signature and the model id. This is the most likely source of lost hours.
2. **Zero Data is a hard constraint.** No accounts, cookies, analytics, or local storage of anything about the visitor. The server must not log or store the visitor's text. Server logs may record timing and error types only.
3. **Keys stay on the server.** Nothing secret in `public/`, in git, or in a prompt pasted to Ollama.
4. **One owner per file at a time.** Claim it in `TASKS.md` before editing.
5. **Commit after every working step**, with a message that says what now works. Git is how the agents and Ollama see each other's work.
6. **Keep the fallback.** The page must still demo with canned answers and the browser voice if the network or an API fails at the venue.
7. **No new scope.** Checkout, owner accounts, the sandbox builder and walkable 3D are for the pitch's "where this goes" slide.

**Zero Data disclosures (from checkpoint 1).** Gemini's free tier states that content is used to improve Google's products, and the visitor's question goes there: use a key from a billing-enabled project if possible, otherwise say so in the README, and put this fact to Shock Tracker. ElevenLabs keeps TTS text and audio in the account's History (`enable_logging=false` is enterprise-only); only the clerk's reply goes there, never the visitor's text; disclose it. The mic button (S1) uses the browser's own speech recognition: Chrome sends the audio to Google's speech service and Safari to Apple's; the page handles only the returned words; disclose it. Replit Analytics records top URLs, countries and unique-IP counts: keep the visitor's text in the POST body only, no request-logging middleware, and log method, path, status and milliseconds only. On a published Replit app, even with analytics off, Monitoring counts requests and unique IPs, Growth shows visitor counts by country and device from IP data, deployment logs are kept 30 days, and Google's front end sets a `GAESA` routing cookie on every app that the app cannot remove; it carries no identity. The README's Zero Data statement says all of this.

## 5. Order of work

| Block (ET) | Goal | Check before moving on |
|---|---|---|
| Sat 1:30 to 3 pm | Repo scaffold, schema and seed loaded, `/api/clerk` answering locally with Gemini and a real stock lookup | `curl` returns a correct reply for one in-stock and one out-of-stock item |
| 3 to 6 pm | ElevenLabs audio, page wired to the endpoint, deployed on Replit | The four steps in section 2 pass on a phone |
| 6 to 9 pm | Mic input, `typicalRestockDays`, visual polish from Sergio's screenshots | Each one works without breaking section 2 |
| 9 to 11 pm | Domain, README, submission text, pitch draft | Submission form is filled in and saved as a draft |
| Sun 6 to 9 am | Rehearse, final checks, submit by 8:30 | Submitted |

**Cut rule:** if the 3 pm check has not passed by 6 pm, drop mic input and `typicalRestockDays` and spend the evening on the endpoint and the deploy.

**3 pm check: passed at 3:45 pm** with the real Gemini key and the in-memory seed (Tiger Data load pending `DATABASE_URL`): sourdough in stock in 1.3 s, croissants out with "Tuesday, October 13" and "usually takes about three days" in 1.2 s.

### Must have
- [x] M1. Scaffold: Express server serving `public/` and `/api/clerk`
- [x] M2. Schema and seed data in Tiger Data
- [x] M3. `check_stock` reading from the database
- [x] M4. Gemini clerk with `check_stock` as a tool, scoped to the current shop
- [x] M5. ElevenLabs audio returned as a data URL
- [x] M6. Page: set `CLERK_ENDPOINT` to `/api/clerk`. `askClerk` tries the endpoint with an AbortController (15 s; timing rule in section 3) and falls through to the canned branch on any throw, non-2xx or timeout (today's catch only prints "couldn't reach the stock room"). Greeting fetched with `{ greet: true }` on the Enter tap. iOS audio unlock: one shared `Audio` element, primed synchronously inside the Enter click handler with a silent mp3 data URL plus an empty `speechSynthesis` utterance, then reused for every later reply; without this iOS Safari silences the greeting and the answers
- [ ] M7. Deployed on Replit and tested on a phone

### Should have
- [x] S1. Mic input (Web Speech API in Chrome), with typing kept as the fallback
- [x] S2. `typicalRestockDays` from `stock_events`, used in the clerk's answer
- [ ] S3. Domain registered and pointed at the app
- [x] S4. README and docs/ as specified in section 10
- [x] S5. Two-minute pitch

### Only if everything above is done
- [ ] N1. Owner can upload a storefront photo for the sign and walls
- [ ] N2. A greeting that changes with the time of day
- [x] N3. A per-shop `agents` list in `SHOPS`. The bakery gets a desk clerk and a stock agent; the paint store adds a support agent that answers questions like "which primer for a bathroom?". It is the same Gemini call with a different instruction, about an hour once the endpoint exists
- [ ] N4. A customize panel with three controls: shop name, accent color, and checkboxes for which agents are on. No dragging, no resizing. Start only if the four demo steps pass on a phone by 9 pm

The sandbox builder itself (owners assemble a shop from ready-made elements and staff it with agents) is pitched, not built: a drag-and-drop builder is a product in itself, and with the backend not yet running it would cost the demo. N3, the pitch line in section 9 and one mockup slide make it visible.

## 6. Agents

Create these four files under `.claude/agents/` as the first step. Builders run on Opus. There is exactly one staff engineer, on Fable, and it is used sparingly because Fable usage is limited: at the four checkpoints below, and when a builder is stuck after two attempts.

If the `fable` model is not available or is over its usage limit, change the staff engineer's `model` to `opus` and continue.

**Staff engineer checkpoints**
1. Before any code: review this plan and the contract. **Done Oct 10, 1:45 pm ET**; findings folded into sections 3, 4, 5, 8 and 9.
2. After M4: review the Gemini tool loop and the SQL. **Done Oct 10, 2:45 pm ET**; four findings (force `check_stock` on round one, timing budget 15/10/12.5 s, `stock` wording, unreadable bodies) folded into section 3; code fixes assigned to backend and frontend.
3. After M7: review the deployed app against section 2 and the Zero Data rule. **Local pass done Oct 10, 7:55 pm ET** on HEAD 5bccdb0: ready to deploy after three doc fixes (made in 8511137) and one recommended change (the blocking ElevenLabs SDK import; resolved by replacing the SDK with a plain fetch, 0165cad, so nothing blocks a cold start); free-tier Gemini allows about 6 plain or 4 support questions a minute before a 429. **Live re-check still due on the public URL**: headers on `/` and `/health`, greeting for bakery and paint with `data:audio/mpeg`, one in-stock and one out-of-stock question, boot log showing `using TIGER_DATABASE_URL`, a cold start after 15 min idle, the mic over https by hand.
4. At feature freeze: final pass, listing only demo-breaking problems.

`.claude/agents/staff-engineer.md`
```markdown
---
name: staff-engineer
description: Reviews plans and code at checkpoints, owns the API contract, and unblocks builders who are stuck after two attempts. Use at the four checkpoints in PLAN.md, not for routine work.
model: fable
tools: Read, Grep, Glob, Bash
---
You are the staff engineer on Peripie, a solo hackathon project due Sunday 9:00 am ET. Read PLAN.md first.

You review; you do not build features. For each review, report only what would break the demo, violate the API contract in PLAN.md section 3, or violate the Zero Data rule in section 4. Give each finding as: the file and line, what goes wrong, and the smallest fix. Skip style comments and refactors, because there is no time to act on them.

When a builder is stuck, find the cause and hand back a specific fix. If the fix needs an SDK call, read the current docs before recommending it.

You are the only one who may approve a change to the contract. If you approve one, update PLAN.md in the same change.
```

`.claude/agents/backend.md`
```markdown
---
name: backend
description: Builds the Node server: /api/clerk, the Gemini clerk with its check_stock tool, and the ElevenLabs voice call. Use for tasks M1, M4, M5.
model: opus
---
You build the server for Peripie. Read PLAN.md first; the contract in section 3 is fixed.

Own: server/index.js, server/clerk.js, server/voice.js, .env.example.

Before writing any Gemini or ElevenLabs call, read the current quickstart and confirm the package name, function signature and model id; do not rely on memory for these. The clerk speaks its replies aloud, so instruct the model to answer in one or two short sentences and to call check_stock whenever a product is mentioned, never guessing at stock. Do not log or store the visitor's text. Handle failures as the contract describes. Verify each step with curl before reporting it done, and say plainly what you did not test.
```

`.claude/agents/data.md`
```markdown
---
name: data
description: Builds the Tiger Data schema, seed data, and the check_stock query. Use for tasks M2, M3, S2.
model: opus
---
You build the data layer for Peripie. Read PLAN.md first.

Own: db/schema.sql, db/seed.sql, server/stock.js.

Tiger Data is Postgres with time-series features. Read its current quickstart before using any time-series function. Seed the three shops so their products match the SHOPS list in public/index.html, with a mix of in-stock and out-of-stock items and about 60 days of stock_events per product so restock gaps can be computed. check_stock must match loosely ("croissants" finds "croissant") and must use parameterized queries. Return the shape given in PLAN.md section 3. Show the query results that prove it works.
```

`.claude/agents/frontend.md`
```markdown
---
name: frontend
description: Maintains the Three.js shop page: wiring to the endpoint, fallback behavior, mic input, and visual polish. Use for tasks M6, S1, N1, N2.
model: opus
---
You maintain the page for Peripie. Read PLAN.md first.

Own: public/index.html.

The page already has three shop templates, the walk-in camera move, the clerk's three states (listening, checking, answering) and canned answers. Keep all of that working. Wire it to /api/clerk per the contract, and on any endpoint error fall back to the canned answers so the demo survives a network failure. Store nothing about the visitor: no cookies, local storage or analytics. You cannot see the rendered page, so after a visual change, say what Sergio should look at and ask for a screenshot.
```

## 7. Working with Ollama

Ollama takes volume jobs where a wrong answer is obvious. It does not write SDK calls and does not edit a file an agent has claimed.

Run it with `node scripts/ollama.mjs [--model NAME] [--out FILE] PROMPT_FILE` (or `-` for stdin). Prompts live in `scripts/prompts/`; `scripts/ollama-jobs.sh` runs the drafting jobs in sequence with `PLAN.md` prepended as context. Models on this machine: `qwen3.5:9b` for prose, `coder16k` (qwen2.5-coder 14b, 32k context) for code, SQL and Mermaid. Ollama output is a draft: the owning agent reads it before it is committed as final, and nothing from `.env` ever goes into a prompt.

Good Ollama jobs: more seed rows for `db/seed.sql`, CSS tweaks, explaining an error message, drafting README sections, drafting the submission text.

`TASKS.md` is the shared board. Create it with this format and keep it current:

```markdown
| ID | Task | Owner | Files | Status |
|----|------|-------|-------|--------|
| M1 | Scaffold server | backend | server/index.js | in progress |
| -  | 20 more seed rows for the plant shop | ollama | db/seed.sql | todo |
```

Owner is one of: `backend`, `data`, `frontend`, `staff-engineer`, `ollama`, `sergio`. If Ollama has edited a file, the next agent to touch it re-reads it first.

## 8. What only Sergio can do

- [ ] Get the keys: Gemini (Google AI Studio), ElevenLabs, and a Tiger Data database URL
- [ ] Pick an ElevenLabs voice and note its voice id
- [ ] Create the Replit project and add the four secrets
- [ ] Register the domain (ask the MLH table for a free domain code)
- [ ] Ask organizers: can one project enter a track plus several challenges and side quests?
- [ ] Ask Replit: does code written elsewhere and hosted on Replit count as "with Replit"?
- [ ] Ask Shock Tracker: does sending the visitor's question to Gemini and ElevenLabs, with nothing stored, satisfy Zero Data?
- [ ] Read the MLH prize page for each side quest's exact criteria
- [ ] Send screenshots after visual changes
- [ ] Capture the screenshot list in section 10 and record the demo video
- [ ] Rehearse the pitch out loud twice
- [ ] Decide whether to have the builder mockup slide made (one slide: palette of elements and agents on the left, the shop on the right)
- [ ] Confirm the submission goes through Devpost, and the video length and host, when the form opens
- [ ] Gemini key: prefer a project with billing enabled (see the Zero Data disclosures in section 4)

## 9. Demo script

1. "I run a painting company. My customers call to ask one thing: do you have it. This answers that, at the door."
2. Open the bakery, enter, let the greeting play.
3. Ask for sourdough (in stock), then croissants (out, with a restock date).
4. Switch to the paint store to show the same code running a different shop.
5. Close with what's next: the sandbox builder. Say the line: "Each shop is one settings file. The builder we're making next lets an owner edit that file by dragging things around." Show one mockup slide: a palette of elements and agents on the left, the shop on the right. A judge then sees two shops with different staff running from the same code, which is evidence the platform idea is real. Then, briefly: owners uploading their own storefront, checkout, and running the clerk on the shop's own hardware. Business model for the Q&A: a free shop with one clerk, and paid add-on agents.

Tested questions only. Keep a second device open on the deployed link in case the first fails.

## 10. Documentation

Judges at MLH events usually read the repo and the submission page before they see the live demo, so the documentation is part of the entry. Capture it as each piece starts working, because the final hours go to rehearsal.

The format below is the one experienced MLH hackers use: a README that follows the Devpost story headings, a small set of standard diagrams, numbered screenshots, and a short demo video.

### README.md, in this order

1. Name, one-line pitch, and a hero GIF or screenshot of the walk-in
2. Links: live demo, demo video, submission page
3. **Inspiration**: the small-shop problem, in Sergio's own voice as a business owner
4. **What it does**: the four steps from section 2, with screenshots
5. **How we built it**: the architecture diagram, plus a table of each sponsor technology and what it does in the product (Gemini, ElevenLabs, Tiger Data, Replit)
6. **Zero Data statement**: what is never collected or stored, and what is sent to which API to answer a question
7. **Challenges we ran into**
8. **Accomplishments we're proud of**
9. **What we learned**
10. **What's next**: the sandbox builder first (owners assemble their own shop from ready-made elements and staff it with agents; a free shop with one clerk, paid add-on agents), then storefront photos, checkout, and the clerk on the shop's own hardware
11. Run it locally: setup steps and the four environment variable names

### docs/

| File | Contents | Diagram type |
|---|---|---|
| `docs/architecture.md` | The system and its external services | Mermaid `flowchart` |
| `docs/sequence.md` | One question, from the visitor's words to the spoken answer | Mermaid `sequenceDiagram` |
| `docs/data-model.md` | The two tables and how they relate | Mermaid `erDiagram` |
| `docs/user-flow.md` | The visitor's path: street, door, counter, question, answer | Mermaid `flowchart` plus screenshots |
| `docs/decisions.md` | The idea log: each concept considered, why it was kept or cut | Table and short notes |
| `docs/screenshots/` | Numbered PNGs from the list below | |

Write diagrams in Mermaid inside the Markdown files. GitHub renders Mermaid without any tooling, and the source stays editable. Agents cannot see the rendered result, so Sergio checks each diagram on GitHub after it is pushed.

Starting point for the sequence diagram:

```mermaid
sequenceDiagram
    actor Visitor
    participant Page as Browser page
    participant API as /api/clerk
    participant Gemini
    participant DB as Tiger Data
    participant Voice as ElevenLabs
    Visitor->>Page: "Do you have croissants?"
    Page->>API: POST { shop, text }
    API->>Gemini: clerk prompt + check_stock tool
    Gemini-->>API: call check_stock("croissant")
    API->>DB: query inventory and stock_events
    DB-->>API: out of stock, back Tuesday
    API->>Gemini: tool result
    Gemini-->>API: reply text
    API->>Voice: reply text
    Voice-->>API: mp3
    API-->>Page: { reply, audioUrl, stock }
    Page-->>Visitor: clerk speaks the answer
```

### The idea log (`docs/decisions.md`)

Record how the idea was reached, since judges ask "why this?" Include the concepts that were dropped and the reason for each: Mise (meal planner; crowded category), Proof (AI car condition report; Cox Automotive already ships photo-based damage detection), the bookkeeper that forgets (many statement analyzers exist), and the virtual shop that became Peripie (existing platforms serve large brands, none found for small local shops). Add the sandbox builder: pitched, not built, because a drag-and-drop builder is a product in itself and with the backend not running it would have cost the demo. Add each technical decision as it is made, one line each: what was chosen, what was rejected, why.

### Screenshot list (Sergio captures; save as `docs/screenshots/NN-name.png`)

1. `01-street.jpg`: the storefront from the street
2. `02-doors.jpg`: the doors opening
3. `03-greeting.jpg`: the clerk greeting the visitor
4. `04-checking.jpg`: the clerk turned to the stock agent
5. `05-answer.jpg`: an out-of-stock answer with a restock date
6. `06-second-shop.jpg`: a different shop template
7. `07-phone.png`: the app on a phone

### Demo video

Two minutes, following the demo script in section 9. Record it Saturday night once section 2 passes, so a working recording exists even if something breaks on Sunday. Check the submission form for the required length and host.

### Who does what

- `backend`, `data` and `frontend` each add their part to the diagrams and the "How we built it" section when they finish a task.
- Ollama drafts the README prose from the notes in this file.
- The staff engineer checks at checkpoint 3 that the diagrams match the code.
- Sergio captures screenshots, records the video, and reviews the rendered diagrams.
