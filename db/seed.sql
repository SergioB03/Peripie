-- Peripie seed: the three shops on the page, with 60 days of stock history per product.
-- GENERATED from db/seed-data.js by `node db/seed-data.js --write-sql`. Edit that file and
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
  ('bakery', 'sourdough', 8, NULL::int, NULL::time,
   NULL::text, 'Baked fresh this morning.'),
  ('bakery', 'croissant', 0, NULL::int, '17:00'::time,
   'every:20;07:00-17:00', 'The next tray of croissants comes out of the oven {when}.'),
  ('bakery', 'concha', 10, NULL::int, NULL::time,
   NULL::text, 'Baked fresh this morning.'),
  ('bakery', 'baguette', 0, NULL::int, '14:00'::time,
   'daily:07:00,14:00', 'We bake baguettes at seven and at two; the next batch is {when}.'),
  ('paint', 'primer', 12, 5, NULL::time,
   NULL::text, NULL::text),
  ('paint', 'eggshell white', 9, 5, NULL::time,
   NULL::text, NULL::text),
  ('paint', 'roller', 0, 5, NULL::time,
   'weekly:friday', 'Our supplier''s truck comes {when}.'),
  ('paint', 'painter''s tape', 20, 5, NULL::time,
   NULL::text, NULL::text),
  ('plants', 'monstera', 0, 6, NULL::time,
   'weekly:saturday', 'The grower drops off new plants {when}.'),
  ('plants', 'pothos', 7, 6, NULL::time,
   NULL::text, NULL::text),
  ('plants', 'snake plant', 5, 6, NULL::time,
   NULL::text, NULL::text),
  ('plants', 'terracotta pot', 16, 6, NULL::time,
   NULL::text, NULL::text)
) AS v (shop_id, product, on_hand, restock_dow, last_batch, restock_rule, restock_note);

-- One reading every 6 hours for 60 days per product; k counts readings back from now.
-- Between sell-outs the shelf runs down from base + amp to base over `cycle` readings.
-- Inside the `empty` ranges of k the shelf was at 0; a range that includes k = 0 means
-- the item is out of stock right now.
INSERT INTO stock_events (ts, shop_id, product, on_hand)
SELECT date_trunc('hour', now()) - k * interval '6 hours',
       p.shop_id, p.product,
       CASE WHEN p.empty @> k THEN 0
            ELSE p.base + (k % p.cycle) * p.amp / p.cycle
       END
FROM (VALUES
  ('bakery', 'sourdough', 8, 16, 4, '{[51,54],[161,164]}'::int4multirange),
  ('bakery', 'croissant', 6, 24, 4, '{[0,6],[73,88],[183,190]}'::int4multirange),
  ('bakery', 'concha', 10, 12, 4, '{}'::int4multirange),
  ('bakery', 'baguette', 5, 16, 4, '{[0,2],[32,37],[131,132]}'::int4multirange),
  ('paint', 'primer', 12, 16, 28, '{[109,120]}'::int4multirange),
  ('paint', 'eggshell white', 9, 14, 28, '{[63,74],[201,208]}'::int4multirange),
  ('paint', 'roller', 6, 10, 28, '{[0,8],[65,80],[157,176]}'::int4multirange),
  ('paint', 'painter''s tape', 20, 18, 28, '{[102,109]}'::int4multirange),
  ('plants', 'monstera', 2, 6, 28, '{[0,12],[69,100],[177,200]}'::int4multirange),
  ('plants', 'pothos', 7, 10, 28, '{[135,144]}'::int4multirange),
  ('plants', 'snake plant', 5, 6, 28, '{[41,60],[209,220]}'::int4multirange),
  ('plants', 'terracotta pot', 16, 12, 28, '{}'::int4multirange)
) AS p (shop_id, product, base, amp, cycle, empty)
CROSS JOIN generate_series(0, 239) AS k;

COMMIT;
