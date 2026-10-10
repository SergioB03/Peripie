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
| Forcing the stock lookup | Gemini's first round must call check_stock (function-calling mode ANY) | trusting the prompt to ask for it | Without it the model can answer "yes, we have that" from memory and the answer never touches the database |
| Timing budget | page waits 15 s; server gives Gemini 10 s and ElevenLabs the time left before 12.5 s | 12 s on both sides | A 12 s tie meant a slow real answer lost to the canned one; now every reply is back 2.5 s before the page gives up |
| Hosting | Replit (per the challenge) or AWS App Runner; decided at deploy time | changing hosts before the demo works | The server is plain Express on PORT, so the host is a deploy-time choice, not a code change |

## Open questions for organizers

* Can one project enter a track plus several challenges and side quests?
* Does code written elsewhere and hosted on Replit count as "with Replit"?
* Does sending the visitor's question to Gemini and ElevenLabs, with nothing stored, satisfy Zero Data?
