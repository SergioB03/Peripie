# Peripie

Walk into a small shop's website and ask the clerk. A 3D storefront with a voice agent that checks live stock. Built at HackLanta '26.

![Walk-in](docs/screenshots/01-street.png)

[Live Demo](TODO: link) | [Demo Video](TODO: link) | [Submission Page](TODO: link)

## Inspiration

I run a painting company. My customers call to ask one thing: do you have it? I don't want them to wait on hold or drive by if the paint isn't there. I wanted a tool that answers that question instantly, right at the door. Existing virtual store platforms only serve big brands with massive catalogs. They ignore small local shops like mine. This project started because I needed a simple way for my business to talk back to customers without hiring more staff or buying expensive software.

Some days I'm also the customer who won't ask. I'll order at a drive-through before I'll ask at a counter, and a website can't answer the question anyway. Peripie is a counter you can walk up to from wherever you are. You watch the clerk turn to the stock room before answering, so the answer is one you can trust.

## What it does

1. Open the site, pick the bakery, tap "Enter shop."
![Open shop](docs/screenshots/02-doors.png)
2. Hear the clerk's greeting in an ElevenLabs voice.
![Greeting](docs/screenshots/03-greeting.png)
3. Ask for an in-stock item and an out-of-stock item, by typing or speaking.
![Checking](docs/screenshots/04-checking.png)
4. Hear correct answers that come from the database, including a restock date.
![Answer](docs/screenshots/05-answer.png)

## How we built it

| Technology | What it does in Peripie |
|---|---|
| Gemini API | The clerk persona and stock checker logic |
| ElevenLabs | Generates the spoken reply audio |
| Tiger Data (Postgres) | Stores inventory and restock history time-series |
| Replit | Hosts the Node server and Express app |

See [docs/architecture.md](docs/architecture.md) for a diagram of the system.

## Zero Data statement

We never collect or store personal information about visitors. No accounts, cookies, analytics, or local storage of visitor data. When you ask a question, your text goes to Gemini via the API; we do not log it on our server. The clerk's reply text goes to ElevenLabs for audio generation; we do not store that either. The server only stores inventory and restock events, never the visitor's input.

## Challenges we ran into

- TODO: List challenge 1
- TODO: List challenge 2

## Accomplishments we're proud of

- TODO: List accomplishment 1
- TODO: List accomplishment 2

## What we learned

- TODO: Lesson 1
- TODO: Lesson 2

## What's next

The sandbox builder lets owners assemble their own shop from ready-made elements and staff it with agents. A free shop comes with one clerk; paid add-on agents can handle more complex tasks. Next, we plan to add storefront photo uploads for the sign and walls, a checkout flow, and running the clerk on the shop's own hardware.

## Run it locally

```bash
npm install
cp .env.example .env
# Edit .env with your keys (GEMINI_API_KEY, ELEVENLABS_API_KEY, DATABASE_URL)
npm start
```

Open http://localhost:3000.
