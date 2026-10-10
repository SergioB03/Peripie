# Loading the database

Two files, run in order: `schema.sql` (tables, hypertable, index; safe to re-run) and `seed.sql` (empties both tables and re-inserts; safe to re-run). `seed.sql` is generated from `seed-data.js`, the single source of truth that the in-memory fallback in `server/stock.js` also reads. If you change the seed, run `node db/seed-data.js --write-sql` and commit both files.

## Into Tiger Data (once `DATABASE_URL` exists)

There is no local `psql` on this machine, so use the one inside the TimescaleDB image (Docker Desktop must be running). From the repo root, in PowerShell:

```powershell
$env:DATABASE_URL = '<Tiger service URL, ending ?sslmode=require>'
docker run --rm -v "${PWD}\db:/db" timescale/timescaledb:latest-pg17 psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f /db/schema.sql
docker run --rm -v "${PWD}\db:/db" timescale/timescaledb:latest-pg17 psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f /db/seed.sql
```

Where `psql` exists (for example the Replit shell):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
```

Tiger CLI equivalents: `tiger db query <service-id> -f db/schema.sql`, then the same with `db/seed.sql`.

## Sunday morning

Re-run `seed.sql` before the demo. Restock dates are computed from `current_date`, so re-seeding moves the baguette's "tomorrow" to Monday and ends the stock history at demo time.

## Checking it worked

```sql
SELECT shop_id, product, on_hand, next_restock FROM inventory ORDER BY 1, 2;
SELECT count(*) FROM stock_events;   -- 2880 after a fresh seed
```

Or from Node, with `DATABASE_URL` set:

```bash
node --input-type=module -e "const m = await import('./server/stock.js'); console.log(await m.checkStock('bakery', 'croissants'))"
```

The server never needs the database to start: with no `DATABASE_URL`, or if the database is unreachable, `checkStock` answers from the built-in seed and logs one warning.
