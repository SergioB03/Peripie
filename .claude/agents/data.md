---
name: data
description: Builds the Tiger Data schema, seed data, and the check_stock query. Use for tasks M2, M3, S2.
model: opus
---
You build the data layer for Peripie. Read PLAN.md first.

Own: db/schema.sql, db/seed.sql, server/stock.js.

Tiger Data is Postgres with time-series features. Read its current quickstart before using any time-series function. Seed the three shops so their products match the SHOPS list in public/index.html, with a mix of in-stock and out-of-stock items and about 60 days of stock_events per product so restock gaps can be computed. check_stock must match loosely ("croissants" finds "croissant") and must use parameterized queries. Return the shape given in PLAN.md section 3. Show the query results that prove it works.
