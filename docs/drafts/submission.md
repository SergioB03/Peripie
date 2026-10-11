## Tagline
Peripie: A virtual storefront for small local shops that answers inventory questions by voice.

## Elevator pitch
We are building a website where you walk into a shop and speak to a clerk who checks real-time stock levels. The clerk uses an AI agent to query our database and speaks the answer aloud using ElevenLabs. We target small business owners ignored by big platforms, offering a simple tool that handles customer questions about availability and restock dates without collecting any user data.

## About the project
### Inspiration
I run a small painting company, and I get tired of customers calling to ask if we have specific colors or primers. Existing virtual store platforms like Obsess and Emperia are built for large brands with complex supply chains; they don't serve us. We need a solution that fits in a small shop's pocket: something that listens at the door and answers questions immediately without needing a login or a backend server we can't afford to maintain.

It is also for the customer who would rather not walk in and ask. Some days that is me: I will take a drive-through over a counter, and a website cannot answer the question. Peripie is a counter you can walk up to from wherever you are, and you watch the clerk turn to the stock room before answering, so the answer is one you can trust.

### What it does
Peripie lets you walk into a virtual storefront, hear a clerk greet you, and ask for a product by typing or speaking. The clerk checks our database using an AI agent, determines if the item is in stock, and speaks the answer aloud. If an item is out of stock, the clerk tells you exactly when it will be back based on historical restock data. The system works entirely without storing your personal information or requiring an account. It is built for people the usual channels leave out: an accessibility drawer (captions, larger text, high contrast, reduce motion, kept in memory only), a "Describe this view" button that narrates the scene in the browser's own voice, Replay for every line including the greeting, a mic for people who would rather talk than type, a keyboard path through the whole visit, and the stock room's record shown under every answer so you can see the agent's work.

### How we built it
We used Replit to host our Node.js server, which connects to a Tiger Data PostgreSQL database for inventory management. Our frontend is built with Three.js to create the 3D walk-in experience. For the brain of the operation, we use the Gemini API to power the clerk's decision-making and tool calling capabilities. We leverage ElevenLabs to convert the clerk's text responses into natural-sounding audio. The entire stack runs on a single endpoint that handles both greetings and product queries.

### Challenges we ran into
- On the first real run, gemini-3.8-flash answered 503 to every call and then a 429 on our key, and when it hung it ate the whole 10 s budget. We made gemini-3.5-flash-lite the primary (about a second per answer), 3.8-flash the fallback, and capped any single model attempt at 5 s.
- A 12 s page timeout against a 12 s server deadline was a tie a slow real answer would lose. The review set a budget: page 15 s, Gemini 10 s, ElevenLabs only the time left before 12.5 s.
- iOS Safari silences audio that does not start inside the tap, so one shared Audio element is primed in the Enter handler and reused for every reply.
- Replit names its own Postgres DATABASE_URL, so the live app could have quietly answered from the built-in seed instead of Tiger Data. The server now reads TIGER_DATABASE_URL first and logs which database it uses.

### Accomplishments that we're proud of
- The demo line is literally what the clerk says: "out of croissants, back on Tuesday, October 13, which usually takes about three days," with the date from the shelf list and the three days from 60 days of stock counts, in 1.2 s.
- check_stock gives the same answer from Tiger Data and from its built-in copy, 18 cases and 0 mismatches, so the demo survives a dead database.
- Zero Data held up under review: no visitor text in any log on 25 request paths, the database sees only the shop id, and what each outside service keeps is disclosed.

### What we learned
- Force the tool call. Telling a model to "always check stock" is a suggestion; functionCallingConfig mode ANY on the first round is a rule.
- Put the weekday in the tool result, not in the prompt. The model should never do calendar math.
- Fallbacks are what let you demo at all at a venue: canned answers and the browser voice stayed in the page from the first commit.

### What's next for Peripie
Our immediate goal is to launch the sandbox builder, which allows shop owners to assemble their own storefront by dragging and dropping elements and staff them with custom agents. We plan to add a photo upload feature so owners can replace our default 3D models with photos of their actual storefront walls. Eventually, we want to integrate a checkout system so customers can order out-of-stock items for delivery, turning the clerk into a full sales assistant running on the shop's own hardware.

## Built with
JavaScript, Node.js, Express, Three.js, Gemini API, ElevenLabs, Tiger Data (PostgreSQL), Replit

## Prizes and tracks entered
| Entry | What earns it |
|---|---|
| AI/ML track | Two agents with a visible hand-off that take a real task off a shop owner's plate. |
| Replit "Small Business" challenge | A working, creative small business app hosted on Replit. |
| Best Use of ElevenLabs | The clerk's voice is the product, delivering natural-sounding responses to customer questions. |
| Best Use of Gemini API | Gemini runs the clerk and decides when to call the stock tool based on user input. |
| Best Use of Tiger Data | Restock history as time-series data is used in the clerk's answers to predict return dates. |
| Zero Data challenge | No accounts, tracking, profiles, or stored personal info; visitor text is not logged. |
| GoDaddy Registry | A good domain name relevant to the project. |
