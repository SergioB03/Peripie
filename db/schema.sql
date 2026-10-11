-- Peripie schema for Tiger Data (PostgreSQL with TimescaleDB). Safe to run more than once.
-- Load this, then db/seed.sql:
--   psql "$TIGER_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
--   psql "$TIGER_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
-- (db/README.md has the Docker form for a machine without psql.)

CREATE EXTENSION IF NOT EXISTS timescaledb; -- already enabled on Tiger Cloud

-- What each shop has right now: one row per product.
CREATE TABLE IF NOT EXISTS inventory (
  shop_id      text NOT NULL,                     -- bakery | paint | plants
  product      text NOT NULL,                     -- as the clerk says it: 'croissant'
  on_hand      int  NOT NULL CHECK (on_hand >= 0),
  next_restock date,                              -- next delivery, shop-local date
  PRIMARY KEY (shop_id, product)
);

-- How the shop restocks it, in words, so the clerk can say "in about 18 minutes" instead of a
-- date. Added Oct 11; ADD COLUMN IF NOT EXISTS so this file still re-runs on a database that
-- was created before. Run db/seed.sql again afterwards to fill them.
--   restock_rule  'every:20;07:00-17:00' (a batch every 20 minutes from 7 am to 5 pm),
--                 'daily:07:00,14:00' (batches at those times), 'weekly:friday' (a delivery
--                 every Friday), or NULL (only next_restock is known). Parsed in Node
--                 (db/seed-data.js parseRule), in America/New_York.
--   restock_note  the shop's own sentence, with {when} filled in by check_stock:
--                 'The next tray of croissants comes out of the oven {when}.'
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS restock_rule text;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS restock_note text;

-- Stock level over time, one row per reading: a hypertable partitioned on ts.
-- No serial id: any unique index on a hypertable must include ts, and nothing needs one.
CREATE TABLE IF NOT EXISTS stock_events (
  ts       timestamptz NOT NULL,
  shop_id  text        NOT NULL,
  product  text        NOT NULL,
  on_hand  int         NOT NULL CHECK (on_hand >= 0)
);

SELECT create_hypertable('stock_events', by_range('ts'), if_not_exists => TRUE);

-- check_stock reads one shop's history per product, in time order.
CREATE INDEX IF NOT EXISTS stock_events_shop_product_ts_idx
  ON stock_events (shop_id, product, ts);
