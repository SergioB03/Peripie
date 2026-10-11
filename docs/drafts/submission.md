## Tagline
Walk into a small shop's website and ask the clerk.

## Elevator pitch
Peripie is a small shop's website you walk into. A clerk greets you out loud, checks the stock room, and tells you whether they have what you came for and when it is back. It is built for small local shops, and for the customer who would rather not ask at a counter, and it stores nothing about you.

## About the project

### Inspiration
I run a painting company. My customers call to ask one thing: do you have it? I don't want them to wait on hold or drive by if the paint isn't there. The virtual-store platforms that exist (Obsess, Emperia) sell to large brands with huge catalogs; nobody serves small local shops like mine. This started because I needed a simple way for my business to answer that question without hiring more staff or buying expensive software.

Some days I'm also the customer who won't ask. I'll order at a drive-through before I'll ask at a counter, and a website can't answer the question anyway. Peripie is a counter you can walk up to from wherever you are. You watch the clerk turn to the stock room before answering, so the answer is one you can trust.

### What it does
You pick one of three shops, tap Enter shop, and the camera walks you to the counter, where the clerk greets you out loud. You ask for a product by typing or by voice. The clerk turns to the stock agent (the label reads "Checking with the stock room"), then answers in its own voice: on the shelf and how many, or out and when it is back, in the shop's own words. Tonight the live bakery said "We're out of croissants right now. The next tray of croissants comes out of the oven today at 7 am," and the paint store said "our supplier's truck comes Friday, October 16." Under every answer is the stock room's record itself, so you see the agent's work, and a Replay button for loud rooms.

It is built for people the usual channels leave out, and it stores nothing: an accessibility drawer (captions, larger text, high contrast, reduce motion, kept in memory for the visit), Describe this view in the browser's own voice, a mic for people who would rather talk than type, and a keyboard path through the whole visit. The paint store adds a support agent: ask which primer to use in a bathroom and you get one practical tip, then the stock of what it recommends. The stock room carries 27 products with aliases, so "bread" finds the sourdough, a price comes only when you ask, and the clerk says plainly what it cannot do.

### Finishing tonight
Not usable on the live site yet, so not claimed above: My list (write a list before you go in, Check my list in one request, Take this with you; server half live, page half in progress), a hands-free guide you talk to for everything that is not a shop question (server half written, page half queued), real-shop visuals, and follow-up questions like "and the sourdough?" (the server takes the last three exchanges; the page does not send them yet). This heading changes when they merge.

### How we built it
The clerk is a Gemini model with one tool, check_stock, and its first move on every question is forced to be that call, so it cannot make stock up. The stock room is Postgres on Tiger Data: an inventory table and a stock_events hypertable with sixty days of shelf counts per product; a LAG window over those counts measures how long each item usually stays out, so "usually about 4.5 days" comes from history, not a guess. The voice is one plain fetch to ElevenLabs, with the mp3 returned inside the JSON so no audio file is written, and the three greetings are voiced at boot and cached. Replit hosts the Node and Express server and the page; the storefront is Three.js in one HTML file with no build step.

If both model attempts fail, the server composes the answer from the stock record itself, still voiced; if the voice fails, the browser's own voice reads the same words; if the server cannot be reached, the page answers from a printed list. The method: a plan that fixed the API contract first (PLAN.md), four Claude Code agents building against it by role with a staff engineer reviewing at checkpoints, and a local Ollama for drafts.

### Challenges we ran into
On the first real run gemini-3.8-flash answered 503 to every call, then 429, and when it hung it ate the whole 10 s budget. gemini-3.5-flash-lite became the primary (about a second per answer), 3.8-flash the fallback, each attempt capped at 5 s. A 12 s page timeout against a 12 s server deadline was a tie a slow real answer would lose; the budget is now 15 s for the page, 10 s for the model, and the voice gets the time left before 12.5 s.

iOS Safari silences audio that does not start inside the tap, so one shared Audio element is primed on the Enter tap and reused for every reply. Replit names its own Postgres DATABASE_URL, so the live app could have quietly answered from the built-in seed; the server reads TIGER_DATABASE_URL first and logs which database it uses. At 3 am Replit's Agent rewrote the workspace and a republish rolled the site back; the fix was a clean re-import of main into a new Repl.

### Accomplishments that we're proud of
The live site tonight answered "croissants" and "rollers" in 1.8 s each, with the ElevenLabs voice and the stock record under each answer: the oven time from the bakery's schedule, the truck day from the paint store's, and "usually about 4.5 days" from sixty days of counts. The stock agent gives the same answer from Tiger Data and from its built-in copy, so the demo survives a dead database, and when the model fails the visitor still hears the right date.

Zero Data held up under review: no visitor text in any log, the database sees only the shop id, and what each outside service receives is written down. The page carries captions, larger text, high contrast, reduce motion and Describe this view without storing a thing.

### What we learned
Force the tool call: telling a model to "always check stock" is a suggestion, and function-calling mode ANY on the first round is a rule. Put the weekday in the tool result, not in the prompt; the model should never do calendar math.

Fallbacks are what let you demo at all at a venue, so the canned answers and the browser voice stayed in the page from the first commit. And a bakery does not "restock in three days"; it bakes. A schedule per item made the answers sound like the shop.

### What's next for Peripie
The sandbox builder: owners assemble their own shop from ready-made elements and staff it with agents, a free shop with one clerk and paid add-on agents. Each shop is already one settings file; the builder lets an owner edit it by dragging things around.

After that: a photo of the real storefront for the sign and walls, checkout, and the clerk running on the shop's own hardware.

## Built with
JavaScript, Node.js, Express, Three.js, Gemini API, ElevenLabs, Tiger Data (PostgreSQL with TimescaleDB), Replit

## Prizes and tracks entered
| Entry | What earns it |
|---|---|
| AI/ML track | Two agents with a visible hand-off that take a real task off a shop owner's plate. |
| Replit "Small Business" challenge | A working small business app hosted on Replit. |
| Best Use of ElevenLabs | The clerk's voice is the product: every answer is spoken, and the mp3 comes back inside the JSON. |
| Best Use of Gemini API | Gemini runs the clerk, and its first move on every question is the stock tool. |
| Best Use of Tiger Data | Restock history as time-series data: "usually about 4.5 days" is a LAG over sixty days of counts. |
| Zero Data challenge | No accounts, tracking, profiles or stored personal data; the visitor's text is never logged. |
| GoDaddy Registry | allyou.select: "all you select, checked at once", the list feature in a domain; registered at HackLanta and pointed at the app. |
