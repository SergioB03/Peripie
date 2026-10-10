# Task board

See PLAN.md section 7. Claim a file here before editing it. Owner is one of: backend, data, frontend, staff-engineer, ollama, sergio.

| ID | Task | Owner | Files | Status |
|----|------|-------|-------|--------|
| CP1 | Checkpoint 1: review plan and contract | staff-engineer | PLAN.md | done 1:45 pm, folded into PLAN.md |
| M1 | Scaffold: Express server serving public/ and /api/clerk | backend | server/index.js, package.json, .env.example | done 1:59 pm (e1eab9d), curl-verified: /health, bad_shop, bad_text, greetings |
| M2 | Schema and seed data in Tiger Data | data | db/schema.sql, db/seed.sql, db/seed-data.js | code done 2:09 pm (3d971dd): schema + seed verified twice (idempotent) on local TimescaleDB 2.30.2 / PG 17 in Docker: 12 inventory rows, 2,880 stock_events in a 10-chunk hypertable. Not yet loaded into Tiger: Sergio runs the two load commands once DATABASE_URL exists, and re-runs seed.sql on demo morning |
| M3 | check_stock reading from the database, in-memory seed fallback | data | server/stock.js | done 2:09 pm (3d971dd): all 12 products + 6 test phrases identical from DB and in-memory; live DB edit picked up; DB down -> seed fallback; sslmode=require cert-error retry verified on a self-signed TLS server. typicalRestockDays (S2, data side) included |
| M4 | Gemini clerk with check_stock tool | backend | server/clerk.js | code done 2:05 pm (bfeaa5f): loop verified against a fake Gemini endpoint + the real stock.js; no key -> 502 verified. Real Gemini untested until GEMINI_API_KEY is in .env |
| M5 | ElevenLabs audio as a data URL, greeting cache | backend | server/voice.js | code done 2:07 pm (be9ec34; f616a11 loads the SDK on first use so /health answers 0.6 s after boot; 2751462 keeps reply audio inside the page's 12 s window): real SDK verified against a fake endpoint (request shape, greeting cache, 401, 6 s timeout); no key -> audioUrl null verified. Real ElevenLabs untested until ELEVENLABS_API_KEY is in .env |
| M6 | Page: endpoint, greeting, canned fallback, iOS audio unlock | frontend | public/index.html | in progress |
| M7 | Deployed on Replit, tested on a phone | sergio | - | todo |
| CP2 | Checkpoint 2: Gemini tool loop and SQL | staff-engineer | server/clerk.js, server/stock.js | after M4 |
| - | Draft docs/decisions.md | ollama | docs/decisions.md | drafted 1:51 pm, reviewed and fixed; add technical decisions as they are made |
| - | Draft README to docs/drafts/README-draft.md | ollama | docs/drafts/README-draft.md | drafted; Sergio rewrites Inspiration in his voice, then it becomes README.md (S4) |
| - | Draft Devpost submission text | ollama | docs/drafts/submission.md | drafted; TODO bullets to fill once the demo works |
| - | Draft docs/user-flow.md, architecture.md, data-model.md (Mermaid) | ollama | docs/*.md | drafted, diagrams corrected; Sergio checks the rendering on GitHub |
| - | Keys: Gemini (billing-enabled project preferred), ElevenLabs + voice id, Tiger Data URL | sergio | .env (never committed) | todo |
| - | Replit project and the secrets | sergio | - | todo |
| - | Decide on the builder mockup slide; confirm Devpost and video requirements | sergio | - | todo |
