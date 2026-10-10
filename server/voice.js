// ElevenLabs text to speech for the clerk. Returns the mp3 as a base64 data URL, so no audio
// file is ever written, or null on any failure; the page then uses the browser's voice.
// Only the clerk's words come here, never the visitor's. Failures log the error type only.

const MODEL_ID = 'eleven_flash_v2_5';
const OUTPUT_FORMAT = 'mp3_44100_64';
// "George", the voice in ElevenLabs' current quickstart; ELEVENLABS_VOICE_ID overrides it.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const TIMEOUT_MS = 6_000;
// With less time than this left, a request would only spend credits on audio nobody hears.
const MIN_LEFT_MS = 1_000;
// Replies are one or two sentences; a runaway reply is not worth the credits.
const MAX_CHARS = 400;

function errorType(err) {
  if (!err || typeof err !== 'object') return 'Error';
  const code = err.statusCode ?? err.status ?? (typeof err.code === 'string' ? err.code : undefined);
  // ElevenLabs gives a short machine code such as quota_exceeded in the error body.
  const detail = err.body?.detail?.status ?? err.body?.detail?.code;
  const kind = typeof detail === 'string' && /^[a-z_]{1,40}$/.test(detail) ? ` ${detail}` : '';
  return `${err.name || 'Error'}${code === undefined ? '' : ` ${code}`}${kind}`;
}

// The SDK takes about 2 s to import and blocks the event loop while it does. index.js calls
// warmUpVoice shortly after listening, so /health is answered first and the first greeting or
// question does not pay the load; if it has not run yet, the first call loads it.
let sdk;
function loadSdk() {
  sdk ??= import('@elevenlabs/elevenlabs-js').catch((err) => {
    sdk = undefined;
    throw err;
  });
  return sdk;
}

export function warmUpVoice() {
  if (process.env.ELEVENLABS_API_KEY) loadSdk().catch(() => {});
}

let client;

// timeoutMs runs from the moment the caller hands the text over, loading the SDK included.
export async function textToSpeech(text, { timeoutMs = TIMEOUT_MS } = {}) {
  const deadline = performance.now() + timeoutMs;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || typeof text !== 'string' || !text.trim()) return null;
  if (text.length > MAX_CHARS) {
    console.warn('voice: skipped, reply too long');
    return null;
  }
  try {
    if (!client) {
      const { ElevenLabsClient } = await loadSdk();
      client ??= new ElevenLabsClient({ apiKey });
    }
    // Measured by the clock, not by a timer: a blocking SDK load delays timers.
    const left = Math.floor(deadline - performance.now());
    if (left < MIN_LEFT_MS) {
      console.warn('voice: skipped, no time left');
      return null;
    }
    // The signal also bounds reading the audio stream, not just the response headers.
    const audio = await client.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
      { text, modelId: MODEL_ID, outputFormat: OUTPUT_FORMAT },
      { abortSignal: AbortSignal.timeout(left), maxRetries: 1 },
    );
    const chunks = [];
    for await (const chunk of audio) chunks.push(chunk);
    const mp3 = Buffer.concat(chunks);
    if (mp3.length === 0) {
      console.warn('voice: empty audio');
      return null;
    }
    return `data:audio/mpeg;base64,${mp3.toString('base64')}`;
  } catch (err) {
    console.warn(`voice: ${errorType(err)}`);
    return null;
  }
}
