-- Peripie seed: the three shops on the page, 27 products, with 60 days of stock history each.
-- GENERATED from db/seed-data.js by `node db/seed-data.js --write-sql`. Edit that file and
-- regenerate, so this and the in-memory fallback in server/stock.js stay identical.
--
-- Idempotent: it replaces every row, so it is safe to run again. Dates are relative to the
-- day it runs in America/New_York, so run it again on demo morning to keep "tomorrow" true.
-- Needs the restock_rule, restock_note, aliases and price_cents columns: run db/schema.sql first
-- (safe to re-run).

BEGIN;

-- current_date, localtime and now() in the shops' local time
SET LOCAL timezone = 'America/New_York';

TRUNCATE inventory;
TRUNCATE stock_events;

-- next_restock: last_batch set means a time-of-day rule (today while that batch is still ahead,
-- else tomorrow); otherwise a weekday in restock_dow (0 = Sunday .. 6 = Saturday) means the next
-- one strictly after today; otherwise days_ahead days from today (1 = tomorrow).
-- restock_rule and restock_note say how the shop restocks, in words; check_stock turns the rule
-- into "in about 18 minutes" or "tomorrow at 7 am" and fills {when} in the note.
-- aliases are other words a visitor may use; price_cents is shown as "$8.00", nothing is sold.
INSERT INTO inventory (shop_id, product, on_hand, next_restock, restock_rule, restock_note, aliases, price_cents)
SELECT shop_id, product, on_hand,
       current_date + CASE WHEN last_batch IS NOT NULL THEN CASE WHEN localtime < last_batch THEN 0 ELSE 1 END
                           WHEN restock_dow IS NOT NULL THEN (restock_dow - extract(dow FROM current_date)::int + 6) % 7 + 1
                           ELSE days_ahead
                      END,
       restock_rule, restock_note, aliases, price_cents
FROM (VALUES
  ('bakery', 'sourdough', 8, 1, NULL::int, NULL::time,
   NULL::text, 'Baked fresh this morning.',
   ARRAY['bread', 'loaf', 'sourdough loaf']::text[], 800),
  ('bakery', 'croissant', 0, NULL::int, NULL::int, '17:00'::time,
   'every:20;07:00-17:00', 'The next tray of croissants comes out of the oven {when}.',
   ARRAY['pastry', 'pastries']::text[], 400),
  ('bakery', 'concha', 10, 1, NULL::int, NULL::time,
   NULL::text, 'Baked fresh this morning.',
   ARRAY['pan dulce', 'sweet bread']::text[], 275),
  ('bakery', 'baguette', 0, NULL::int, NULL::int, '14:00'::time,
   'daily:07:00,14:00', 'We bake baguettes at seven and at two; the next batch is {when}.',
   ARRAY['french bread']::text[], 450),
  ('bakery', 'gluten-free loaf', 2, NULL::int, 0, NULL::time,
   NULL::text, 'We bake a small batch of gluten-free loaves on Sundays; there are two left today.',
   ARRAY['gluten free', 'gf bread']::text[], 900),
  ('bakery', 'cinnamon roll', 6, 1, NULL::int, NULL::time,
   NULL::text, NULL::text,
   ARRAY['cinnamon bun']::text[], 425),
  ('bakery', 'pan de muerto', 0, NULL::int, NULL::int, '07:00'::time,
   'daily:07:00', 'We bake pan de muerto in the morning; the next batch is {when}.',
   ARRAY[]::text[], 350),
  ('bakery', 'coffee', 60, 1, NULL::int, NULL::time,
   NULL::text, NULL::text,
   ARRAY['latte', 'espresso', 'drip coffee']::text[], 300),
  ('bakery', 'birthday cake', 0, 2, NULL::int, NULL::time,
   NULL::text, 'Cakes are made to order; the next one we can do is {when}.',
   ARRAY[]::text[], 3800),
  ('paint', 'primer', 12, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY['undercoat']::text[], 2499),
  ('paint', 'eggshell white', 9, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY['white paint', 'eggshell']::text[], 3499),
  ('paint', 'roller', 0, NULL::int, 5, NULL::time,
   'weekly:friday', 'Our supplier''s truck comes {when}.',
   ARRAY['paint roller', 'roller cover']::text[], 899),
  ('paint', 'painter''s tape', 20, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY['masking tape', 'blue tape']::text[], 699),
  ('paint', 'drop cloth', 15, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY['tarp']::text[], 1299),
  ('paint', 'paint brush set', 9, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY['brushes', 'brush']::text[], 1899),
  ('paint', 'ceiling white', 0, NULL::int, 5, NULL::time,
   'weekly:friday', 'Our supplier''s truck comes {when}.',
   ARRAY['ceiling paint']::text[], 2999),
  ('paint', 'deck stain', 3, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY[]::text[], 4199),
  ('paint', 'sandpaper', 40, NULL::int, 5, NULL::time,
   NULL::text, NULL::text,
   ARRAY[]::text[], 150),
  ('plants', 'monstera', 0, NULL::int, 6, NULL::time,
   'weekly:saturday', 'The grower drops off new plants {when}.',
   ARRAY['swiss cheese plant']::text[], 3800),
  ('plants', 'pothos', 7, NULL::int, 6, NULL::time,
   NULL::text, NULL::text,
   ARRAY['devil''s ivy']::text[], 1600),
  ('plants', 'snake plant', 5, NULL::int, 6, NULL::time,
   NULL::text, NULL::text,
   ARRAY['sansevieria']::text[], 2400),
  ('plants', 'terracotta pot', 16, NULL::int, 6, NULL::time,
   NULL::text, NULL::text,
   ARRAY['pot', 'planter', 'clay pot']::text[], 900),
  ('plants', 'fiddle-leaf fig', 0, NULL::int, 6, NULL::time,
   'weekly:saturday', 'The grower drops off new plants {when}.',
   ARRAY['fiddle leaf', 'fig tree']::text[], 6500),
  ('plants', 'succulent', 25, NULL::int, 6, NULL::time,
   NULL::text, NULL::text,
   ARRAY['succulents', 'cactus']::text[], 650),
  ('plants', 'potting soil', 12, NULL::int, 6, NULL::time,
   NULL::text, NULL::text,
   ARRAY['soil', 'dirt']::text[], 1200),
  ('plants', 'basil', 4, NULL::int, 6, NULL::time,
   NULL::text, 'Just watered this morning.',
   ARRAY['herbs']::text[], 500),
  ('plants', 'orchid', 1, NULL::int, 6, NULL::time,
   NULL::text, 'One orchid left, in bloom.',
   ARRAY[]::text[], 2800)
) AS v (shop_id, product, on_hand, days_ahead, restock_dow, last_batch, restock_rule, restock_note, aliases, price_cents);

-- One reading every 6 hours for 60 days per product; k counts readings back from now.
-- Between sell-outs the shelf runs down from base + amp to base over `cycle` readings.
-- Inside the `empty` ranges of k the shelf was at 0; a range that includes k = 0 means
-- the item is out of stock right now. 27 products x 240 readings = 6480 rows.
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
  ('bakery', 'gluten-free loaf', 2, 6, 28, '{[29,40],[145,152]}'::int4multirange),
  ('bakery', 'cinnamon roll', 6, 12, 4, '{[77,80]}'::int4multirange),
  ('bakery', 'pan de muerto', 8, 10, 4, '{[0,1],[18,20],[117,120]}'::int4multirange),
  ('bakery', 'coffee', 60, 40, 28, '{}'::int4multirange),
  ('bakery', 'birthday cake', 3, 2, 28, '{[0,4],[41,48],[153,160]}'::int4multirange),
  ('paint', 'primer', 12, 16, 28, '{[109,120]}'::int4multirange),
  ('paint', 'eggshell white', 9, 14, 28, '{[63,74],[201,208]}'::int4multirange),
  ('paint', 'roller', 6, 10, 28, '{[0,8],[65,80],[157,176]}'::int4multirange),
  ('paint', 'painter''s tape', 20, 18, 28, '{[102,109]}'::int4multirange),
  ('paint', 'drop cloth', 15, 10, 28, '{[169,180]}'::int4multirange),
  ('paint', 'paint brush set', 9, 8, 28, '{[77,92]}'::int4multirange),
  ('paint', 'ceiling white', 8, 10, 28, '{[0,4],[65,84],[185,196]}'::int4multirange),
  ('paint', 'deck stain', 3, 6, 28, '{[117,140]}'::int4multirange),
  ('paint', 'sandpaper', 40, 30, 28, '{}'::int4multirange),
  ('plants', 'monstera', 2, 6, 28, '{[0,12],[69,100],[177,200]}'::int4multirange),
  ('plants', 'pothos', 7, 10, 28, '{[135,144]}'::int4multirange),
  ('plants', 'snake plant', 5, 6, 28, '{[41,60],[209,220]}'::int4multirange),
  ('plants', 'terracotta pot', 16, 12, 28, '{}'::int4multirange),
  ('plants', 'fiddle-leaf fig', 2, 3, 28, '{[0,16],[89,112],[185,212]}'::int4multirange),
  ('plants', 'succulent', 25, 15, 28, '{}'::int4multirange),
  ('plants', 'potting soil', 12, 12, 28, '{[117,124]}'::int4multirange),
  ('plants', 'basil', 4, 8, 28, '{[57,68]}'::int4multirange),
  ('plants', 'orchid', 1, 3, 28, '{[29,56],[141,168]}'::int4multirange)
) AS p (shop_id, product, base, amp, cycle, empty)
CROSS JOIN generate_series(0, 239) AS k;

COMMIT;
