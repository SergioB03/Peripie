# One question, start to finish

What happens between the visitor's words and the clerk's spoken answer. Two round trips to Gemini (one to decide on the tool call, one to phrase the answer), one query to Tiger Data, one call to ElevenLabs. The server keeps nothing afterwards.

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
    DB-->>API: out of stock, back 2026-10-13, usually 3 days
    API->>Gemini: tool result (nextRestockText: "Tuesday, October 13")
    Gemini-->>API: reply text
    API->>Voice: reply text
    Voice-->>API: mp3
    API-->>Page: { reply, audioUrl, stock }
    Page-->>Visitor: clerk speaks the answer
```

## The greeting

The greeting never touches Gemini. The page asks for it the moment the visitor taps Enter, while the camera is still walking through the door, so the audio is ready at the counter.

```mermaid
sequenceDiagram
    actor Visitor
    participant Page as Browser page
    participant API as /api/clerk
    participant Voice as ElevenLabs
    Visitor->>Page: tap "Enter shop"
    Page->>API: POST { shop, greet: true }
    alt first greeting for this shop since the server started
        API->>Voice: fixed greeting text
        Voice-->>API: mp3 (cached in memory per shop)
    end
    API-->>Page: { reply, audioUrl, stock: null }
    Note over Page: camera arrives at the counter
    Page-->>Visitor: clerk greets out loud
```

## When something fails

| Failure | What the visitor gets |
|---|---|
| ElevenLabs down or out of credits | The same reply, spoken by the browser's own voice (`audioUrl: null`) |
| Gemini down or slower than 12 s | HTTP 502; the page answers from its built-in inventory list with the browser voice |
| No network at all | The page answers from its built-in inventory list with the browser voice |

Nothing about the visitor is stored at any step. See the Zero Data statement in the README.
