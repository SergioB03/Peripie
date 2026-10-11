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
    Vo-->>V: "Welcome to Rosa’s Bakery.<br/>How can I help you today?"
    V->>C: Types "do you have croissants?"
    C->>S: Turns to the stock room: "Do we have croissants?"
    S->>L: Looks up croissant on the bakery list
    L-->>S: Shows none left, next restock October 13,<br/>past restocks took 3 days on average
    S-->>C: "Out until Tuesday, October 13.<br/>Usually back in about 3 days."
    C->>Vo: Says "We are out of croissants right now.<br/>They will be back Tuesday, October 13."
    Vo-->>V: Heard out loud, in the clerk voice
    V->>C: Asks about something else, or taps Leave shop
```

While the clerk checks, someone from the stock room appears behind the counter and the screen reads "Checking with the stock room".

The clerk never answers from memory. Every question goes to the stock room first, even a plain "hello".

The stock room reads loosely: "croissants" finds croissant. If the shop does not carry something, the clerk says so and names what is in stock.

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
- **No answer in time, or no connection.** The clerk reads a short printed list kept at the counter, in the plainer voice. Its dates are rougher, like "Tuesday morning".
- **The shelf list cannot be reached.** The stock room reads its own copy of the morning list. The answer sounds the same.
- **The welcome is not ready.** Two seconds after the visitor reaches the counter, the clerk says the same line in the plainer voice.

## Behind the counter

Each person and place above is one part of the code.

| In the shop | In the code |
|---|---|
| Visitor | The page in their browser: `public/index.html`, a Three.js scene |
| Clerk at the counter | Gemini with one tool, run by `server/clerk.js` behind `POST /api/clerk` in `server/index.js` |
| Stock room | The stock agent: `check_stock` in `server/stock.js` |
| Shelf list | Tiger Data: the `inventory` table and the `stock_events` hypertable, 60 days of stock counts |
| Voice | ElevenLabs, through `server/voice.js`; the mp3 comes back as a data URL |
| Welcome line | `{ shop, greet: true }`: fixed text per shop, no Gemini; the mp3 is kept in server memory per shop |
| Plainer voice | The browser's built-in speech, used when `audioUrl` is null or the mp3 will not play |
| Printed list at the counter | The canned answers in `SHOPS` in `public/index.html` |
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
    D-->>X: The bakery rows, typical restock days from stock_events
    Note over X: stock.js matches croissants to croissant<br/>and writes the date as Tuesday, October 13
    X->>G: Round 2, the check_stock result
    G-->>X: Reply text
    X->>E: Reply text, with the time left before 12.5 s
    E-->>X: mp3
    X-->>P: reply, audioUrl, stock
```

- **Timing (PLAN.md section 3).** The page waits 15 s. The Gemini loop gets 10 s; if it fails or runs out, the server answers 502 `clerk_unavailable`. ElevenLabs gets only the time left before 12.5 s, from 1.5 s to 6 s, or `audioUrl` is null. A 200 leaves by about 12.5 s.
- **Tool rounds.** Round 1 must call `check_stock`. At most two tool rounds, then a round that must answer in words. If the main model fails, the fallback model gets what is left of the 10 s.
- **The greeting** skips Gemini. The page asks for it on the Enter tap and waits up to 2 s past the walk-in.
- **What each service sees.** Gemini gets the question. Tiger Data gets only the shop id. ElevenLabs gets only the clerk's reply. Server logs hold method, path, status, milliseconds and error types.
