# Visitor flow

This diagram traces the path from the street to the counter and back, including the fallback behavior when the API fails.

```mermaid
flowchart TD
    A["Street view: pick a shop"] --> B["Tap Enter shop"]
    B --> C["Camera moves through door, doors open"]
    C --> D["At the counter: clerk greets by voice"]
    D --> E["Visitor types or speaks a product"]
    E --> F["Clerk turns to the stock agent (status: Checking with the stock room)"]
    F --> G{"Endpoint fails?"}
    G -- No --> H["Answer spoken: in stock, or out of stock with restock date"]
    G -- Yes --> I["Fallback: canned answer + browser voice"]
    H --> J["Ask again or Leave shop"]
    I --> J
    J --> A
```

## Screens

| Step | Screenshot |
|---|---|
| Street view: pick a shop | ![Street view](screenshots/01-street.png) |
| Tap Enter shop | ![Doors opening](screenshots/02-doors.png) |
| At the counter: clerk greets by voice | ![Greeting](screenshots/03-greeting.png) |
| Clerk turns to the stock agent (status: Checking with the stock room) | ![Checking](screenshots/04-checking.png) |
| Answer spoken: in stock, or out of stock with restock date | ![Answer](screenshots/05-answer.png) |
| A different shop template | ![Second shop](screenshots/06-second-shop.png) |
| The app on a phone | ![Phone demo](screenshots/07-phone.png) |

## What the visitor never does

The visitor never creates an account, logs in, or leaves any data behind. No cookies are set, no analytics are sent, and nothing about their question is stored on the server beyond the ephemeral request handling required to answer them.
