# Decision log

## How we got to Peripie

| Idea | What it was | Why it was cut or kept |
|---|---|---|
| Mise | A meal planner | Cut: crowded category |
| Proof | An AI car condition report from photos | Cut: Cox Automotive already ships photo-based damage detection |
| The bookkeeper that forgets | A statement analyzer that keeps nothing | Cut: many statement analyzers already exist |
| The virtual shop, which became Peripie | A shop website you walk into, with a clerk who checks stock and answers by voice | Kept: existing virtual-store platforms (Obsess, Emperia) serve large brands; none found for small local shops, and Sergio runs a small business himself |
| The sandbox builder | Owners assemble a shop from ready-made elements and staff it with agents | Pitched, not built: a drag-and-drop builder is a product in itself, and with the backend not yet running it would cost the demo. Shown instead with a per-shop agents list, one line in the pitch, and one mockup slide |

## Technical decisions

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Hosting | Replit | Vultr | Challenge requirement |
| Login | none (Zero Data challenge) | Auth0 | Logins contradict Zero Data |
| Checkout | out of scope | Solana | No checkout in scope |
| Clerk model | Gemini with a check_stock tool | letting the model guess stock | Tool ensures correct answers; guessing risks hallucinations |
| Voice | ElevenLabs mp3 returned as a base64 data URL | writing audio files to disk | No audio file ever written to disk; protects budget and simplifies deployment |
| Database | Tiger Data hypertable for stock_events so typicalRestockDays comes from real history | a static restock date | Real history makes the use of a time-series database meaningful |
| Greeting | fixed text per shop, mp3 cached in memory | a Gemini call per visitor | Protects ElevenLabs credit budget; greeting is not dependent on visitor input |
| Restock wording | nextRestockText computed in Node | the model doing weekday math | Ensures correct weekday names regardless of timezone or model quirks |
| Fallbacks | canned answers and the browser voice stay in the page | a page that needs the network | Demo survives network failures or API timeouts |
| Logging | method, path, status and timing only | request-logging middleware | Zero Data rule; visitor text must not be logged or stored |
| Audio on iOS | one shared Audio element primed on the Enter tap | a new Audio() per reply | Prevents iOS Safari from silencing audio after the first interaction |
| Visible hand-off | the clerk turns to a stock-room figure and the label reads "Checking with the stock room" | a spinner or an instant answer | A visitor who would rather not ask in person trusts an answer they can see being checked (Sergio's own experience, Oct 10); it is also the two-agent hand-off the AI/ML track asks for |
| Clerk model | gemini-3.5-flash-lite as primary, gemini-3.8-flash as fallback, each attempt capped at 5 s | gemini-3.8-flash as primary | On Oct 10 the key got 503 on every 3.8-flash call and then a 429; lite answered every question in about a second with the right facts, and a hanging primary must not eat the fallback's time |
| Staff per shop (N3) | each shop lists its staff; the paint store adds a support agent that gives one sentence of advice and then checks stock for what it recommends; the street dock names who is on duty | one identical clerk everywhere | Makes the pitch's "two shops with different staff from the same code" literally true, at the cost of one prompt rule and a display-only field; the contract is unchanged |
| Answer when the model fails | the server composes the reply from the stock record (date, count, typical days) and returns 200 with audio | 502 and the page's rough canned list | Live runs on Oct 10 showed model timeouts and 429s; the database answer is correct either way, so the visitor should hear it, not "Tuesday morning" |
| Voice call | one plain fetch to the ElevenLabs text-to-speech endpoint | the official SDK | The SDK's 72 MB import blocked the event loop for 1 to 48 s on a cold start, exactly when Replit's publish probe and the first visitor arrive; the fetch sends the same request and nothing blocks |
| Database resilience | 2 s connect timeout, kept-open connections, a breaker with a 10 s background probe | per-question connection attempts | A hanging Tiger host now costs one question about 2 s instead of every question; the clerk keeps answering from the built-in copy until the database is back |
| Restock schedules, not dates (Oct 11, 3 am) | per-item rules: a bakery tray every 20 minutes until 5 pm, baguettes at 7 and 2, the paint supplier's truck on Fridays, the grower on Saturdays; the stock agent says "in about 18 minutes" or "Friday, October 16" and carries the shop's own sentence | one next-restock date for everything | Sergio: a bakery does not "restock in three days"; it bakes. The typical-days line from the count history stays where it is true, the paint store, which is the Tiger Data moment in the demo |
| A catalog with edge cases | nine products per shop with aliases ("bread" finds the sourdough and names the others), prices, a low-stock flag, hours, delivery and hold rules | four products and exact names | Judges ask sideways questions; "we don't carry that" to "do you have bread?" at a bakery would have ended the conversation |
| A list, not another question | My list, Check my list, Take this with you: one request, every item checked at once, a card to carry in | asking three times | Sergio's own case: a large order he would rather not say out loud; the socially anxious visitor prepares in private and walks in with the answer |
| Memory in the page, not the server | the page sends the last three exchanges with each question | a server-side session | "And the sourdough?" has to work, and Zero Data means the server keeps nothing between requests |
| Real shops, not a template (visuals) | per-shop materials, procedural textures, props and light within a frame-cost budget, scene code only | one storefront with three colour schemes | The sandbox pitch only lands if the three shops look like three places an owner could have made |
| Forcing the stock lookup | Gemini's first round must call check_stock (function-calling mode ANY) | trusting the prompt to ask for it | Without it the model can answer "yes, we have that" from memory and the answer never touches the database |
| Timing budget | page waits 15 s; server gives Gemini 10 s and ElevenLabs the time left before 12.5 s | 12 s on both sides | A 12 s tie meant a slow real answer lost to the canned one; now every reply is back 2.5 s before the page gives up |
| Hosting | Replit for the submission (decided Oct 10, 3:05 pm) | AWS App Runner | Replit is in the prize table and is the fastest path to a public HTTPS URL with a secrets screen; the server is plain Express on PORT, so an AWS deployment stays a stretch goal after the submission, not a code change |
| Ship the list and the visuals after the deadline, dated (Oct 11, 10:35 am) | merge integrate/final (the list and catalog UI, follow-up memory, the first-visit card, the second visual pass) into main after the 8:55 am Devpost submission; the live site gets them on the next republish; the Devpost text keeps the 8:55 am state; the README says when they merged | holding them back until after judging, or rewording the Devpost text to claim them | Judges see the live site, and the submission text stays what it was at the deadline; dating the merge in the README, TASKS and the docs means nothing is claimed that was not there when it was written down |

## Open questions for organizers

* Can one project enter a track plus several challenges and side quests?
* Does code written elsewhere and hosted on Replit count as "with Replit"?
* Does sending the visitor's question to Gemini and ElevenLabs, with nothing stored, satisfy Zero Data?
