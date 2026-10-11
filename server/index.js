// Peripie server: serves the shop page and answers POST /api/clerk (contract: PLAN.md section 3).
// Zero Data: the visitor's text, the clerk's reply and request bodies are never logged or stored.
// Logs carry method, path, status and milliseconds, plus error types.
import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { SHOPS } from './shops.js';
import { textToSpeech } from './voice.js';

const MAX_TEXT = 300;
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

// Greeting audio per shop, kept in memory to save ElevenLabs credits. A failed attempt is
// dropped so the next visit tries again.
const greetings = new Map();
function greetingAudio(shopId, text) {
  let audio = greetings.get(shopId);
  if (!audio) {
    audio = textToSpeech(text)
      .catch(() => null)
      .then((url) => {
        if (!url) greetings.delete(shopId);
        return url;
      });
    greetings.set(shopId, audio);
  }
  return audio;
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
    const reply = `Welcome to ${shop.name}. How can I help you today?`;
    const audioUrl = await greetingAudio(shop.id, reply);
    return res.json({ reply, audioUrl, stock: null });
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

  const audioMs = Math.floor(Math.min(MAX_AUDIO_MS, RESPONSE_BUDGET_MS - (performance.now() - started)));
  const audioUrl = audioMs >= MIN_AUDIO_MS ? await textToSpeech(answer.reply, { timeoutMs: audioMs }) : null;
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
    // The body could not be read. Only the text field can push a valid request past 4 kb;
    // any other unreadable body has no readable shop.
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
  if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY not set: questions about a stocked product get the templated reply, others 502');
  if (!process.env.ELEVENLABS_API_KEY) console.warn('ELEVENLABS_API_KEY not set: audioUrl is null');
  loadClerk().catch(() => {});
});
