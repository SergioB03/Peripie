# Loading the database

Two files, run in order: `schema.sql` (tables, hypertable, index; safe to re-run) and `seed.sql` (empties both tables and re-inserts; safe to re-run). `seed.sql` is generated from `seed-data.js`, the single source of truth that the in-memory fallback in `server/stock.js` also reads. If you change the seed, run `node db/seed-data.js --write-sql` and commit both files.

Since Oct 11, `schema.sql` also adds columns to an existing database (`inventory.restock_rule` and `restock_note`, with `ADD COLUMN IF NOT EXISTS`), so on a database created before that, run `schema.sql` again and then `seed.sql`, which fills them; the server answers from the built-in seed (log line `missing the restock columns (42703)`) until both have run.

## Why `TIGER_DATABASE_URL`

`server/stock.js` reads `TIGER_DATABASE_URL` first and falls back to `DATABASE_URL`. Replit provisions its own Postgres for every app under the name `DATABASE_URL`, so if the server read that name, the live app would connect to Replit's empty database, find no inventory rows and answer from the built-in seed instead of Tiger Data, with nothing visibly wrong. On Replit, put the Tiger service URL in the `TIGER_DATABASE_URL` secret. Locally, either name works.

## Into Tiger Data (once you have the Tiger service URL)

There is no local `psql` on this machine, so use the one inside the TimescaleDB image (Docker Desktop must be running). From the repo root, in PowerShell:

```powershell
$env:TIGER_DATABASE_URL = '<Tiger service URL, ending ?sslmode=require>'
docker run --rm -v "${PWD}\db:/db" timescale/timescaledb:latest-pg17 psql "$env:TIGER_DATABASE_URL" -v ON_ERROR_STOP=1 -f /db/schema.sql
docker run --rm -v "${PWD}\db:/db" timescale/timescaledb:latest-pg17 psql "$env:TIGER_DATABASE_URL" -v ON_ERROR_STOP=1 -f /db/seed.sql
```

Where `psql` exists (for example the Replit shell; there, `$DATABASE_URL` is Replit's own database, so use `$TIGER_DATABASE_URL`):

```bash
psql "$TIGER_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$TIGER_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
```

Tiger CLI equivalents: `tiger db query <service-id> -f db/schema.sql`, then the same with `db/seed.sql`.

## Sunday morning

Re-run `seed.sql` before the demo. Restock dates are computed from `current_date`, so re-seeding moves the baguette's "tomorrow" to Monday and ends the stock history at demo time.

## Checking it worked

```sql
SELECT shop_id, product, on_hand, next_restock FROM inventory ORDER BY 1, 2;
SELECT count(*) FROM stock_events;   -- 2880 after a fresh seed
```

Or from Node, with `TIGER_DATABASE_URL` set:

```bash
node --input-type=module -e "const m = await import('./server/stock.js'); console.log(await m.checkStock('bakery', 'croissants'))"
```

At startup the server logs which variable it uses, with the host only, never credentials. On the live app it must be the Tiger host:

```
[stock] using TIGER_DATABASE_URL (xyz.tsdb.cloud.timescale.com)
```

If it says `using DATABASE_URL`, the `TIGER_DATABASE_URL` secret is missing. All but the last of these lines mean the clerk is answering from the built-in seed:

| Log line | Meaning |
|---|---|
| `TIGER_DATABASE_URL and DATABASE_URL are not set` | No database configured |
| `database has no inventory rows for bakery: seed not loaded?` | Connected, but `seed.sql` was not run on that database |
| `database is missing the Peripie tables (42P01): schema not loaded?` | Connected, but `schema.sql` was not run on that database |
| `database is missing the restock columns (42703): db/schema.sql not re-run since Oct 11?` | Connected, but the current `schema.sql` was not re-run on that database (the two restock columns are missing); run it, then `seed.sql` |
| `database unavailable (<code>); ... retrying every 10 s in the background` | Connecting failed or timed out (2 s), or a query timed out (3 s). Later questions skip the database without waiting until a background check gets through |
| `database reachable again after N s; answering from it` | That background check got through; questions use the database again |

The server never needs the database to start, and `checkStock` never fails: when the database cannot answer, it answers from the built-in seed and says why in the log. A healthy connection is opened at startup and kept open, so questions do not pay a new TLS handshake. It never logs the visitor's text.
