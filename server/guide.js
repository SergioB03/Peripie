// The guide: the second voice of the hands-free visit (Sergio, Oct 11: "a guided voice that
// you talk to besides the agent"). The page hears the visitor's command, acts on it (walks
// into a shop, flips a switch in the accessibility bar, reads the view) and asks this module
// for the words the guide says about it; a question about the shelves goes to the clerk
// instead, never here. Fixed phrases are keyed by id, voiced once (at boot, in the background,
// after the greetings) and served from memory; a dynamic line (the Describe-this-view text, a
// list confirmation, up to 160 characters) is voiced live under a 4 s deadline, never cached,
// never logged, and limited to 20 a minute for the whole process. Zero Data: the log gets
// phrase ids, counts, timings and error types only.
//
// The voice: GUIDE_VOICE_ID, else "Sarah" (EXAVITQu4vr4xnSDxMaL), one of ElevenLabs' premade
// voices and a different one from the clerk's default. If ElevenLabs refuses that voice (a 4xx
// that is not the key or a limit), the guide switches to the clerk's voice for the rest of the
// process and says so in the log once.
import { SHOPS } from './shops.js';
import { cachedAudio, clerkVoiceId, synthesize } from './voice.js';

export const GUIDE_DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
// A dynamic line: 1 to 160 characters after trimming.
export const MAX_TEXT = 160;
const PHRASE_TIMEOUT_MS = 6_000;
const DYNAMIC_TIMEOUT_MS = 4_000;
// Below this much of the deadline left, a retry in the clerk's voice is not worth starting.
const MIN_RETRY_MS = 500;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

// The fixed phrases. The page keys on these ids, so a text changes here and nowhere else; the
// three enter_<shop> lines take the shop's name from shops.js, like the greetings do.
export const PHRASES = new Map([
  ...[...SHOPS].map(([id, shop]) => [`enter_${id}`, `Walking into ${shop.name}.`]),
  ['left', 'Back on the street.'],
  ['captions_on', 'Captions are on.'],
  ['captions_off', 'Captions are off.'],
  ['larger_on', 'Larger text is on.'],
  ['larger_off', 'Larger text is off.'],
  ['contrast_on', 'High contrast is on.'],
  ['contrast_off', 'High contrast is off.'],
  ['motion_on', 'Reduce motion is on.'],
  ['motion_off', 'Reduce motion is off.'],
  ['voice_on', "The clerk's voice is on."],
  ['voice_off', "The clerk's voice is off; you'll read the answers."],
  ['effects_on', 'Sound effects are on.'],
  ['effects_off', 'Sound effects are off.'],
  ['handsfree_on', "Hands-free is on. Say where to go or what to ask; I'll keep listening."],
  ['handsfree_off', 'Hands-free is off.'],
  ['a11y_open', 'Opening the accessibility settings.'],
  ['a11y_close', 'Closing the settings.'],
  ['recentre', 'Looking at the doors again.'],
  ['replay', 'Here it is again.'],
  ['list_checking', 'Checking your list with the stock room.'],
  ['list_empty', 'Your list is empty. Say add, then an item.'],
  ['list_cleared', 'Your list is cleared.'],
  ['list_shared', 'The card is ready to take with you.'],
  ['help', 'You can say: enter the bakery, leave, turn on captions, describe the view, add sourdough to my list, check my list, or just ask the clerk.'],
  ['unknown', "I didn't catch that. Say help to hear what you can say."],
]);

// { id, text } for a request's say (and shop): a phrase id, or "enter" with a shop id, which
// is the phrase enter_<shop>. Anything else is null.
export function phraseFor(say, shop) {
  if (typeof say !== 'string') return null;
  const id = say === 'enter' && typeof shop === 'string' && SHOPS.has(shop) ? `enter_${shop}` : say;
  const text = PHRASES.get(id);
  return text === undefined ? null : { id, text };
}

// A dynamic line's text, trimmed with runs of white space made one space, or null if it breaks
// the rule (a string of 1 to 160 characters).
export function dynamicText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  return text.length >= 1 && text.length <= MAX_TEXT ? text : null;
}

let voiceId = process.env.GUIDE_VOICE_ID || GUIDE_DEFAULT_VOICE_ID;
let refusalLogged = false;

// A 4xx other than 401 (the key) and 429 (a limit) means ElevenLabs will not serve this voice
// to this account: unknown id, or a voice the plan does not include.
function voiceRefused(status) {
  return Number.isInteger(status) && status >= 400 && status < 500 && status !== 401 && status !== 429;
}

// text in the guide's voice, within timeoutMs. On a refusal the guide takes the clerk's voice
// from then on, logs that once, and retries this text with the time left.
async function speak(text, timeoutMs) {
  const started = performance.now();
  let result = await synthesize(text, { timeoutMs, voiceId });
  if (!result.url && voiceRefused(result.status) && voiceId !== clerkVoiceId()) {
    if (!refusalLogged) {
      refusalLogged = true;
      console.warn(`guide: voice ${voiceId} refused (${result.reason}); using the clerk's voice`);
    }
    voiceId = clerkVoiceId();
    const left = Math.floor(timeoutMs - (performance.now() - started));
    if (left >= MIN_RETRY_MS) result = await synthesize(text, { timeoutMs: left, voiceId });
  }
  return result;
}

const phrases = new Map();

// A fixed phrase's audio, voiced once and kept (voice.js cachedAudio): { url, reason }.
export function phraseAudio(id) {
  return cachedAudio(phrases, id, () => speak(PHRASES.get(id), PHRASE_TIMEOUT_MS));
}

// A dynamic line's audio, voiced live under the 4 s deadline and never kept: { url, reason }.
export function dynamicAudio(text) {
  return speak(text, DYNAMIC_TIMEOUT_MS);
}

// At most 20 dynamic lines a minute for the whole process (one counter; no visitor is told
// apart from another). True, and counted, when this one may go ahead.
const recent = [];
export function allowDynamic(now = performance.now()) {
  while (recent.length && now - recent[0] >= RATE_WINDOW_MS) recent.shift();
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  return true;
}

// After the greetings at boot: voice every phrase, one after another, so hands-free commands
// are answered from memory. Network work only; nothing waits on it.
export async function warmGuide() {
  let warmed = 0;
  for (const id of PHRASES.keys()) {
    const { url, reason } = await phraseAudio(id);
    if (url) warmed += 1;
    else console.warn(`guide: warm-up ${id} failed (${reason})`);
  }
  console.log(`guide: phrases warmed (${warmed}/${PHRASES.size})`);
}
