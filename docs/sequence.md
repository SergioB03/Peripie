# One question at the counter

A shop owner hears one question all day: do you have it? This doc follows that question through the shop, the way the people in it see it. The code and services are at the bottom, for engineers.

## At the counter

The visitor walks in and the clerk says hello. The visitor types a question. The clerk turns to the stock room, the stock room reads the shelf list, and the clerk says the answer out loud.

```mermaid
sequenceDiagram
    actor V as Visitor
    participant Vo as Voice
    participant C as Clerk at the counter
    participant S as Stock room
    participant L as Shelf list
    V->>C: Picks the bakery, taps Enter shop, walks in
    C->>Vo: Says the welcome line, recorded once for this shop
    Vo-->>V: "Welcome to Rosa’s Bakery. Take your time,<br/>and ask me about anything on the shelves whenever you’re ready."
    V->>C: Types "do you have croissants?"
    C->>S: Turns to the stock room: "Do we have croissants?"
    S->>L: Looks up croissant on the bakery list
    L-->>S: Shows none left, a tray every 20 minutes from 7 am to 5 pm,<br/>past restocks took 3 days on average
    S-->>C: "Out right now. The next tray of croissants<br/>comes out of the oven in about 18 minutes."
    C->>Vo: Says "We are out of croissants right now. The next tray<br/>comes out of the oven in about 18 minutes."
    Vo-->>V: Heard out loud, in the clerk voice
    V->>C: Asks about something else, or taps Leave shop
```

While the clerk checks, someone from the stock room appears behind the counter and the screen reads "Checking with the stock room".

The clerk never answers from memory. Every question goes to the stock room first, even a plain "hello".

The stock room reads loosely: "croissants" finds croissant, and "bread" finds the sourdough and names the other loaves the word fits. If the shop does not carry something, the clerk says so and names what is in stock.

The stock room hands over the 3 days too, but the clerk says it only next to a day, like the paint store's "Friday, October 16"; next to a tray due in 18 minutes it would contradict the oven.

Two more things the counter can do on the server side, which the page does not use yet: a question may come with the last three exchanges, so "and the sourdough?" would resolve; and a whole list can be checked in one request, every item at once. The page half of both is still being finished.

The welcome line is recorded once per shop and replayed for every visitor. The clerk gets it ready while the visitor walks in.

The shop keeps nothing about the visitor: no account, no cookies, no record of the question.

## When something goes wrong

The visitor always gets an answer, and waits 15 seconds at most.

```mermaid
sequenceDiagram
    actor V as Visitor
    participant Vo as Voice
    participant C as Clerk at the counter
    participant S as Stock room
    participant L as Shelf list
    V->>C: Asks for a product
    C->>S: Checks with the stock room
    opt the shelf list cannot be reached
        S-xL: Looks for the shelf list, no answer
        Note over S: Reads its own copy<br/>of the morning list
    end
    alt the answer comes back in time
        S-->>C: The answer
        alt the clerk voice is ready
            C->>Vo: Says the answer
            Vo-->>V: Heard in the clerk voice
        else the clerk voice is not available
            C-->>V: Says the same words in a plainer voice
        end
    else the clerk cannot answer within 15 seconds, or no connection
        C-->>V: Reads the printed list at the counter,<br/>in the plainer voice
    end
```

- **The clerk voice is not available.** Same words, in a plainer voice: the one built into the visitor's phone or browser. The words are on screen either way.
- **No answer in time, or no connection.** The clerk reads a short printed list kept at the counter, in the plainer voice. It holds four products per shop, and its times are rougher, like "tomorrow at 7am" or "Friday".
- **The shelf list cannot be reached.** The stock room reads its own copy of the morning list. The answer sounds the same.
- **The welcome is not ready.** Two seconds after the visitor reaches the counter, the clerk says the same line in the plainer voice.

## Behind the counter

Each person and place above is one part of the code.

| In the shop | In the code |
|---|---|
| Visitor | The page in their browser: `public/index.html`, a Three.js scene |
| Clerk at the counter | Gemini with one tool, run by `server/clerk.js` behind `POST /api/clerk` in `server/index.js` |
| Stock room | The stock agent: `check_stock` in `server/stock.js` |
| Shelf list | Tiger Data: the `inventory` table (counts, restock rules and notes, aliases, prices) and the `stock_events` hypertable, 60 days of stock counts |
| Voice | ElevenLabs, through `server/voice.js`; the mp3 comes back as a data URL |
| Welcome line | `{ shop, greet: true }`: fixed text per shop, no Gemini; the mp3 is kept in server memory per shop |
| Plainer voice | The browser's built-in speech, used when `audioUrl` is null or the mp3 will not play |
| Printed list at the counter | The canned answers in `SHOPS` in `public/index.html`: four products per shop, with rough times |
| Copy of the morning list | The built-in seed in `db/seed-data.js`, rebuilt each day; used when `TIGER_DATABASE_URL` is unset or the database cannot be reached |

## The same question, for engineers

```mermaid
sequenceDiagram
    participant P as Page
    participant X as Server
    participant G as Gemini
    participant D as Tiger Data
    participant E as ElevenLabs
    P->>X: POST /api/clerk with shop and text
    X->>G: Clerk prompt and question, check_stock forced on round 1
    G-->>X: Call check_stock for croissants
    X->>D: One SQL query, the shop id is the only parameter
    D-->>X: The bakery rows with their restock rules, typical restock days from stock_events
    Note over X: stock.js matches croissants to croissant<br/>and turns the oven rule into the words in about 18 minutes
    X->>G: Round 2, the check_stock result
    G-->>X: Reply text
    X->>E: Reply text, with the time left before 12.5 s
    E-->>X: mp3
    X-->>P: reply, audioUrl, stock
```

- **Timing (PLAN.md section 3).** The page waits 15 s. The Gemini loop gets 10 s; if it fails or runs out and no lookup found the product, the server answers 502 `clerk_unavailable`; if a lookup did find it, the server words the record itself (`server/template.js`) and answers 200. ElevenLabs gets only the time left before 12.5 s, from 1.5 s to 6 s, or `audioUrl` is null. A 200 leaves by about 12.5 s.
- **Tool rounds.** Round 1 must call `check_stock`. At most two tool rounds, then a round that must answer in words. If the main model fails, the fallback model gets what is left of the 10 s.
- **The restock time.** `stock.js` turns the row's `restock_rule` into `nextRestockText` in America/New_York ("in about 18 minutes", "today at 2 pm", "tomorrow at 7 am", or "Friday, October 16" when only the day is known) and fills the shop's `restock_note` with it. The prompt tells the model to say the note as written and to add `typicalRestockDays` only beside a weekday.
- **Memory and lists, server side.** A question may carry `history`, up to three prior `{ q, a }` pairs, sent to Gemini as earlier turns; the new question still gets the forced `check_stock` round. `{ shop, items }` with 1 to 12 items is one stock read for the whole list and one model call with no tools, worded by the template if the model fails, so a list never gets a 502. The page on main sends neither yet.
- **The greeting** skips Gemini. The page asks for it on the Enter tap and waits up to 2 s past the walk-in.
- **What each service sees.** Gemini gets the question. Tiger Data gets only the shop id. ElevenLabs gets only the clerk's reply. Server logs hold method, path, status, milliseconds and error types.
