## Tagline
Peripie: A virtual storefront for small local shops that answers inventory questions by voice.

## Elevator pitch
We are building a website where you walk into a shop and speak to a clerk who checks real-time stock levels. The clerk uses an AI agent to query our database and speaks the answer aloud using ElevenLabs. We target small business owners ignored by big platforms, offering a simple tool that handles customer questions about availability and restock dates without collecting any user data.

## About the project
### Inspiration
I run a small painting company, and I get tired of customers calling to ask if we have specific colors or primers. Existing virtual store platforms like Obsess and Emperia are built for large brands with complex supply chains; they don't serve us. We need a solution that fits in a small shop's pocket: something that listens at the door and answers questions immediately without needing a login or a backend server we can't afford to maintain.

### What it does
Peripie lets you walk into a virtual storefront, hear a clerk greet you, and ask for a product by typing or speaking. The clerk checks our database using an AI agent, determines if the item is in stock, and speaks the answer aloud. If an item is out of stock, the clerk tells you exactly when it will be back based on historical restock data. The system works entirely without storing your personal information or requiring an account.

### How we built it
We used Replit to host our Node.js server, which connects to a Tiger Data PostgreSQL database for inventory management. Our frontend is built with Three.js to create the 3D walk-in experience. For the brain of the operation, we use the Gemini API to power the clerk's decision-making and tool calling capabilities. We leverage ElevenLabs to convert the clerk's text responses into natural-sounding audio. The entire stack runs on a single endpoint that handles both greetings and product queries.

### Challenges we ran into
- TODO: Handling network timeouts during the cold start of the Replit server.
- TODO: Ensuring the AI agent correctly parses user intent to distinguish between greetings and product questions.
- TODO: Optimizing ElevenLabs audio generation to stay within free tier limits while maintaining quality.

### Accomplishments that we're proud of
- TODO: Successfully implementing a "Zero Data" architecture where no visitor text is stored or logged.
- TODO: Creating a seamless handoff between the visual 3D environment and the voice response system.
- TODO: Building a database schema that tracks restock history to provide accurate future dates for out-of-stock items.

### What we learned
- TODO: The importance of robust fallback mechanisms (canned answers) when external APIs fail.
- TODO: How to structure prompts so an AI agent knows exactly when to call a stock-checking tool versus answering directly.
- TODO: That small, specific use cases often solve problems better than generic, large-scale platforms.

### What's next for Peripie
Our immediate goal is to launch the sandbox builder, which allows shop owners to assemble their own storefront by dragging and dropping elements and staff them with custom agents. We plan to add a photo upload feature so owners can replace our default 3D models with photos of their actual storefront walls. Eventually, we want to integrate a checkout system so customers can order out-of-stock items for delivery, turning the clerk into a full sales assistant running on the shop's own hardware.

## Built with
JavaScript, Node.js, Express, Three.js, Gemini API, ElevenLabs, Tiger Data (PostgreSQL), Replit

## Prizes and tracks entered
| Entry | What earns it |
|---|---|
| AI/ML track | Two agents with a visible hand-off that take a real task off a shop owner's plate. |
| Replit "Small Business" challenge | A working, creative small business app hosted on Replit. |
| Best Use of ElevenLabs | The clerk's voice is the product, delivering natural-sounding responses to customer questions. |
| Best Use of Gemini API | Gemini runs the clerk and decides when to call the stock tool based on user input. |
| Best Use of Tiger Data | Restock history as time-series data is used in the clerk's answers to predict return dates. |
| Zero Data challenge | No accounts, tracking, profiles, or stored personal info; visitor text is not logged. |
| GoDaddy Registry | A good domain name relevant to the project. |
