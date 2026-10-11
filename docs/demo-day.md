# Demo day: Sunday Oct 11, 9:00 am

Read at 6 am. Live: https://peripie.replit.app, which opens on the bakery; start there.

## Twenty judge questions

**1. Why not a chatbot?**
A chatbot answers from whatever it was told. This clerk cannot answer until it has asked the stock room, and you watch that happen.

**2. Who is it for?**
Small local shops, which Obsess and Emperia do not serve; I run one. And the customer who would rather not ask at a counter, which some days is me.

**3. Is the stock real?**
A real Postgres database on Tiger Data, 27 products, nine per shop, each with its restock rule, aliases and a price, and sixty days of shelf counts, queried on every question. The numbers are seeded for the demo.

**4. How do you stop the clerk guessing?**
The first Gemini round is forced to call check_stock, so even "ignore your instructions" gets a lookup first. Node computes the restock time, "in about 18 minutes" or "Friday, October 16"; the model never does clock or date math.

**5. Where does "usually about 4.5 days" come from?**
A LAG window over sixty days of stock_events finds each empty spell; the average spell is the typical restock time. The paint rollers show it: out five days once, four once, so 4.5, next to the truck's Friday. The bakery's trays get an oven time instead, so the clerk leaves the number out there.

**6. Why Tiger and not a plain table?**
Restock history is time-series data, a reading every six hours per product, and a hypertable is built for that. It is still Postgres, so other tools can write to it.

**7. Is the stock agent really an agent?**
Honestly, the clerk is the model and the stock agent is plain SQL; the hand-off is a tool call the clerk cannot skip. A database question deserves a database answer.

**8. What does each service receive?**
Gemini gets the visitor's words, ElevenLabs only the reply, the database only the shop id, and the mic's audio goes to Google or Apple, never us. Gemini's free tier may use the question and ElevenLabs keeps replies; both disclosed.

**9. What do you store about me?**
Nothing: no account, no cookie of ours, no local storage, no analytics, no third-party script; the log holds method, path, status and milliseconds, never the question. Replit's GAESA routing cookie carries no identity.

**10. What if the Wi-Fi or an API fails?**
If the model fails but the lookup found the product, the server answers from the record, still voiced. If the server is unreachable, the page uses its printed list and the browser's voice, and says so.

**11. What if two visitors ask at once?**
Each question is an independent request, so they run in parallel. The ceiling is Gemini's free tier, about six questions a minute; past that the clerk answers from the stock record.

**12. What does it cost to run?**
Free tiers for model, voice and database, plus a Replit machine at about two cents an hour. The voice is the main per-question cost, so greetings are cached.

**13. Why Gemini, and which model?**
Function calling that can force the tool; gemini-3.5-flash-lite answers in about a second with correct facts. gemini-3.8-flash gave 503s and a 429 on our key, so it is the fallback.

**14. Why ElevenLabs, and why not its SDK?**
The voice is the product; the mp3 comes back inside the JSON, so no file is written. The SDK's 72 MB import froze a cold start for up to 48 seconds; one plain fetch sends the same request.

**15. Why Replit?**
A public HTTPS URL with a secrets screen in minutes, and it is in the prize table. Plain Express on PORT would run anywhere; analytics is off, so the host injects no script.

**16. How does an owner update stock?**
Today a seed script writes the two tables; no owner screen yet. The clerk queries on every question, so any write to those tables shows in the next answer.

**17. Business model, and what is next?**
A free shop with one clerk and paid add-on agents, like the paint store's support agent. Next, the sandbox builder: each shop is already one settings file (tap the Peripie card), edited by dragging.

**18. How did one person build this in a weekend?**
A plan with a fixed API contract, Claude Code agents building against it, a reviewer agent at checkpoints, Ollama for drafts. Hardest: model outages, which forced the fallback chain and timing budget, and iOS audio.

**19. Accessibility features, and why not saved?**
Captions, larger text, high contrast and reduce motion, seeded from the phone's settings, plus Describe this view, Re-centre and Replay. They live in memory for the visit; saving them would break Zero Data.

**20. What is "My list"?** (if the list feature shipped)
Write your list before you go in, press Check my list, and the clerk checks every item with the stock room in one request; Take this with you hands you the text, nothing stored. If it did not ship: "That is next; today you ask one item at a time."

## Ten failure drills

1. **Silent greeting.** Volume, the silent switch, or audio never unlocked because the walk-in did not start from a tap. Volume up, tap Replay. Say: "Loud room, let me have the clerk say that again."
2. **Flat answer** ("We're out of croissant right now. The next tray of croissants comes out of the oven in about 18 minutes.", with the product in the singular; at the paint store "We're out of roller right now. Our supplier's truck comes Friday, October 16. It usually takes about 5 days."). Both model attempts failed (429, 503 or a hang); the server composed it from the stock record. Nothing to fix; space the next question. Say: "The clerk is being brief; that time is straight from the database."
3. **Canned answer** ("Good news, sourdough is in stock") with the italic "printed list" line. A 502 (model down, no product matched) or no answer at all. Ask by product name; if it persists, check signal and reload. Say: "That is the printed list at the counter; the page works without the network."
4. **"We don't carry that."** The judge asked for cookies or pizza: nine products per shop, matched by name and alias ("bread" finds the sourdough), but not everything; and each question stands alone, so a bare follow-up fails too. Point at the What we carry board or a chip. Say: "Nine products per shop this weekend; the board shows four, ask for the rest by name."
5. **No walk-in, a cut to the counter, captions on.** The phone's Reduce Motion is on and the page follows it. Accessibility button, top right: Reduce motion off; Leave and enter again. Say: "The page follows the phone's motion setting; let me turn that off."
6. **The sound button does not mute the clerk.** It mutes footsteps, chime and rustle only; the voice always plays. Use the phone's volume. Say: "That button is the sound effects; the clerk's voice is the product."
7. **A tap on the storefront does nothing, or the view turns.** Only the "Tap here to walk in" pill and the Enter shop button walk in; the rest is a drag to look around. Tap Enter shop. Say: "Two ways in: the doors or the Enter button."
8. **Slow first open, greeting in the plain voice.** Cold start: on Autoscale the app sleeps after fifteen idle minutes and voices greetings only after boot. Ask the first question; it comes back in the real voice. Say: "First visitor of the morning wakes the shop."
9. **Mic trouble:** "Microphone blocked", words that do not send, or a quiet answer. Permission denied; iPhones deliver words only at the end; iOS can switch to the earpiece after the mic. Tap the red mic again, or type; volume up. Say: "Typing works too."
10. **Flat or canned answers after rehearsing.** The free key allows about six questions a minute, two model calls each, three with the support agent. Pause a minute; the facts stay right. Say: "Busy counter this morning; the stock room still has the answer."

## Pitch timing

| Beat | Words | At 140 wpm | Slot |
|---|---|---|---|
| Problem | 73 | 31 s | 20 s |
| Demo | 72 | 31 s; about 50 s live | 45 s |
| Versatility | 52 | 22 s; plus about 25 s for the shop switch | 15 s |
| How it works | 60 | 26 s | 20 s |
| Future | 43 | 18 s | 20 s |

Live means the greeting and the answers, which you cannot talk over. Spoken alone it is 300 words, 2:09; with the waits, near three minutes. Rehearse with these cuts made, and cut in this order if a judge interrupts:

1. The third-agent sentence ("And a third agent: ask which primer..."), 12 s plus a 10 s answer. Instead, from the street: Leave, tap Southside Paint Supply, the sign changes, "same code, different shop".
2. The drive-through sentence ("I'll take a drive-through over a counter..."), 9 s.
3. The platforms sentence ("The virtual-store platforms that exist..."), 6 s; it is answer 2 if asked.

For the Future beat, tap the Peripie card: the settings drawer shows the shop's file with the builder line under it.

## Taglines

1. Walk into a small shop's website and ask the clerk.
2. A counter you can walk up to from wherever you are.
3. Do you have it? The clerk checks the stock room before answering.

## First-visit card

A counter you can walk up to from anywhere.
Ask for a product; the clerk checks the stock room before answering.
No account. Nothing stored.

## The 6 am checklist

1. Phone: volume up, silent switch off, Do Not Disturb on, auto-lock off, Reduce Motion off (Settings > Accessibility > Motion), charger packed.
2. Re-run db/seed.sql on Tiger (second Docker command in db/README.md) if it was not loaded today: the dated items (sourdough's "tomorrow", the cake's two days, the Friday and Saturday deliveries that have no rule) and the end of the count history follow the day it runs; the oven times come from the clock either way. Tiger does not reseed itself.
3. Replit Publishing > Logs: `using TIGER_DATABASE_URL`, `greetings warmed (3/3)`; Adjust settings says Reserved VM, else warm before each judge. Never open the Agent pane or Republish.
4. Second device: enter the bakery, ask for sourdough; expect the ElevenLabs voice and the Stock room line.
5. Demo phone: reload once, enter the bakery, hear the greeting, ask croissants, expect the next tray: "in about N minutes" (the oven runs every 20 minutes from 7 am to 5 pm; more than 90 minutes before the first tray it reads "today at 7 am"); mic once, loudspeaker check after; Leave shop.
6. Rehearse twice, out loud, cuts made; questions fifteen seconds apart on the free key.
7. Stop rehearsing five minutes before the judges; warm the link again.
8. Bakery first; switch shops only at the paint beat.
9. Second device stays open at the bakery counter as the backup.
10. Submit on Devpost by 8:30: live URL, video, the saved draft.
