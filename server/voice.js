// ElevenLabs text to speech for the clerk, called with a plain fetch: the SDK's import (about
// 72 MB, 23k files) blocked the event loop for seconds. Returns the mp3 as a base64 data URL, so
// no audio file is ever written, or null on any failure; the page then uses the browser's voice.
// Only the clerk's words come here, never the visitor's. Failures are reported as a status, an
// ElevenLabs error code or an error name only.
//
// The request, per the API reference (POST /v1/text-to-speech/{voice_id}):
//   POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_64
//   xi-api-key: <key>, Content-Type: application/json
//   { "text": "...", "model_id": "eleven_flash_v2_5" }

const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_flash_v2_5';
const OUTPUT_FORMAT = 'mp3_44100_64';
// "George", the voice in ElevenLabs' current quickstart; ELEVENLABS_VOICE_ID overrides it.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const TIMEOUT_MS = 6_000;
// Replies are one or two sentences; a runaway reply is not worth the credits.
const MAX_CHARS = 400;

// The short machine code ElevenLabs puts in an error body (e.g. invalid_api_key,
// quota_exceeded), never its message.
async function errorCode(res) {
  try {
    const detail = (await res.json())?.detail;
    const code = detail?.status ?? detail?.code;
    return typeof code === 'string' && /^[a-z_]{1,40}$/.test(code) ? ` ${code}` : '';
  } catch {
    return '';
  }
}

// { url, reason }: the data URL, or null and a short reason for the log (a status, a code or an
// error name, never the text). timeoutMs bounds the whole call, reading the audio included.
export async function synthesize(text, { timeoutMs = TIMEOUT_MS } = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { url: null, reason: 'not configured' };
  if (typeof text !== 'string' || !text.trim()) return { url: null, reason: 'nothing to say' };
  if (text.length > MAX_CHARS) return { url: null, reason: 'skipped, reply too long' };
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('voice deadline', 'TimeoutError')), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL_ID }),
      signal: controller.signal,
    });
    if (!res.ok) return { url: null, reason: `HTTP ${res.status}${await errorCode(res)}` };
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('audio/')) return { url: null, reason: 'response is not audio' };
    const mp3 = Buffer.from(await res.arrayBuffer());
    if (mp3.length === 0) return { url: null, reason: 'empty audio' };
    return { url: `data:audio/mpeg;base64,${mp3.toString('base64')}`, reason: null };
  } catch (err) {
    if (controller.signal.aborted) {
      return { url: null, reason: `timed out after ${Math.round(performance.now() - started)} ms` };
    }
    return { url: null, reason: `${err?.name || 'Error'}${err?.cause?.code ? ` ${err.cause.code}` : ''}` };
  } finally {
    clearTimeout(timer);
  }
}

// The data URL or null. Every null is logged with its reason, so the console explains each
// fall back to the browser's voice.
export async function textToSpeech(text, options) {
  const { url, reason } = await synthesize(text, options);
  if (!url) console.warn(`voice: ${reason}`);
  return url;
}
