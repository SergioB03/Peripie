# docs/drafts/demo-day-draft.md

## Twenty judge questions, one answer each

**Why this and not a chatbot on the website?**
Existing virtual-store platforms sell to large brands with huge catalogs; nobody serves small local shops like mine. Peripie is a counter you can walk up to from wherever you are, so it answers that question without hiring more staff or buying expensive software.

**Who is this for besides small shop owners?**
It is for anyone the standard shop website leaves out: people with disabilities who need captions and high contrast, and those with social anxiety who would rather not ask in person at a counter. It also serves customers with large orders who do not want to wait on hold or drive by if the item isn't there.

**What happens if the Wi-Fi or an API fails?**
The page still works because it falls back to canned answers and the browser's own voice, so the demo survives a network failure or rate limit without losing the core steps.

**What is stored about the visitor?**
Nothing about the visitor is collected or stored: no accounts, no cookies set by us, no analytics, no local storage, and the page loads no third-party scripts. The server logs method, path, status and milliseconds, never the question or the reply.

**What does each outside service receive?**
The visitor's words go to Gemini to answer the question; the clerk's reply text goes to ElevenLabs for the voice; if the visitor uses the microphone button, the browser sends audio to Google or Apple for transcription, and only the returned words reach the page.

**Why Gemini?**
Gemini runs the clerk persona and decides when to call the stock tool; we use `gemini-3.5-flash-lite` because it answers questions in under two seconds while staying within the demo's timing budget.

**How is the clerk kept from guessing stock?**
The first model round is forced to call the `check_stock` tool via `functionCallingConfig.mode = ANY`, so the model cannot answer a product question from memory and must verify inventory with the database first.

**Why Tiger Data?**
Tiger Data is Postgres with a hypertable for time-series data; it stores 60 days of shelf counts per product, allowing us to compute "usually back in about three days" from historical restock gaps instead of guessing.

**What is "usually back in about three days"?**
That number is computed at lookup time by averaging the gap in days from the first zero inventory count to a positive one, derived from `LAG` over the `stock_events` history.

**Why ElevenLabs?**
ElevenLabs provides the clerk's voice as the product; replies come back as an mp3 data URL inside the JSON, and the greeting is voiced once per shop and cached in memory to protect the credit budget.

**Why are accessibility features kept in memory only?**
Preferences like captions, larger text, and high contrast are kept in memory for the visit only so they do not violate the Zero Data rule or persist cookies about the visitor.

**What is the list feature?**
The page allows you to prepare a whole list of products in private, check them all at once against stock, and take the answers with you without needing to ask one by one.

**What is the sandbox builder?**
The sandbox builder lets an owner assemble their own shop from ready-made elements and staff it with agents; it is pitched as a product where each shop is one settings file that can be edited by dragging things around.

**What is the business model?**
It is a free shop with one clerk, and paid add-on agents; owners upload their storefront photo for the sign and walls, then run the clerk on the shop's own hardware later.

**Why Replit hosting?**
Replit hosts the Node + Express server and the page; it maps port 3000 to 80 and allows us to deploy a working, creative small business app quickly without managing infrastructure.

**How long did it take and what was hardest?**
It took about two days of focused work; the hardest part was forcing the tool call on the first model round and ensuring the fallback logic worked so the demo never broke under pressure.

**What would you do next week?**
Next week we would build the sandbox builder interface, add a photo of the real storefront for the sign and walls, implement checkout, and allow the clerk to run on the shop's own hardware.

**How would a shop owner keep stock up to date?**
An owner updates stock via a simple settings file or a future drag-and-drop builder; currently, they can manually edit the seed data or use a webhook to push inventory changes to the database.

**What does a competitor like Obsess do differently?**
Obsess and Emperia sell to large brands with huge catalogs; they do not serve small local shops that need a simple voice interface for a single product question.

## Ten ways the demo fails on stage, and the recovery

1. **Symptom:** Silent phone. **Cause:** Volume muted or earpiece routing after using the mic. **Recovery:** Tap the top-right button to mute sound effects only; ensure the silent switch is off and hold the phone sideways once to force loudspeaker output.
2. **Symptom:** Flat templated answer instead of model wording. **Cause:** Model failed or rate-limited, server answered from stock record. **Recovery:** Log shows `clerk: templated reply, model unavailable`; facts are right, so continue the demo and note that the fallback works as intended.
3. **Symptom:** Canned answer from the printed list. **Cause:** Server returned 502 because model down AND no product matched. **Recovery:** Check the Gemini key and quota; if paused, switch to Airplane mode to test the canned branch and return.
4. **Symptom:** Slow first load. **Cause:** Cold start plus TLS handshake to Tiger Data. **Recovery:** Warm the link from a second device before each judge so the first hit is fast.
5. **Symptom:** Wrong shop entered by a stray tap. **Cause:** Visitor tapped the wrong storefront thumbnail. **Recovery:** Hard refresh the page or re-enter the correct shop; the walk-in animation resets cleanly.
6. **Symptom:** Rate limits from asking too fast. **Cause:** Free-tier Gemini returns 429 after about 40 calls in 3 minutes. **Recovery:** Space rehearsal questions out and stop rehearsing a few minutes before each judge; switch to `gemini-3.8-flash` fallback if needed.
7. **Symptom:** Frozen walk-in. **Cause:** Browser cache showing old scene or Three.js hang. **Recovery:** Hard refresh the page; the branch `page-v1` exists for rollback if necessary.
8. **Symptom:** Microphone permission denied. **Cause:** iOS asks for microphone and speech recognition; user denies it. **Recovery:** Tap "Deny" once to see the fallback type input; the mic button is optional, so proceed with typing.
9. **Symptom:** Venue network drops mid-demo. **Cause:** Wi-Fi instability at the venue. **Recovery:** The page falls back to canned answers and browser voice immediately; continue answering questions without interruption.
10. **Symptom:** Judge asks for something the shop does not carry. **Cause:** Product not in inventory or seed data. **Recovery:** Clerk answers from the stock record that it is out of stock and provides a restock date, even if the item is fictional; this demonstrates the tool logic.

## Three Devpost taglines

1. Walk into a small shop's website and ask the clerk.
2. A voice agent that checks live stock for local businesses.
3. Zero data stored: just you, the shop, and the answer.

## Four options for a first-visit card on the street

**Option 1**
Walk into our virtual storefront from anywhere.
Ask the clerk if we have your product by typing or speaking.
Nothing about you is stored; we only answer your question.

**Option 2**
Small shops deserve a simple way to answer inventory questions.
We are out of stock? We tell you when it comes back.
No accounts, no tracking, just a trustworthy counter voice.

**Option 3**
Avoid the phone call: ask the clerk from your couch.
See the work being done as we check our shelves live.
Built for local shops and customers who prefer not to wait on hold.

**Option 4**
A counter you can walk up to from wherever you are.
The clerk visibly turns to the stock room before answering.
Trust the answer because you see the data behind it.
