# A visit to the shop

One visit, as the visitor sees it: where you stand, what you tap, what you hear. The machinery behind each step is in the last section, for engineers.

```mermaid
flowchart TD
    subgraph s1["On the street"]
        A["Visitor stands in front of a shop. Nothing to sign up for."]
    end
    subgraph s2["Inside the shop"]
        B["Clerk says hello out loud, in the clerk voice"]
        C["Visitor asks for something"]
        D["Clerk turns to the stock room"]
        subgraph s3["In the back"]
            O["Shop owner"]
            S["Stock room"]
        end
        L["Printed list, kept at the counter"]
        E["Clerk answers out loud. The words show on screen too."]
        F["Visitor asks again, or taps Leave shop and walks back out to the street"]
    end
    A -->|"taps a shop name, then Enter shop, and walks in"| B
    B -->|"hears: Welcome to Rosa's Bakery. Take your time, and ask me about anything on the shelves whenever you're ready."| C
    C -->|"types: do you have croissants? Taps Ask."| D
    D -->|"asks: croissants?"| S
    S -->|"looks it up: out, the next tray comes out of the oven in about 18 minutes"| E
    D -.->|"Wi-Fi down: reads the list instead"| L
    L -.->|"out, with the rougher time printed on the list, in a plainer voice"| E
    E -->|"hears the answer"| F
    O -->|"keeps counts, restock rules and the shop's own lines"| S
```

The solid path is a normal visit. The dotted path is what happens when the connection drops after the page has loaded, or when the clerk cannot answer in time.

## Step by step

1. **On the street.** You see a shop front and the names of three shops: Rosa's Bakery, Southside Paint Supply and Fern & Pot. Tap a name to switch shops. On a first visit a card under the header says three things: "Walk into a small shop's website and ask the clerk." "Make a list, check it all at once, take the answer with you." "Nothing about you is stored." It shows once per page load and goes on Close, Escape or Enter shop.
2. **Through the door.** Tap **Enter shop**. The view walks you up to the door, the doors slide open, and you stop in front of the counter.
3. **The greeting.** The clerk says out loud, "Welcome to Rosa's Bakery. Take your time, and ask me about anything on the shelves whenever you're ready." The words also appear on screen.
4. **Asking.** Type into the **Ask for a product** box and tap **Ask**, or tap the mic button and speak (the mic appears on the https link, not on a plain http address). With **Hands-free** on, in the accessibility drawer, you can also say the commands, like "turn on captions" or "add sourdough to my list", and a guide confirms each one in a second voice; a question still goes to the clerk.
5. **The clerk checks.** The label changes to **Checking with the stock room**. The clerk turns away, and a second person appears in the back.
6. **The answer.** The clerk turns back and says it: in stock and how many, or out and when the next tray comes out of the oven, in the shop's own words. At the paint store, where the truck comes on a weekday, the clerk may add how long that item usually takes to come back.
7. **A list, all at once.** Under **What we carry**, tap what you need (nine items per shop), then **Check my list**: the clerk checks the whole list with the stock room in one go and answers it in one spoken summary, with one line per item under it (the shop's own sentence, the price, and "2 left" when stock is low); the list folds to "3 items checked · Edit list", and **Take this with you** shares or copies the answer as text, ending "via allyou.select". Nothing is stored.
8. **Again, or leave.** Ask again when the label reads **Listening**; a follow-up like "and the sourdough?" works, because the page keeps the last three exchanges of the visit in memory and sends them with the next question. Or tap **Leave shop**: the view walks you back out, the doors close, that memory goes with you, and you can pick another shop.

Not every question names a product. Say hello and the clerk greets you back. Ask for something the shop does not carry, and the clerk says so and names what is in stock. Ask for "bread" and the clerk finds the sourdough and names the other things the word fits. Ask what something costs and you get the price; ask when the shop closes and you get the hours. Ask for delivery, a hold or to pay, and the clerk says plainly that it cannot do that here.

## Three things a visitor notices

**You see the clerk go and check.** Nothing is answered from memory. The clerk turns to the stock room every time, and you watch it happen. For someone who would rather not walk in and ask, that is the point: an answer you can see being checked is one you can trust, from wherever you are.

**There is nothing to sign up for.** No account and no login. You open the link and you are on the street. The shop keeps nothing about you: no cookies, and your question is not saved or logged.

**If the connection drops once you are inside, the clerk still answers.** The page itself needs the network to load; after that, the clerk turns to the back as usual, then answers from a printed list kept at the counter, in the device's own, plainer voice. The greeting works the same way.

The printed list is written into the shop's page, so it can be out of date. It is also used when the answer does not come back, or takes more than 15 seconds.

If only the clerk voice is out, the answer still comes from the stock room, in the plainer voice.

## The owner's part

The shop owner keeps the stock room's counts, and for each item how it comes back: a tray every 20 minutes at the bakery, the supplier's truck on Fridays at the paint store, the grower on Saturdays at the plant shop, each with the shop's own sentence about it. The stock room also keeps a history of the counts. That history is how the clerk at the paint store can say rollers "usually take about 4.5 days" to come back.

This takes one job off the owner: answering "do you have it?" on the phone. In this demo the stock room holds sample data, and there is no owner screen.

## Screens

| Step | Screenshot |
|---|---|
| On the street: pick a shop | ![Street view](screenshots/01-street.jpg) |
| Tap Enter shop: the doors open | ![Doors opening](screenshots/02-doors.jpg) |
| The clerk greets you out loud | ![Greeting](screenshots/03-greeting.jpg) |
| The clerk turns to the stock room | ![Checking](screenshots/04-checking.jpg) |
| The answer: out of stock, back on a date | ![Answer](screenshots/05-answer.png) |
| A different shop | ![Second shop](screenshots/06-second-shop.jpg) |
| The same visit on a phone | ![Phone demo](screenshots/07-phone.png) |
| The bakery's own front on a phone, with the first-visit card (Sunday, after the submission) | ![Bakery front](screenshots/08-front.png) |

## For engineers: what runs behind each step

The diagram above leaves the machinery out on purpose. This table maps the story to the code. The JSON contract is in [architecture.md](architecture.md#request-contract), and one question's full round trip is in [sequence.md](sequence.md).

| In the story | In the code |
|---|---|
| The street and the shop names | `SHOPS` in `public/index.html`, drawn with Three.js |
| Tapping Enter shop | The page posts `{ "shop": "bakery", "greet": true }` to `/api/clerk` while the camera walks in |
| The greeting | Express returns fixed text per shop, with no Gemini call. The ElevenLabs mp3 is cached in memory per shop |
| Asking | The page posts `{ "shop": "bakery", "text": "do you have croissants?" }`, 1 to 300 characters. After the first question it adds `history`, the last three exchanges of the visit, and Leave shop clears it. Check my list posts `{ "shop": "bakery", "items": [...] }` instead, 1 to 12 items in one request |
| The clerk | Gemini, with `check_stock` as its only tool. Its first round must call the tool |
| The stock room | `check_stock` in `server/stock.js` reads Tiger Data: `inventory` for counts, restock rules and the shop's notes, `stock_events` for the usual restock gap. It turns the rule into "in about 18 minutes" or "Friday, October 16" in Node. If the database is unreachable, it answers from the built-in seed |
| The clerk voice | ElevenLabs turns the reply into an mp3, sent back in the JSON as a data URL. No file is written |
| The plainer voice | The browser's speech synthesis, used when there is no mp3 |
| The printed list | Canned answers from `SHOPS[].inventory`, all 27 products, nine per shop, with rough times, used on a network error, a non-2xx status, or no answer within 15 s; a list gets its line for each item |
| What the server logs | Method, path, status, milliseconds and error types. Never the question or the reply |

Gemini reads the visitor's question. ElevenLabs reads only the clerk's reply. What those services and the host keep on their side is disclosed in [PLAN.md section 4](../PLAN.md#4-rules-for-everyone).
