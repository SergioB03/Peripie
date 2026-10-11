# Peripie Pitch Script

## 0:00 – The Problem
I run a painting company. My customers call to ask one thing: do you have it? And some days I'm the customer who won't ask. I'll take a drive-through over a counter, a website can't answer, and the phone call is the thing I'm avoiding. The virtual-store platforms that exist sell to large brands, not to shops like mine. This answers that one question, at the door, for both of us.

## 0:20 – The Demo
Let's open the bakery. As soon as I tap "Enter," the camera moves through the door and the clerk greets me out loud. I ask for sourdough. In stock. Now, I ask for croissants. We are out of them right now. They will be back Tuesday. The clerk adds that they usually come back within three days. That number isn't a guess; it comes directly from the restock history in the database.

## 1:05 – The Versatility
Now, let's switch to the paint store. Same code, different shop: a different inventory, a different clerk, not a line of server code changed. And a third agent: ask which primer to use in a bathroom, and the support agent gives you the tip before the stock room gives you the count.

## 1:20 – How It Works
It works because we use three specific tools. Gemini runs the clerk and decides exactly when to call the stock tool. Tiger Data holds the inventory and the restock history as a time series, so we can calculate typical wait times. ElevenLabs gives the clerk a natural voice. And critically, nothing about the visitor is stored anywhere on our servers.

## 1:40 – The Future
What's next is the sandbox builder. Each shop is one settings file. The builder we're making next lets an owner edit that file by dragging things around. The business model is simple: a free shop with one clerk, and paid add-on agents.

## If asked

**Why not a chatbot on the website?**
A chatbot answers in text from whatever it was told. This one walks you in, talks, and only answers after checking with the stock room, so the answer comes from the database, not from the model's guess.

**Why a 3D shop and not a text box?**
Because you watch the clerk turn to the stock room before answering. For someone who would rather not ask in person, an answer they can see being checked is one they can trust, from wherever they are.

**What happens if the network fails at the venue?**
The page falls back to its canned answers and uses the browser's built-in voice, so the demo survives an API failure or a dropped connection once the page is open.

**What is stored about the visitor?**
Nothing; we strictly follow the Zero Data rule, meaning no accounts, cookies, analytics, or local storage of anything about the visitor.

**Why Tiger Data and not a plain table?**
We use Tiger Data because its time-series features allow us to compute typical restock days from historical gaps, which a plain table cannot do efficiently.

**What would the builder cost to build?**
It is pitched as a future product rather than built this weekend because developing a drag-and-drop builder is a significant project in itself that would distract from the core demo.
