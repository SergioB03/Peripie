// ElevenLabs text to speech for the clerk. Returns the mp3 as a base64 data URL, so no audio
// file is ever written, or null on any failure; the page then uses the browser's voice.
// Only the clerk's words come here, never the visitor's. Failures log the error type only.
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const MODEL_ID = 'eleven_flash_v2_5';
const OUTPUT_FORMAT = 'mp3_44100_64';
// "George", the voice in ElevenLabs' current quickstart; ELEVENLABS_VOICE_ID overrides it.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const TIMEOUT_MS = 6_000;
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

let client;

export async function textToSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || typeof text !== 'string' || !text.trim()) return null;
  if (text.length > MAX_CHARS) {
    console.warn('voice: skipped, reply too long');
    return null;
  }
  client ??= new ElevenLabsClient({ apiKey });
  try {
    // The signal also bounds reading the audio stream, not just the response headers.
    const audio = await client.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
      { text, modelId: MODEL_ID, outputFormat: OUTPUT_FORMAT },
      { abortSignal: AbortSignal.timeout(TIMEOUT_MS), maxRetries: 1 },
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
