-- Peripie seed: the three shops on the page, with 60 days of stock history per product.
-- GENERATED from db/seed-data.js by `node db/seed-data.js --write-sql`. Edit that file and
-- regenerate, so this and the in-memory fallback in server/stock.js stay identical.
--
-- Idempotent: it replaces every row, so it is safe to run again. Dates are relative to the
-- day it runs in America/New_York, so run it again on demo morning to keep "tomorrow" true.

BEGIN;

-- current_date and now() in the shops' local time
SET LOCAL timezone = 'America/New_York';

TRUNCATE inventory;
TRUNCATE stock_events;

-- restock_dow: NULL means tomorrow; otherwise a weekday (0 = Sunday .. 6 = Saturday),
-- the next one strictly after today.
INSERT INTO inventory (shop_id, product, on_hand, next_restock)
SELECT shop_id, product, on_hand,
       current_date + CASE WHEN restock_dow IS NULL THEN 1
                           ELSE (restock_dow - extract(dow FROM current_date)::int + 6) % 7 + 1
                      END
FROM (VALUES
  ('bakery', 'sourdough', 8, NULL::int),
  ('bakery', 'croissant', 0, 2),
  ('bakery', 'concha', 10, NULL::int),
  ('bakery', 'baguette', 0, NULL::int),
  ('paint', 'primer', 12, 5),
  ('paint', 'eggshell white', 9, 5),
  ('paint', 'roller', 0, 5),
  ('paint', 'painter''s tape', 20, 5),
  ('plants', 'monstera', 0, 6),
  ('plants', 'pothos', 7, 6),
  ('plants', 'snake plant', 5, 6),
  ('plants', 'terracotta pot', 16, 6)
) AS v (shop_id, product, on_hand, restock_dow);

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
