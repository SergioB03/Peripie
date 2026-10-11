// Peripie server: serves the shop page and answers POST /api/clerk (contract: PLAN.md section 3).
// Zero Data: the visitor's text, a list's items, the clerk's reply and request bodies are never
// logged or stored.
// Logs carry method, path, status and milliseconds, plus error types.
import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { SHOPS } from './shops.js';
import { synthesize, textToSpeech } from './voice.js';

const MAX_TEXT = 300;
// A list request (PLAN.md section 3): 1 to 12 items, each 1 to 60 characters after trimming.
const MAX_ITEMS = 12;
const MAX_ITEM_CHARS = 60;
// Timing (PLAN.md section 3): the page waits 15 s and clerk.js gives Gemini 10 s, so a reply's
// audio gets only the time left before 12.5 s after the request arrived. Without time for
// audio the reply goes out with audioUrl null and the page speaks it in the browser's voice.
const RESPONSE_BUDGET_MS = 12_500;
const MIN_AUDIO_MS = 1_500;
const MAX_AUDIO_MS = 6_000;
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
// Files under /vendor carry their library version in the path, so browsers may keep them a year.
const vendorDir = fileURLToPath(new URL('../public/vendor/', import.meta.url));

function errorType(err) {
  if (!err || typeof err !== 'object') return 'Error';
  const code = err.status ?? err.statusCode ?? (typeof err.code === 'string' ? err.code : undefined);
  return code === undefined ? err.name || 'Error' : `${err.name || 'Error'} ${code}`;
}

// clerk.js (and through it stock.js and the database) is imported after the server is
// listening, so the health check answers even when the database is slow or down.
let clerkModule;
function loadClerk() {
  clerkModule ??= import('./clerk.js').catch((err) => {
    clerkModule = undefined;
    console.error(`clerk module failed to load: ${errorType(err)}`);
    throw err;
  });
  return clerkModule;
}

const greetingText = (shop) => `Welcome to ${shop.name}. How can I help you today?`;

// A list request's items, trimmed, with runs of spaces or line breaks made one space; null if
// the list breaks the contract.
function listItems(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS) return null;
  const items = [];
  for (const raw of value) {
    if (typeof raw !== 'string') return null;
    const item = raw.trim();
    if (item.length < 1 || item.length > MAX_ITEM_CHARS) return null;
    items.push(item.replace(/\s+/g, ' '));
  }
  return items;
}

// The reply's audio, or null: ElevenLabs gets the time left before 12.5 s after the request
// arrived (at least 1.5 s, at most 6 s).
async function replyAudio(reply, started) {
  const audioMs = Math.floor(Math.min(MAX_AUDIO_MS, RESPONSE_BUDGET_MS - (performance.now() - started)));
  if (audioMs >= MIN_AUDIO_MS) return textToSpeech(reply, { timeoutMs: audioMs });
  console.warn(`voice: no time left (${audioMs} ms)`);
  return null;
}

// Greeting audio per shop, kept in memory to save ElevenLabs credits. The map holds the promise
// of { url, reason }, so a greeting asked for while the boot warm-up is voicing that shop waits
// for the same call. A failed attempt is dropped so the next visit tries again.
const greetings = new Map();
function greetingAudio(shopId, text) {
  let audio = greetings.get(shopId);
  if (!audio) {
    audio = synthesize(text)
      .catch((err) => ({ url: null, reason: err?.name || 'Error' }))
      .then((result) => {
        if (!result.url) greetings.delete(shopId);
        return result;
      });
    greetings.set(shopId, audio);
  }
  return audio;
}

// After a restart, voice the three greetings one after another, so the first visitor hears
// the ElevenLabs voice at the door. These are network calls; nothing waits on them.
async function warmGreetings() {
  let warmed = 0;
  for (const [id, shop] of SHOPS) {
    const { url, reason } = await greetingAudio(id, greetingText(shop));
    if (url) warmed += 1;
    else console.warn(`voice: warm-up ${id} failed (${reason})`);
  }
  console.log(`voice: greetings warmed (${warmed}/${SHOPS.size})`);
}

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  const start = performance.now();
  // Read now: a mounted middleware (the /vendor static) strips its prefix from req.path.
  const path = req.path;
  res.on('close', () => {
    const ms = Math.round(performance.now() - start);
    const aborted = res.writableFinished ? '' : ' aborted';
    console.log(`${req.method} ${path} ${res.statusCode} ${ms}ms${aborted}`);
  });
  next();
});

// gzip (or brotli) for the page, the vendored Three.js and the clerk's JSON; bodies under 1 kb
// go out as they are.
app.use(compression());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/clerk', express.json({ limit: '4kb' }), async (req, res) => {
  const started = performance.now();
  res.set('Cache-Control', 'no-store');
  const body = req.body ?? {};

  const settings = typeof body.shop === 'string' ? SHOPS.get(body.shop) : undefined;
  if (!settings) return res.status(400).json({ error: 'bad_shop' });
  const shop = { id: body.shop, ...settings }; // { id, name, staff }

  if (body.greet === true) {
    const reply = greetingText(shop);
    const { url, reason } = await greetingAudio(shop.id, reply);
    if (!url) console.warn(`voice: ${reason}`);
    return res.json({ reply, audioUrl: url, stock: null });
  }

  // A list: { shop, items }. A body with both items and text is neither request.
  if (body.items !== undefined) {
    const items = body.text === undefined ? listItems(body.items) : null;
    if (!items) return res.status(400).json({ error: 'bad_items' });
    let list;
    try {
      const { askList } = await loadClerk();
      list = await askList(shop, items);
    } catch (err) {
      // Not reached in practice: check_stock answers from the built-in seed when the database fails.
      console.warn(`clerk_unavailable: list ${errorType(err)}`);
      return res.status(502).json({ error: 'clerk_unavailable' });
    }
    const audioUrl = await replyAudio(list.reply, started);
    return res.json({ reply: list.reply, audioUrl, stock: list.stock, stocks: list.stocks });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 1 || text.length > MAX_TEXT) return res.status(400).json({ error: 'bad_text' });

  let answer;
  try {
    const { askClerk } = await loadClerk();
    answer = await askClerk(shop, text);
  } catch (err) {
    console.warn(`clerk_unavailable: ${errorType(err)}`);
    return res.status(502).json({ error: 'clerk_unavailable' });
  }

  const audioUrl = await replyAudio(answer.reply, started);
  res.json({ reply: answer.reply, audioUrl, stock: answer.stock ?? null });
});

app.use('/vendor', express.static(vendorDir, { maxAge: '1y', immutable: true }));
app.use(express.static(publicDir));

// Every error ends here and is answered without its message: Express's default handler would
// print the message, and a JSON parse error quotes the request body.
app.use((err, req, res, _next) => {
  if (res.headersSent) return res.destroy();
  const status = Number(err?.status ?? err?.statusCode) || 500;
  if (req.path === '/api/clerk' && status >= 400 && status < 500) {
    // The body could not be read. Only the text field can push a valid request past 4 kb (a
    // valid list stays under about 2.5 kb unless its items are sent as escape sequences); any
    // other unreadable body has no readable shop.
    return res.status(400).json({ error: err.type === 'entity.too.large' ? 'bad_text' : 'bad_shop' });
  }
  if (status >= 500) console.error(`error: ${errorType(err)}`);
  res.status(status >= 400 && status < 600 ? status : 500).end();
});

process.on('unhandledRejection', (err) => {
  console.error(`unhandledRejection: ${errorType(err)}`);
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error(`listen failed: ${errorType(err)}`);
    process.exit(1);
  }
  console.log(`Peripie listening on 0.0.0.0:${port}`);
  if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY not set: questions about a stocked product get the templated reply, others 502; lists get the templated summary');
  if (!process.env.ELEVENLABS_API_KEY) console.warn('ELEVENLABS_API_KEY not set: audioUrl is null');
  loadClerk().catch(() => {});
  if (process.env.ELEVENLABS_API_KEY) setTimeout(() => warmGreetings().catch(() => {}), 1_000);
});
