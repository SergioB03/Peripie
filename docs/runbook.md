# Runbook: tonight and Sunday morning

Everything a judge sees runs from `main`. The laptop server is on `http://192.168.1.77:3000` (same Wi-Fi) and reads `.env` only at start.

## Tonight, in this order

1. **Keys into `.env`** (names only; never paste keys into chat):
   `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (optional), `TIGER_DATABASE_URL` (Tiger's connection string, ending `?sslmode=require`; not `DATABASE_URL`, which Replit uses for its own Postgres).
   **The Gemini key matters more than it did at 3 pm:** about 40 calls in 3 minutes on the free tier returned 429, and each question is 2 to 3 calls. A key from a project with billing enabled (PLAN.md section 8) removes that ceiling. If you stay on the free key, space rehearsal questions out and stop rehearsing a few minutes before each judge.
2. **Restart the laptop server** so it reads them: stop the `node server/index.js` on port 3000 and run `npm start`. The boot log must show `[stock] using TIGER_DATABASE_URL (…tsdb.cloud.timescale.com)` and no `ELEVENLABS_API_KEY not set` line.
3. **Load Tiger Data**: the two Docker `psql` commands in [db/README.md](../db/README.md) (schema, then seed). Check: the clerk's "about three days" now comes from the hypertable; the log no longer says `answering from the built-in seed`.
4. **Phone test on the laptop server** (`http://192.168.1.77:3000`, same Wi-Fi), the four steps of PLAN.md section 2: enter the bakery, hear the greeting in the ElevenLabs voice, ask for sourdough and croissants, hear both answers. Then Airplane mode: ask again, expect the canned answer in the plainer voice within ~2 s. The mic button appears only over https or localhost, so it will not show here; that is expected.
5. **Deploy on Replit**: [docs/deploy-replit.md](deploy-replit.md). Secrets: `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `TIGER_DATABASE_URL`. Reserved VM for the demo window if the plan allows; otherwise Autoscale and warm the link before each judge.
6. **Phone test on the public URL**, same four steps, plus the mic button (https): tap it, allow the prompt (an iPhone asks for microphone and speech recognition), say "do you have croissants"; the words should appear and send themselves when you stop (on an iPhone they may appear only at the end; if nothing sends, tap the red mic again). Then the check that matters: does the clerk's answer play at normal volume from the loudspeaker? iOS can leave audio on the earpiece after the microphone was used. Deny the permission once to see "Microphone blocked; type instead". Hold the phone sideways once. Try the paint store.
7. **Checkpoint 3**: tell Claude Code "run checkpoint 3 on <public URL>". It reviews the live app against section 2 and the Zero Data rule.
8. **Record the two-minute video** from [docs/drafts/pitch.md](drafts/pitch.md) while everything is green. Save the file where the submission form wants it.
9. **Submission draft**: paste [docs/drafts/submission.md](drafts/submission.md) into the form, add the live URL and the video, save as draft. Confirm the video length and host the form asks for.
10. `git tag demo-ok` once step 6 passes, so there is a known-good point.

## Sunday morning (6:00 to 8:30)

1. Re-run `db/seed.sql` against Tiger (the second Docker command in db/README.md) so "tomorrow" moves to Monday and the history ends today.
2. Warm the public link from the second device; ask one question so the first judge does not pay the cold start.
3. Rehearse the pitch out loud twice; the Q&A is at the bottom of pitch.md.
4. The top-right button mutes sound effects only; the clerk's voice cannot be muted from the page.
5. Submit by 8:30 am.

## If something breaks

| Symptom | Do |
|---|---|
| Clerk answers but no ElevenLabs voice | `ELEVENLABS_API_KEY` missing or out of credits; the browser voice reads the same words. Demo still passes steps 1, 3, 4 |
| Answers sound flat ("We're out of croissant right now. It's back Tuesday, October 13, and it usually takes about 3 days.") | The model failed or was rate-limited and the server answered from the stock record itself; log shows `clerk: templated reply, model unavailable`. Facts are right; check the Gemini key and quota when there is a pause |
| Every answer is the canned one ("Tuesday morning", from the page) | The server returned 502: model down AND no product matched, or the server is unreachable; log shows `clerk_unavailable`. Check the key and the server; the page keeps the demo alive |
| Log says `answering from the built-in seed` | Tiger not loaded or `TIGER_DATABASE_URL` missing; answers are still correct (same data) |
| Log says `TLS certificate not verified (SELF_SIGNED_CERT_IN_CHAIN); reconnecting` | Expected with this Tiger service: Node does not trust its certificate chain, the server reconnects without verification once per boot, and answers come from Tiger. Seen on the laptop at 12:05 am Sunday; harmless |
| Silent greeting on an iPhone | Volume and silent switch first; then the one-line kill switch for sound effects: `if (effectsOff) return;` → `return;` in `sfx` in public/index.html; the voice path is untouched by it |
| Page shows the old scene | Hard refresh; the page is cached by the browser |
| Need the previous page | `git checkout page-v1 -- public/index.html` (today's pre-design page) |

## Loose ends you may want to clean

- `public/vendor/` (untracked `three.module.js`, `GLTFLoader.js`) and the branch `visual/storefront-overhaul` were created by something outside this session at 1:49 pm. Nothing uses them. Delete if they are not yours.
- The design-port and polish worktrees were removed after their merges; the branches `design/aistudio-port` and `polish/venue-ready` remain locally and can be deleted (`git branch -d`) whenever you like.
