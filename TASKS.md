# Task board

See PLAN.md section 7. Claim a file here before editing it. Owner is one of: backend, data, frontend, staff-engineer, ollama, sergio.

| ID | Task | Owner | Files | Status |
|----|------|-------|-------|--------|
| CP1 | Checkpoint 1: review plan and contract | staff-engineer | PLAN.md | done 1:45 pm, folded into PLAN.md |
| M1 | Scaffold: Express server serving public/ and /api/clerk | backend | server/index.js, package.json, .env.example | in progress |
| M2 | Schema and seed data in Tiger Data | data | db/schema.sql, db/seed.sql | claimed (DATABASE_URL pending; run against the real database once Sergio adds it) |
| M3 | check_stock reading from the database, in-memory seed fallback | data | server/stock.js | claimed |
| M4 | Gemini clerk with check_stock tool | backend | server/clerk.js | todo, after M1 and M3 |
| M5 | ElevenLabs audio as a data URL, greeting cache | backend | server/voice.js | todo |
| M6 | Page: endpoint, greeting, canned fallback, iOS audio unlock | frontend | public/index.html | todo |
| M7 | Deployed on Replit, tested on a phone | sergio | - | todo |
| CP2 | Checkpoint 2: Gemini tool loop and SQL | staff-engineer | server/clerk.js, server/stock.js | after M4 |
| - | Draft docs/decisions.md | ollama | docs/decisions.md | drafted 1:51 pm, reviewed and fixed; add technical decisions as they are made |
| - | Draft README to docs/drafts/README-draft.md | ollama | docs/drafts/README-draft.md | drafted; Sergio rewrites Inspiration in his voice, then it becomes README.md (S4) |
| - | Draft Devpost submission text | ollama | docs/drafts/submission.md | drafted; TODO bullets to fill once the demo works |
| - | Draft docs/user-flow.md, architecture.md, data-model.md (Mermaid) | ollama | docs/*.md | drafted, diagrams corrected; Sergio checks the rendering on GitHub |
| - | Keys: Gemini (billing-enabled project preferred), ElevenLabs + voice id, Tiger Data URL | sergio | .env (never committed) | todo |
| - | Replit project and the secrets | sergio | - | todo |
| - | Decide on the builder mockup slide; confirm Devpost and video requirements | sergio | - | todo |
