// check_stock for the clerk: whether a shop has something, and when it comes back.
//
// checkStock(shopId, query) resolves to exactly one of the two shapes in PLAN.md section 3:
//   { found: true, product, inStock, onHand, nextRestock, nextRestockAt, nextRestockText,
//     restockNote, typicalRestockDays }
//   { found: false, inStockProducts }
// It never rejects: if the database fails, it answers from the built-in seed and logs why.
// checkStockList(shopId, queries) answers a whole list the same way from one read of the shop.
//
// The restock fields come from the row's restock_rule (how the shop restocks: a tray every 20
// minutes, batches at 7 and 2, a truck on Fridays) evaluated against the clock in America/New_York:
//   nextRestock      'YYYY-MM-DD', the shop-local date of the next restock
//   nextRestockAt    that moment as an ISO string with the shop's offset, '2026-10-11T09:20:00-04:00'
//                    (midnight when only the day is known); null when nothing is known
//   nextRestockText  how the clerk says it: "in about 18 minutes" (within 90 minutes), "today at
//                    2 pm", "tomorrow at 7 am", or "Friday, October 16" when only the day is known
//   restockNote      the shop's own sentence (restock_note) with {when} filled in from
//                    nextRestockText, or null
// Both the database path and the in-memory path give the same answer for the same clock; tests
// pass a fake `now` as the last argument.
//
// With TIGER_DATABASE_URL (or, failing that, DATABASE_URL) set it reads Tiger Data
// (inventory plus the stock_events hypertable). With neither, it answers from an in-memory
// copy of the seed (db/seed-data.js) and logs one warning, so the clerk can be tested
// before the database exists.
//
// Zero Data: the visitor's words are matched here in Node. They are never logged and never
// sent to the database; the only query parameter is the shop id.

import { PRODUCTS, nextRestock, onHandNow, parseRule, readings } from '../db/seed-data.js';

const SHOP_TIME_ZONE = 'America/New_York';

// ---------- the query ----------

// One round trip per question: the shop's products, plus how long each one usually stays
// out. A restock is a reading above 0 right after a 0 (LAG); its gap runs from the first 0
// of that empty spell. The 90-day bound lets TimescaleDB skip older chunks.
const SHOP_SQL = `
WITH readings AS (
  SELECT product, ts, on_hand,
         LAG(on_hand) OVER (PARTITION BY shop_id, product ORDER BY ts) AS prev_on_hand
  FROM stock_events
  WHERE shop_id = $1 AND ts > now() - interval '90 days'
), spells AS (
  SELECT product, ts, on_hand, prev_on_hand,
         max(ts) FILTER (WHERE on_hand = 0 AND (prev_on_hand IS NULL OR prev_on_hand > 0))
           OVER (PARTITION BY product ORDER BY ts) AS empty_since
  FROM readings
), restocks AS (
  SELECT product,
         round((avg(extract(epoch FROM ts - empty_since)) / 86400)::numeric, 1) AS typical_restock_days
  FROM spells
  WHERE prev_on_hand = 0 AND on_hand > 0
  GROUP BY product
)
SELECT i.product, i.on_hand, to_char(i.next_restock, 'YYYY-MM-DD') AS next_restock,
       i.restock_rule, i.restock_note, r.typical_restock_days
FROM inventory i
LEFT JOIN restocks r ON r.product = i.product
WHERE i.shop_id = $1`;

// The same computation as SHOP_SQL, over one product's readings in time order.
export function typicalRestockDays(rs) {
  let prev = null;
  let emptySince = null;
  const gaps = [];
  for (const { ts, onHand } of rs) {
    if (onHand === 0 && (prev === null || prev > 0)) emptySince = ts;
    if (onHand > 0 && prev === 0) gaps.push((ts - emptySince) / 86_400_000);
    prev = onHand;
  }
  if (!gaps.length) return null;
  return Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10;
}

// ---------- loose matching ----------

function words(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // crème -> creme
    .replace(/['‘’`]/g, '') // painter's -> painters
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// A word and its singular candidates: pots -> pot, baguettes -> baguette, tomatoes -> tomato.
function forms(word) {
  const f = [word];
  if (word.length > 3 && word.endsWith('es')) f.push(word.slice(0, -2));
  if (word.length > 2 && word.endsWith('s')) f.push(word.slice(0, -1));
  return f;
}

// The product name the visitor means, or null. A product matches when any of its words
// appears in the query, comparing singular forms on both sides ("do you have pots" is the
// terracotta pot). Adjacent query words are also tried joined, so "sour dough" and
// "terra cotta" still match. A full-name match beats a partial one ("pothos plant" is the
// pothos, not the snake plant); then the longest name wins.
export function matchProduct(names, query) {
  const qw = words(query);
  const tokens = new Set();
  qw.forEach((w, i) => {
    forms(w).forEach((f) => tokens.add(f));
    if (i + 1 < qw.length) forms(w + qw[i + 1]).forEach((f) => tokens.add(f));
  });
  const present = (w) => forms(w).some((f) => tokens.has(f));

  let best = null;
  for (const name of names) {
    const nw = words(name);
    const hits = nw.filter(present).length;
    const whole = nw.length > 0 && (hits === nw.length || present(nw.join(''))); // "snakeplant"
    if (!hits && !whole) continue;
    const score = [whole ? 1 : 0, nw.join(' ').length, hits]; // compared in this order
    if (!best || outranks(score, best.score)) best = { name, score };
  }
  return best ? best.name : null;
}

function outranks(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

// ---------- dates and times, in the shops' time zone ----------

const clockParts = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
});
const restockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric',
});
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const pad2 = (n) => String(n).padStart(2, '0');
const ymdOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10); // d may overflow the month

// The instant `ms` on the shop's wall clock: date, minute of the day, weekday, and the offset
// from UTC in minutes (-240 in New York summer time), from Intl so DST is right.
function shopTime(ms) {
  const p = Object.fromEntries(clockParts.formatToParts(new Date(ms)).map(({ type, value }) => [type, value]));
  const y = Number(p.year);
  const m = Number(p.month);
  const d = Number(p.day);
  const wall = Date.UTC(y, m - 1, d, Number(p.hour), Number(p.minute), Number(p.second));
  return {
    y, m, d,
    ymd: `${p.year}-${p.month}-${p.day}`,
    minute: Number(p.hour) * 60 + Number(p.minute),
    second: Number(p.second),
    dow: DOW[p.weekday],
    offsetMinutes: Math.round((wall - ms) / 60_000),
  };
}

// The instant of the shop-local wall time y-m-d at `minute` minutes past midnight. The offset is
// read at a first guess and once more at the result, so a DST change between them is honored.
function shopLocalToMs(y, m, d, minute) {
  const wall = Date.UTC(y, m - 1, d, 0, minute);
  const guess = wall - shopTime(wall).offsetMinutes * 60_000;
  return wall - shopTime(guess).offsetMinutes * 60_000;
}

// ISO 8601 with the shop's own offset, '2026-10-11T09:20:00-04:00', so a reader sees the local time.
function isoAt(ms) {
  const t = shopTime(ms);
  const abs = Math.abs(t.offsetMinutes);
  return `${t.ymd}T${pad2(Math.floor(t.minute / 60))}:${pad2(t.minute % 60)}:${pad2(t.second)}` +
    `${t.offsetMinutes < 0 ? '-' : '+'}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

// 840 -> '2 pm', 560 -> '9:20 am'
function clockText(minute) {
  const h = Math.floor(minute / 60);
  const mm = minute % 60;
  return `${h % 12 || 12}${mm ? `:${pad2(mm)}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

// '2026-10-13' -> 'Tuesday, October 13'. Noon UTC falls on the same date in New York.
export function restockText(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return restockFormat.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

// ---------- the next restock ----------

// The first batch of a time-of-day rule strictly after `minute` (-1 for the start of a day), or
// null when the day has no more.
function firstBatchAfter(rule, minute) {
  if (rule.kind === 'daily') return rule.times.find((t) => t > minute) ?? null;
  if (minute < rule.from) return rule.from;
  const t = rule.from + (Math.floor((minute - rule.from) / rule.step) + 1) * rule.step;
  return t <= rule.to ? t : null;
}

// When the next restock is, under the row's rule, as { ms, ymd, timed } where `timed` says the
// rule named a time of day: every/daily give the first batch after now, today or else tomorrow;
// weekly gives the next such weekday strictly after today (as seed.sql writes next_restock); no
// rule gives the next_restock date itself. Null when nothing is known.
export function nextOccurrence(rule, nowMs, fallbackYmd) {
  const now = shopTime(nowMs);
  if (rule?.kind === 'every' || rule?.kind === 'daily') {
    const today = firstBatchAfter(rule, now.minute);
    const minute = today ?? firstBatchAfter(rule, -1);
    const d = now.d + (today == null ? 1 : 0);
    return { ms: shopLocalToMs(now.y, now.m, d, minute), ymd: ymdOf(now.y, now.m, d), timed: true };
  }
  let ymd = fallbackYmd ?? null;
  if (rule?.kind === 'weekly') ymd = ymdOf(now.y, now.m, now.d + ((rule.weekday - now.dow + 6) % 7) + 1);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return { ms: shopLocalToMs(y, m, d, 0), ymd, timed: false };
}

// How the clerk says it: within 90 minutes "in about 18 minutes"; later today "today at 2 pm";
// "tomorrow at 7 am"; otherwise, and whenever only the day is known, "Friday, October 16".
export function restockPhrase(occ, nowMs) {
  if (!occ) return null;
  if (!occ.timed) return restockText(occ.ymd);
  const minutes = Math.max(1, Math.round((occ.ms - nowMs) / 60_000));
  if (minutes <= 90) return `in about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const now = shopTime(nowMs);
  const then = shopTime(occ.ms);
  if (then.ymd === now.ymd) return `today at ${clockText(then.minute)}`;
  if (then.ymd === ymdOf(now.y, now.m, now.d + 1)) return `tomorrow at ${clockText(then.minute)}`;
  return restockText(then.ymd);
}

// The shop's sentence with {when} filled in; null when it needs a time nobody knows.
function fillNote(note, when) {
  if (note == null || note === '') return null;
  if (!note.includes('{when}')) return note;
  return when ? note.replaceAll('{when}', when) : null;
}

// ---------- answers ----------

function answer(rows, query, nowMs) {
  const sorted = [...rows].sort((a, b) => (a.product < b.product ? -1 : a.product > b.product ? 1 : 0));
  const name = matchProduct(sorted.map((r) => r.product), query);
  const r = name === null ? null : sorted.find((x) => x.product === name);
  if (!r) {
    return { found: false, inStockProducts: sorted.filter((x) => x.onHand > 0).map((x) => x.product) };
  }
  const occ = nextOccurrence(parseRule(r.restockRule), nowMs, r.nextRestock);
  const text = restockPhrase(occ, nowMs);
  return {
    found: true,
    product: r.product,
    inStock: r.onHand > 0,
    onHand: r.onHand,
    nextRestock: occ ? occ.ymd : null,
    nextRestockAt: occ ? isoAt(occ.ms) : null,
    nextRestockText: text,
    restockNote: fillNote(r.restockNote, text),
    typicalRestockDays: r.typicalRestockDays,
  };
}

// The in-memory copy of the seed, as seed.sql would write it at this moment on the shops' clock,
// so "tomorrow" and "today" stay true across days. Cheap enough to build per question.
function memoryRows(shopId, nowMs) {
  const now = shopTime(nowMs);
  return PRODUCTS.filter((p) => p.shop === shopId).map((p) => ({
    product: p.product,
    onHand: onHandNow(p),
    nextRestock: nextRestock(p, now.ymd, now.minute),
    restockRule: p.rule ?? null,
    restockNote: p.note ?? null,
    typicalRestockDays: typicalRestockDays(readings(p, nowMs)),
  }));
}

// Which database to use. TIGER_DATABASE_URL comes first because Replit provisions its own
// Postgres for every app under DATABASE_URL: reading that first would put the live app on
// Replit's empty database, answering from the built-in seed instead of Tiger Data.
function databaseSetting() {
  for (const name of ['TIGER_DATABASE_URL', 'DATABASE_URL']) {
    if (process.env[name]) return { name, url: process.env[name] };
  }
  return null;
}

// The host part only, for the log: never the user name or password.
function hostOf(url) {
  try {
    return new URL(url).hostname || 'no host';
  } catch {
    return 'unparseable URL';
  }
}

let warnedNoDatabase = false;
function warnNoDatabase() {
  if (warnedNoDatabase) return;
  warnedNoDatabase = true;
  console.warn('[stock] TIGER_DATABASE_URL and DATABASE_URL are not set: check_stock answers from the built-in seed (db/seed-data.js), not Tiger Data.');
}
// Once at startup, after the entry module has run (and loaded .env): which variable is in
// use and its host, or the warning that there is no database. With a database, the first
// connection is opened now, in the background, so the first question finds it ready.
setImmediate(() => {
  const db = databaseSetting();
  if (!db) return warnNoDatabase();
  console.log(`[stock] using ${db.name} (${hostOf(db.url)})`);
  warmUp(db.url);
});

// ---------- Tiger Data ----------

let poolPromise = null;
let verifyTls = true;

// node-postgres lets sslmode in the URL override the ssl object, so sslmode is taken out of
// the URL and turned into an explicit ssl setting (PLAN.md, SDK and runtime pins).
function connectionOptions(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get('sslmode');
  for (const key of ['sslmode', 'ssl', 'uselibpqcompat']) url.searchParams.delete(key);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const ssl = sslmode === 'disable' || (local && !sslmode) ? false : { rejectUnauthorized: verifyTls };
  return { connectionString: url.toString(), ssl };
}

function getPool(databaseUrl) {
  poolPromise ??= (async () => {
    const { default: pg } = await import('pg'); // loaded only when a database is configured
    const pool = new pg.Pool({
      ...connectionOptions(databaseUrl),
      max: 3,
      // Covers TCP, TLS and login (pg clears it at ReadyForQuery). A host that hangs costs
      // this once: after that the breaker below answers from the seed without waiting.
      connectionTimeoutMillis: 2000,
      query_timeout: 3000,
      // Keep connections open and reuse them, so questions do not pay a TLS handshake;
      // TCP keepalive stops NAT or a load balancer from silently dropping an idle one.
      idleTimeoutMillis: 0,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      allowExitOnIdle: true,
    });
    pool.on('error', (err) => console.warn(`[stock] idle database connection dropped (${describe(err)})`));
    return pool;
  })().catch((err) => {
    poolPromise = null;
    throw err;
  });
  return poolPromise;
}

function isCertificateError(err) {
  return /CERT|SELF_SIGNED|UNABLE_TO_(GET|VERIFY)|ALTNAME/.test(String(err?.code ?? '')) ||
    /certificate/i.test(String(err?.message ?? ''));
}

// Error code or short message for the log. The SQL never contains visitor text.
function describe(err) {
  return String(err?.code || err?.message || err).slice(0, 100);
}

// A pg DatabaseError: the server answered with an SQL error, so it cost no waiting.
function isSqlError(err) {
  return typeof err?.severity === 'string' && typeof err?.code === 'string';
}

// One parameterized query on the pool, with the certificate-error retry from the PLAN pins.
async function runQuery(databaseUrl, sql, params) {
  try {
    return await (await getPool(databaseUrl)).query(sql, params);
  } catch (err) {
    if (!isCertificateError(err)) throw err;
    // PLAN.md pins: on a certificate error, keep TLS but skip verifying the chain.
    if (verifyTls) {
      verifyTls = false;
      console.warn(`[stock] TLS certificate not verified (${describe(err)}); reconnecting with rejectUnauthorized: false`);
      const old = poolPromise;
      poolPromise = null;
      old?.then((p) => p.end()).catch(() => {});
    }
    return await (await getPool(databaseUrl)).query(sql, params);
  }
}

// Breaker: after a failed connect or a timed-out query the database is marked down, and
// questions answer from the seed at once instead of each waiting out a timeout. A
// background check retries every RETRY_MS and marks it up again when it answers. SQL errors
// (a missing table) do not trip it: the server answered, so they cost no time.
const RETRY_MS = 10_000;
let downSince = 0;
let retryTimer = null;

function markDown(databaseUrl, err) {
  if (!downSince) {
    downSince = Date.now();
    console.warn(`[stock] database unavailable (${describe(err)}); answering from the built-in seed and retrying every ${RETRY_MS / 1000} s in the background`);
  }
  if (retryTimer) return;
  retryTimer = setTimeout(async () => {
    try {
      await runQuery(databaseUrl, 'SELECT 1');
      console.log(`[stock] database reachable again after ${Math.round((Date.now() - downSince) / 1000)} s; answering from it`);
      downSince = 0;
      retryTimer = null;
    } catch (e) {
      retryTimer = null;
      markDown(databaseUrl, e);
    }
  }, RETRY_MS);
  retryTimer.unref(); // never keeps a script alive
}

async function warmUp(databaseUrl) {
  try {
    await runQuery(databaseUrl, 'SELECT 1');
  } catch (err) {
    if (!isSqlError(err)) markDown(databaseUrl, err);
  }
}

async function databaseRows(shopId, databaseUrl) {
  const result = await runQuery(databaseUrl, SHOP_SQL, [shopId]);
  return result.rows.map((r) => ({
    product: r.product,
    onHand: r.on_hand,
    nextRestock: r.next_restock, // already 'YYYY-MM-DD' (to_char), so no time zone shifts
    restockRule: r.restock_rule ?? null,
    restockNote: r.restock_note ?? null,
    typicalRestockDays: r.typical_restock_days == null ? null : Number(r.typical_restock_days),
  }));
}

// The shop's rows: from the database, or from the built-in seed when there is no database, the
// breaker is open, the query fails, or the database has no rows for a seed shop.
async function shopRows(shop, nowMs) {
  const db = databaseSetting();
  if (!db) {
    warnNoDatabase();
    return memoryRows(shop, nowMs);
  }
  if (downSince) return memoryRows(shop, nowMs); // breaker open: no waiting
  let rows;
  try {
    rows = await databaseRows(shop, db.url);
  } catch (err) {
    if (err?.code === '42P01') {
      console.warn('[stock] database is missing the Peripie tables (42P01): schema not loaded? answering from the built-in seed');
    } else if (err?.code === '42703') {
      console.warn('[stock] database is missing the restock columns (42703): db/schema.sql not re-run since Oct 11? answering from the built-in seed');
    } else if (isSqlError(err)) {
      console.warn(`[stock] database error (${describe(err)}); answering from the built-in seed`);
    } else {
      markDown(db.url, err);
    }
    return memoryRows(shop, nowMs);
  }
  // Logged only for the three seed shops, so no visitor input ever reaches this line.
  if (!rows.length && memoryRows(shop, nowMs).length) {
    console.warn(`[stock] database has no inventory rows for ${shop}: seed not loaded? answering from the built-in seed`);
    return memoryRows(shop, nowMs);
  }
  return rows;
}

// `now` (ms since the epoch or a Date) is for tests: both paths answer for that moment.
const toMs = (now) => (now instanceof Date ? now.getTime() : Number(now));

export async function checkStock(shopId, query, now = Date.now()) {
  const nowMs = toMs(now);
  return answer(await shopRows(String(shopId ?? ''), nowMs), query, nowMs);
}

// A list: the shop's rows are read once and every query is answered from them exactly as
// checkStock answers it, so a list of any length is one round trip and one snapshot. (One
// checkStock per item would queue up to 12 queries on the pool of 3; measured Oct 11 on a cold
// pool, that waited 2 s and tripped the breaker.) One result per query, in order; never rejects.
export async function checkStockList(shopId, queries, now = Date.now()) {
  const nowMs = toMs(now);
  const rows = await shopRows(String(shopId ?? ''), nowMs);
  return queries.map((query) => answer(rows, query, nowMs));
}
