/* ---------- Peripie mic: press to talk to the clerk (PLAN.md S1); typing stays ----------
   Self-attaching. The page needs one line before </body>: <script type="module" src="/mic.js"></script>.
   It finds the clerk's form by id (#f the form, #q the input, #status the clerk's state, #panel)
   and puts one round mic button next to the input. It does nothing at all (no button, no errors)
   when the browser has no speech recognition, when #f or #q is missing, or outside a secure
   context: https, or this machine. The lab's http LAN address gets no button.

   Tap: the words appear in #q as they are heard. On the final result the form is submitted through
   the page's own handler (a submit event on #f), but only if the clerk was listening at the tap and
   still is, so the clerk's own voice picked up mid-answer is never sent; otherwise the words wait
   in #q for Ask. Tap again to finish early. Typing, Ask, a suggestion chip or Leave cancels it.

   Zero Data: nothing is stored or logged; the words leave only through the page's own submit. The
   browser does the transcribing: Chrome sends the audio to Google's speech service (MDN: a
   server-based engine), Safari uses Apple's speech recognition. */

const MAX_TEXT = 300;                              // the page's cap on a question (contract: 1 to 300)
const HINT = 'Microphone blocked; type instead';   // the only text this file shows
const QUIET = ['no-speech', 'aborted'];            // errors that need no hint: tap again
const LIMIT_MS = 15000;                            // one question never needs the mic longer
const END_WAIT_MS = 2000;                          // after stop(), how long to wait for 'end'

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/>' +
  '<path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>';

/* Colours, border and font come from the page's own button rules (it is a <button> inside #f);
   this only makes it round, keeps it from looking disabled while the input is empty, dims it
   while the clerk is busy, and turns it red while it listens. */
const CSS = `
#f .pp-mic{flex:none;align-self:center;box-sizing:border-box;width:44px;height:44px;padding:0;border-radius:50%;
  display:inline-flex;align-items:center;justify-content:center;opacity:1!important;cursor:pointer!important}
#f .pp-mic svg{display:block;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;
  stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
#f .pp-mic.pp-busy{opacity:.4!important}
#f .pp-mic.pp-live{opacity:1!important;background:#dc2626;border-color:#dc2626;color:#fff;
  animation:pp-mic-pulse 1.2s ease-out infinite}
@keyframes pp-mic-pulse{from{box-shadow:0 0 0 0 rgba(220,38,38,.55)}to{box-shadow:0 0 0 9px rgba(220,38,38,0)}}
@media (prefers-reduced-motion:reduce){#f .pp-mic.pp-live{animation:none}}
.pp-mic-hint{margin:6px 4px 0;font-size:13px;line-height:1.3;opacity:.8}
.pp-mic-hint:empty{display:none}`;

const $ = id => document.getElementById(id);
const Speech = () => window.SpeechRecognition || window.webkitSpeechRecognition;

function attach(form, input){
  const status = $('status'), panel = $('panel');
  const listening = () => !!status &&
    (/^listening/i.test(status.textContent.trim()) || status.classList.contains('listening'));
  const inShop = () => !panel || !panel.hidden;

  const style = document.createElement('style');
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  const btn = document.createElement('button');
  btn.type = 'button';                             // never submits the form by itself
  btn.className = 'pp-mic';
  btn.innerHTML = ICON;
  input.after(btn);
  const hint = document.createElement('p');
  hint.className = 'pp-mic-hint';
  hint.setAttribute('role', 'status');
  form.after(hint);

  let live = null;      // the recognition running now; a fresh one per tap, since iOS wants a tap each time
  let ours = false;     // true while this file dispatches the submit

  function label(on){
    btn.classList.toggle('pp-live', on);
    btn.setAttribute('aria-label', on ? 'Listening\u2026' : 'Speak');
  }

  function start(){
    hint.textContent = '';
    const s = { r: null, armed: listening(), text: '', sent: false, failed: false,
                cancelled: false, stopping: false, over: false, timer: 0 };
    try {
      const r = s.r = new (Speech())();
      r.lang = 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      r.onstart = () => { if (!s.stopping && !s.over) s.timer = setTimeout(() => stop(s), LIMIT_MS); };
      r.onresult = e => heard(s, e);
      r.onerror = e => { s.failed = true; if (!QUIET.includes(e.error)) hint.textContent = HINT; };
      r.onend = () => end(s);
      r.start();                                   // inside the tap, before any await: Safari needs the gesture
    } catch { hint.textContent = HINT; return; }
    live = s; label(true);
  }

  // Interim and final words go straight into the input. Results are joined because Chrome splits
  // interim text into a stable and an unstable part, and Safari before 17 returns several results
  // even with continuous off; the question is done when the last result is final.
  function heard(s, e){
    if (s.over || s.sent || !e.results) return;
    let text = '';
    for (let i = 0; i < e.results.length; i++){ const alt = e.results[i][0]; if (alt) text += alt.transcript; }
    s.text = text.trim().slice(0, MAX_TEXT);
    input.value = s.text;
    const last = e.results[e.results.length - 1];
    if (last && last.isFinal){ send(s); stop(s); }
  }

  function send(s){                                // through the page's own submit handler, never the clerk directly
    s.sent = true;
    if (!s.text || !s.armed || !listening() || !inShop()) return;   // the words wait in #q for Ask
    ours = true;
    try { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
    finally { ours = false; }
  }

  function stop(s){                                // finish now; the words heard so far still count
    if (s.over) return;
    s.stopping = true; clearTimeout(s.timer);
    try { s.r.stop(); } catch {}
    s.timer = setTimeout(() => end(s), END_WAIT_MS);   // iOS may never send 'end'
  }

  function cancel(){                               // drop the words in flight
    const s = live;
    if (!s) return;
    s.cancelled = true;
    try { s.r.abort(); } catch {}
    end(s);
  }

  function end(s){
    if (s.over) return;
    s.over = true; clearTimeout(s.timer);
    if (live === s){ live = null; label(false); }
    if (!s.sent && !s.failed && !s.cancelled) send(s);   // ended with no final result (iOS): what was heard counts
  }

  label(false);
  btn.addEventListener('click', () => live ? stop(live) : start());
  input.addEventListener('input', () => { hint.textContent = ''; cancel(); });   // typing wins
  form.addEventListener('submit', () => { if (!ours) cancel(); });               // Ask, Enter or a chip
  if (panel) new MutationObserver(() => { if (panel.hidden) cancel(); })          // Leave
    .observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  const busy = () => btn.classList.toggle('pp-busy', !!status && !listening());  // dim while the clerk is busy
  if (status) new MutationObserver(busy)
    .observe(status, { attributes: true, childList: true, characterData: true, subtree: true });
  busy();
}

const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if (Speech() && $('f') && $('q') && secure) attach($('f'), $('q'));
