# Deploying Peripie on Replit

Steps for Sergio, checked against docs.replit.com on Sat Oct 10, 2026. The repo's `.replit` already sets the run command (`npm start`), Node 24 (`nodejs-24`) and port 3000 to 80.

## 1. Import
1. Open `https://replit.com/github.com/SergioB03/Peripie` and press Enter (this works because the repo is public). Or: replit.com/import > **GitHub** > connect GitHub > pick the repo > **Import**.
2. Let the import finish. If Agent proposes code changes, skip them; nothing needs changing.

## 2. Secrets
**Tools** > **Secrets** (under Setup) > **New Secret** > enter Key and Value > **Add Secret**. Values come from your `.env`.
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `DATABASE_URL`: the Tiger Data URL, ending in `?sslmode=require`
- `ELEVENLABS_VOICE_ID`: optional, the code has a default voice
- `GEMINI_MODEL`: optional, leave it out (the code defaults to `gemini-3.5-flash-lite`)

Do not add `PORT`; Replit sets it. Do not add Replit's own database. If a `DATABASE_URL` is already listed and contains `helium` or `neon.tech`, that is Replit's database: edit it to the Tiger Data URL.

## 3. Run it once in the workspace
1. Open the **Shell** tool and run `npm ci` (installs exactly what `package-lock.json` lists).
2. Press **Run**. The Console should print `Peripie listening on 0.0.0.0:3000` and no "not set" warning.
3. In the Shell, `curl -s localhost:3000/health` prints `{"ok":true}`. In Preview, enter the bakery and ask for sourdough.

## 4. Publish
1. Select **Publish** (top right). Domain: pick a `.replit.app` name, e.g. `peripie`. Access: **Public**.
2. Select **Adjust settings**:
   - **Deployment type**: **Reserved VM** for the demo window; it never sleeps. Under **Machine configuration** > **Edit**, take the smallest (0.5 vCPU / 2 GB, shared): $0.0208 an hour, about $0.50 a day or $15 a month, paid from your monthly credits first. Starter plan credits cover only Autoscale and Static; if Reserved VM is not offered, keep **Autoscale** (the default) and read "Cold start" below.
   - If asked web server or background worker: **Web server**.
   - Run command: `npm start` (from `.replit`). Build command: leave empty.
   - **Production app secrets**: check that every key from step 2 is listed with the same value, and add any that are missing. The docs disagree on whether they copy over by themselves.
3. Health check: the docs show no path setting. Before going live, Replit requests the homepage and needs an answer within 5 seconds. `/` is the static page, so it passes; `/health` is for your own checks.
4. Select **Publish**. Stages: Provision, Security checks, Build, Bundle, Promote (a minute or two; **View logs** shows detail). When it finishes, the public URL `https://<name>.replit.app` shows in the Publishing pane.

## 5. Zero Data settings
Keep off:
- **Enable analytics** (Publishing, under **Suggested add-ons**): it adds Replit's tracker to the page.
- The **feedback widget** (Publishing, **Engagement tools**): it collects visitor text.
- **Add metrics with Agent** (Tools > **Growth**).

The docs show no off switch for these, so disclose them in the README's Zero Data statement:
- **Monitoring** counts requests and unique IPs. **Growth** shows visitors, top pages, referrers, countries, browsers and devices from IP traffic data; the docs do not say whether this stops with analytics off.
- Google's serving layer sets a `GAESA` routing cookie on every published app.
- Deployment logs are kept 30 days; the server writes only method, path, status and milliseconds.

**Enable app monitoring** (under **Monitoring tools**) only checks that the app is up and emails you; it is fine to turn on.

## 6. Test on a phone
1. With Wi-Fi off, open `https://<name>.replit.app/health`: `{"ok":true}`.
2. Open `https://<name>.replit.app`, pick the bakery, tap **Enter shop**: the greeting plays.
3. Ask for sourdough (in stock), then croissants (out, back Tuesday, October 13). No sound: check the volume and the iPhone silent switch.

## 7. Redeploy after a `git pull`
Replit does not pull from GitHub by itself. The Git pane's auto-sync is two-way and would push Replit's own edits to `main`, so leave it off.
1. **Tools** > **Git** (add it with **+** if missing) > **Pull**, or in the Shell: `git pull origin main`.
2. If `package.json` changed, run `npm ci`. Press **Run** and check Preview.
3. **Publishing** > **Republish**. Same URL; the live app changes only when you republish.

## If it breaks
- **Port not detected** ("Application failed to respond", or Promote fails): the Console must print `listening on 0.0.0.0:3000`. If it prints another port, set `localPort` in `.replit` to that number. Keep one `[[ports]]` entry, with `externalPort = 80`; delete any extra entry Replit added, then publish again.
- **Cold start** (Autoscale only): after 15 minutes idle, the first request takes a few seconds and the greeting may fall back to the browser voice. Switch to Reserved VM, or open the URL on the second device a minute before each judge.
- **Missing secret**: Publishing > **Logs** shows `GEMINI_API_KEY not set`, `ELEVENLABS_API_KEY not set` or `[stock] DATABASE_URL is not set`. Add it under **Production app secrets**, then publish again. `[stock] database unavailable` means the Tiger URL is wrong or Tiger is down; `[stock] no inventory rows ... (seed not loaded?)` means `DATABASE_URL` is Replit's database or Tiger is not seeded.
- **Publish stuck**: Ctrl+K > **Restart compute**, then publish again. After judging, shut the deployment down in Publishing to stop the charge.

## Sources (docs.replit.com, read Oct 10, 2026)
- Import: https://docs.replit.com/build/import-from-providers
- `.replit` keys: https://docs.replit.com/features/project-setup/configuration
- Ports: https://docs.replit.com/features/project-setup/ports
- Modules: https://docs.replit.com/features/project-setup/dependency-management. The docs list no Node module names; `nodejs-24` is in Replit's active module list, https://github.com/replit/nixmodules/blob/main/pkgs/modules/default.nix
- Secrets: https://docs.replit.com/core-concepts/project-editor/app-setup/secrets
- Publishing: https://docs.replit.com/features/publishing/overview, https://docs.replit.com/build/publish-your-app
- Deployment types: https://docs.replit.com/features/publishing/deployment-types
- Costs: https://docs.replit.com/billing/deployment-pricing, https://docs.replit.com/billing/aug-cloud-billing-updates, https://docs.replit.com/billing/plans/starter-plan
- Health check, ports, logs: https://docs.replit.com/build/troubleshooting, https://docs.replit.com/help/deployment-and-publishing, https://docs.replit.com/help/networking-and-app-errors
- Analytics and monitoring: https://docs.replit.com/features/publishing/project-analytics, https://docs.replit.com/features/publishing/monitoring-a-deployment
- Git: https://docs.replit.com/features/workspace-tools/git-interface, https://docs.replit.com/help/projects-and-files
- Replit's database and `DATABASE_URL`: https://docs.replit.com/features/data-and-storage/development-and-production
