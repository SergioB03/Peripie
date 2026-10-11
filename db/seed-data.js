// Peripie seed data: the single source of truth for the demo inventory.
//
// Two things read this file:
//   - db/seed.sql is generated from it:   node db/seed-data.js --write-sql
//   - server/stock.js serves it from memory when no database is configured (neither
//     TIGER_DATABASE_URL nor DATABASE_URL), building the same stock history with the
//     same formula, so both paths give the same answers.
//
// Shops, product names and in/out status match the SHOPS list in public/index.html.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const READING_HOURS = 6; // one stock reading every 6 hours...
export const READINGS = 240; // ...for 60 days per product
const READINGS_PER_DAY = 24 / READING_HOURS;

export const WEEKDAY = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/*
  restock   the next_restock date: 'tomorrow'; a weekday, meaning the next one strictly after
            today (seeded on Sunday Oct 11 2026: tuesday = Oct 13, friday = Oct 16, saturday =
            Oct 17); or 'batch' for an item with a time-of-day rule: today while a batch is
            still ahead, else tomorrow.
  rule      how the shop restocks it (restock_rule; grammar in parseRule below). check_stock
            turns it into the moment of the next restock: "in about 18 minutes", "today at
            2 pm", "tomorrow at 7 am", or a date for weekly deliveries. Null: only the
            next_restock date is known.
  note      the shop's own sentence about it (restock_note), with {when} filled in by
            check_stock: "The next tray of croissants comes out of the oven in about 18 minutes."
  level     between sell-outs the shelf runs down from base + amp to base over `cycle`
            readings, then is restocked (cycle 4 = baked daily, 28 = weekly delivery).
            An in-stock item has `base` on hand right now.
  soldOut   past empty spells: the shelf went empty `daysAgo` days ago and was restocked
            `days` later. typicalRestockDays is the average of these `days`.
  outSince  out-of-stock items only: the current empty spell began this many days ago.
  Days are in quarter days, because there is one reading every 6 hours.
*/
export const PRODUCTS = [
  // Rosa's Bakery: the oven runs all day
  { shop: 'bakery', product: 'sourdough', restock: 'tomorrow', note: 'Baked fresh this morning.',
    level: { base: 8, amp: 16, cycle: 4 },
    soldOut: [{ daysAgo: 41, days: 1 }, { daysAgo: 13.5, days: 1 }] },
  { shop: 'bakery', product: 'croissant', restock: 'batch', rule: 'every:20;07:00-17:00',
    note: 'The next tray of croissants comes out of the oven {when}.',
    level: { base: 6, amp: 24, cycle: 4 },
    soldOut: [{ daysAgo: 47.5, days: 2 }, { daysAgo: 22, days: 4 }], outSince: 1.5 },
  { shop: 'bakery', product: 'concha', restock: 'tomorrow', note: 'Baked fresh this morning.',
    level: { base: 10, amp: 12, cycle: 4 },
    soldOut: [] }, // never sold out: typicalRestockDays is null
  { shop: 'bakery', product: 'baguette', restock: 'batch', rule: 'daily:07:00,14:00',
    note: 'We bake baguettes at seven and at two; the next batch is {when}.',
    level: { base: 5, amp: 16, cycle: 4 },
    soldOut: [{ daysAgo: 33, days: 0.5 }, { daysAgo: 9.25, days: 1.5 }], outSince: 0.5 },

  // Southside Paint Supply: the supplier's truck comes on Fridays
  { shop: 'paint', product: 'primer', restock: 'friday', level: { base: 12, amp: 16, cycle: 28 },
    soldOut: [{ daysAgo: 30, days: 3 }] },
  { shop: 'paint', product: 'eggshell white', restock: 'friday', level: { base: 9, amp: 14, cycle: 28 },
    soldOut: [{ daysAgo: 52, days: 2 }, { daysAgo: 18.5, days: 3 }] },
  { shop: 'paint', product: 'roller', restock: 'friday', rule: 'weekly:friday',
    note: "Our supplier's truck comes {when}.",
    level: { base: 6, amp: 10, cycle: 28 },
    soldOut: [{ daysAgo: 44, days: 5 }, { daysAgo: 20, days: 4 }], outSince: 2 },
  { shop: 'paint', product: "painter's tape", restock: 'friday', level: { base: 20, amp: 18, cycle: 28 },
    soldOut: [{ daysAgo: 27.25, days: 2 }] },

  // Fern & Pot: the grower delivers on Saturdays
  { shop: 'plants', product: 'monstera', restock: 'saturday', rule: 'weekly:saturday',
    note: 'The grower drops off new plants {when}.',
    level: { base: 2, amp: 6, cycle: 28 },
    soldOut: [{ daysAgo: 50, days: 6 }, { daysAgo: 25, days: 8 }], outSince: 3 },
  { shop: 'plants', product: 'pothos', restock: 'saturday', level: { base: 7, amp: 10, cycle: 28 },
    soldOut: [{ daysAgo: 36, days: 2.5 }] },
  { shop: 'plants', product: 'snake plant', restock: 'saturday', level: { base: 5, amp: 6, cycle: 28 },
    soldOut: [{ daysAgo: 55, days: 3 }, { daysAgo: 15, days: 5 }] },
  { shop: 'plants', product: 'terracotta pot', restock: 'saturday', level: { base: 16, amp: 12, cycle: 28 },
    soldOut: [] }, // never sold out: typicalRestockDays is null
];

// ---------- restock rules ----------

// restock_rule, as written in the inventory table, parsed into one of:
//   'every:20;07:00-17:00'  { kind: 'every', step: 20, from: 420, to: 1020 }  a batch at the window
//                           start and every `step` minutes after it, up to and including the end
//                           (7:00, 7:20, 7:40 ... 17:00); after the last one, the first tomorrow
//   'daily:07:00,14:00'     { kind: 'daily', times: [420, 840] }  batches at those times every day
//   'weekly:friday'         { kind: 'weekly', weekday: 5 }  a delivery every Friday (the next one
//                           strictly after today, the same day seed.sql writes in next_restock)
// Times are minutes after midnight in the shop's time zone (America/New_York). Null for no rule
// or one that does not parse: then only the next_restock date is known.
export function parseRule(rule) {
  if (rule == null) return null;
  const s = String(rule).trim().toLowerCase();
  let m;
  if ((m = /^every:(\d{1,3});(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(s))) {
    const step = Number(m[1]);
    const from = Number(m[2]) * 60 + Number(m[3]);
    const to = Number(m[4]) * 60 + Number(m[5]);
    if (step < 1 || step > 720 || from > to || to >= 1440 || Number(m[3]) > 59 || Number(m[5]) > 59) return null;
    return { kind: 'every', step, from, to };
  }
  if ((m = /^daily:(\d{1,2}:\d{2}(?:,\d{1,2}:\d{2})*)$/.exec(s))) {
    const times = m[1].split(',').map((t) => {
      const [h, min] = t.split(':').map(Number);
      return h < 24 && min < 60 ? h * 60 + min : null;
    });
    if (times.includes(null)) return null;
    return { kind: 'daily', times: [...new Set(times)].sort((a, b) => a - b) };
  }
  if ((m = /^weekly:([a-z]+)$/.exec(s)) && m[1] in WEEKDAY) return { kind: 'weekly', weekday: WEEKDAY[m[1]] };
  return null;
}

// The minute of the day of a time-of-day rule's last batch (every/daily); null for other rules.
// Decides whether next_restock is today or tomorrow, here and in seed.sql.
export function lastBatchMinute(rule) {
  const r = parseRule(rule);
  if (r?.kind === 'every') return r.from + Math.floor((r.to - r.from) / r.step) * r.step;
  if (r?.kind === 'daily') return r.times[r.times.length - 1];
  return null;
}

// ---------- stock history ----------

// Empty spells as inclusive ranges [lo, hi] of k, where k counts readings back from now
// (k = 0 is the latest reading). The shelf is restocked at k = lo - 1.
export function emptyRanges(p) {
  const ranges = p.soldOut.map(({ daysAgo, days }) => {
    const hi = daysAgo * READINGS_PER_DAY;
    return [hi - days * READINGS_PER_DAY + 1, hi];
  });
  if (p.outSince != null) ranges.push([0, p.outSince * READINGS_PER_DAY]);
  return ranges.sort((a, b) => a[0] - b[0]);
}

export function onHandNow(p) {
  return p.outSince != null ? 0 : p.level.base;
}

// The reading k steps before now. Same integer math as the CASE expression in seed.sql.
export function readingAt(p, k, ranges = emptyRanges(p)) {
  if (ranges.some(([lo, hi]) => k >= lo && k <= hi)) return 0;
  const { base, amp, cycle } = p.level;
  return base + Math.floor(((k % cycle) * amp) / cycle);
}

// A product's readings, oldest first: [{ ts (ms since epoch), onHand }].
export function readings(p, nowMs = Date.now()) {
  const hour = 3_600_000;
  const anchor = Math.floor(nowMs / hour) * hour; // date_trunc('hour', now())
  const ranges = emptyRanges(p);
  const out = [];
  for (let k = READINGS - 1; k >= 0; k--) {
    out.push({ ts: anchor - k * READING_HOURS * hour, onHand: readingAt(p, k, ranges) });
  }
  return out;
}

// next_restock as 'YYYY-MM-DD' for the shop-local date `today` ('YYYY-MM-DD') at `minuteOfDay`
// minutes past midnight. Same rule as the SQL in seed.sql: tomorrow; the next such weekday
// strictly after today; or, for 'batch', today while the rule's last batch is still ahead.
export function nextRestock(p, today, minuteOfDay = 0) {
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  let days;
  if (p.restock === 'tomorrow') days = 1;
  else if (p.restock === 'batch') days = minuteOfDay < lastBatchMinute(p.rule) ? 0 : 1;
  else days = ((WEEKDAY[p.restock] - dow + 6) % 7) + 1;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function validate() {
  for (const p of PRODUCTS) {
    const name = `${p.shop}/${p.product}`;
    const rule = p.rule == null ? null : parseRule(p.rule);
    if (p.rule != null && !rule) throw new Error(`seed-data: bad rule for ${name}`);
    if (p.restock === 'batch') {
      if (!(rule?.kind === 'every' || rule?.kind === 'daily')) throw new Error(`seed-data: 'batch' needs a time-of-day rule for ${name}`);
    } else if (p.restock !== 'tomorrow' && !(p.restock in WEEKDAY)) {
      throw new Error(`seed-data: bad restock for ${name}`);
    } else if (rule && (rule.kind !== 'weekly' || rule.weekday !== WEEKDAY[p.restock])) {
      throw new Error(`seed-data: rule and restock disagree for ${name}`);
    }
    if (p.note != null && typeof p.note !== 'string') throw new Error(`seed-data: bad note for ${name}`);
    if (!(p.level.base >= 1 && p.level.amp >= 0 && p.level.cycle >= 1)) throw new Error(`seed-data: bad level for ${name}`);
    const ranges = emptyRanges(p);
    ranges.forEach(([lo, hi], i) => {
      if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || lo > hi || hi >= READINGS) {
        throw new Error(`seed-data: empty spell out of range for ${name}`);
      }
      // A stocked reading must separate two spells, or they would count as one.
      if (i > 0 && lo <= ranges[i - 1][1] + 1) throw new Error(`seed-data: empty spells touch for ${name}`);
    });
  }
}
validate();

// ---------- seed.sql generation ----------

const sqlText = (s) => `'${String(s).replace(/'/g, "''")}'`; // seed constants only, never visitor text
const sqlOrNull = (v, type) => (v == null ? `NULL::${type}` : sqlText(v));
const sqlTime = (minute) => (minute == null ? 'NULL::time'
  : `'${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}'::time`);

export function seedSql() {
  const inventoryRows = PRODUCTS.map((p) =>
    `  (${sqlText(p.shop)}, ${sqlText(p.product)}, ${onHandNow(p)}, ` +
    `${p.restock in WEEKDAY ? WEEKDAY[p.restock] : 'NULL::int'}, ` +
    `${sqlTime(p.restock === 'batch' ? lastBatchMinute(p.rule) : null)},\n   ` +
    `${sqlOrNull(p.rule, 'text')}, ${sqlOrNull(p.note, 'text')})`).join(',\n');
  const levelRows = PRODUCTS.map((p) => {
    const empty = emptyRanges(p).map(([lo, hi]) => `[${lo},${hi}]`).join(',');
    return `  (${sqlText(p.shop)}, ${sqlText(p.product)}, ${p.level.base}, ${p.level.amp}, ` +
      `${p.level.cycle}, '{${empty}}'::int4multirange)`;
  }).join(',\n');

  return `-- Peripie seed: the three shops on the page, with 60 days of stock history per product.
-- GENERATED from db/seed-data.js by \`node db/seed-data.js --write-sql\`. Edit that file and
-- regenerate, so this and the in-memory fallback in server/stock.js stay identical.
--
-- Idempotent: it replaces every row, so it is safe to run again. Dates are relative to the
-- day it runs in America/New_York, so run it again on demo morning to keep "tomorrow" true.
-- Needs the restock_rule and restock_note columns: run db/schema.sql first (safe to re-run).

BEGIN;

-- current_date, localtime and now() in the shops' local time
SET LOCAL timezone = 'America/New_York';

TRUNCATE inventory;
TRUNCATE stock_events;

-- next_restock: last_batch set means a time-of-day rule (today while that batch is still ahead,
-- else tomorrow); otherwise restock_dow NULL means tomorrow, and a weekday (0 = Sunday ..
-- 6 = Saturday) means the next one strictly after today.
-- restock_rule and restock_note say how the shop restocks, in words; check_stock turns the rule
-- into "in about 18 minutes" or "tomorrow at 7 am" and fills {when} in the note.
INSERT INTO inventory (shop_id, product, on_hand, next_restock, restock_rule, restock_note)
SELECT shop_id, product, on_hand,
       current_date + CASE WHEN last_batch IS NOT NULL THEN CASE WHEN localtime < last_batch THEN 0 ELSE 1 END
                           WHEN restock_dow IS NULL THEN 1
                           ELSE (restock_dow - extract(dow FROM current_date)::int + 6) % 7 + 1
                      END,
       restock_rule, restock_note
FROM (VALUES
${inventoryRows}
) AS v (shop_id, product, on_hand, restock_dow, last_batch, restock_rule, restock_note);

-- One reading every ${READING_HOURS} hours for 60 days per product; k counts readings back from now.
-- Between sell-outs the shelf runs down from base + amp to base over \`cycle\` readings.
-- Inside the \`empty\` ranges of k the shelf was at 0; a range that includes k = 0 means
-- the item is out of stock right now.
INSERT INTO stock_events (ts, shop_id, product, on_hand)
SELECT date_trunc('hour', now()) - k * interval '${READING_HOURS} hours',
       p.shop_id, p.product,
       CASE WHEN p.empty @> k THEN 0
            ELSE p.base + (k % p.cycle) * p.amp / p.cycle
       END
FROM (VALUES
${levelRows}
) AS p (shop_id, product, base, amp, cycle, empty)
CROSS JOIN generate_series(0, ${READINGS - 1}) AS k;

COMMIT;
`;
}

// node db/seed-data.js --write-sql   writes db/seed.sql (UTF-8, no BOM, LF line endings)
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain && process.argv.includes('--write-sql')) {
  const out = fileURLToPath(new URL('./seed.sql', import.meta.url));
  writeFileSync(out, seedSql());
  console.log(`wrote ${out}`);
}
