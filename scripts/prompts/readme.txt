You are drafting README.md for the repository described in the plan above. Follow section 10 of the plan exactly, in that order. Write GitHub-flavored Markdown only, no preamble.

Rules:
- Start with "# Peripie" and the one-line pitch: "Walk into a small shop's website and ask the clerk. A 3D storefront with a voice agent that checks live stock. Built at HackLanta '26."
- Where a link, screenshot or GIF is not known yet, write a placeholder like `TODO: link` or `![Walk-in](docs/screenshots/01-street.png)`.
- "Inspiration" is in first person, as Sergio, who runs a painting company and whose customers call to ask one thing: do you have it. Three short paragraphs at most.
- "What it does" lists the four steps from section 2 with a screenshot per step from the screenshot list.
- "How we built it" has the sponsor table (Gemini, ElevenLabs, Tiger Data, Replit) with columns Technology | What it does in Peripie, and a link to docs/architecture.md.
- "Zero Data statement": what is never collected or stored; what is sent where to answer a question (the visitor's words go to Gemini; the clerk's reply text goes to ElevenLabs; the server stores nothing).
- "Challenges we ran into", "Accomplishments we're proud of", "What we learned": leave each as two bullet points marked `TODO` to be filled in on Saturday night.
- "What's next": the sandbox builder first (owners assemble their own shop from ready-made elements and staff it with agents; a free shop with one clerk and paid add-on agents), then storefront photo upload, checkout, and running the clerk on the shop's own hardware.
- "Run it locally": npm install, copy .env.example to .env, the variable names GEMINI_API_KEY, GEMINI_MODEL, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, DATABASE_URL, load db/schema.sql then db/seed.sql, npm start, open http://localhost:3000.

Use only facts from the plan and this prompt. Plain language, short sentences. No marketing adjectives.
