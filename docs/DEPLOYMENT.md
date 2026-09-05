# Deploying the data API

`apps/data-api` is a Cloudflare Worker that serves the dataset in `data/dist`.
It is deployed **from this repository by CI**, so merging to `main` is what
changes what it serves. That is deliberate: it is the one surface here that
behaves the way the whole project should, and it doubles as a working example of
the CI/CD that audit Issue 9 says the site is missing.

It is a **separate Worker** from the `cfb-apex` site Worker. Sharing a name
would let a CI deploy silently overwrite a `wrangler deploy` from the owner's
machine, or the reverse.

## One-time setup

Add two repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | An API token with **Edit Cloudflare Workers** on the account |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID that already hosts the `cfb-apex` Worker |

Until both exist, `.github/workflows/deploy-data-api.yml` reports what is
missing in the job summary and exits successfully — an absent credential should
not look like a broken build.

Optionally add a repository **variable** `DATA_API_BASE_URL` (e.g.
`https://cfb-apex-data.<subdomain>.workers.dev`) to turn on the post-deploy
smoke test.

## What a merge does

1. `data-build.yml` rebuilds `data/dist` from `data/source` and fails if the
   committed output differs — so no artifact can be hand-edited.
2. `validate.py` checks provenance, cross-dataset references, index/file
   agreement, and that no fixture-pack name survived.
3. `deploy-data-api.yml` stages `data/dist` into the Worker's asset directory
   and runs `wrangler deploy --env production`.
4. The smoke test asserts the deployment serves 138 real teams and **no** fixture
   data.

Deploys are serialised with a concurrency group, so two merges cannot race.

## Deploying by hand

```bash
npm ci
npm run build          # builds the reader, stages data/dist into apps/data-api/public/v1
npm run deploy         # wrangler deploy --env production

SMOKE_BASE_URL=https://cfb-apex-data.<subdomain>.workers.dev \
  node apps/data-api/scripts/smoke.mjs
```

Locally:

```bash
npm run dev            # wrangler dev on http://127.0.0.1:8787
```

## What it serves

| Path | Returns |
|---|---|
| `/` | A server-rendered browser over the dataset — open it to see real teams |
| `/browse/:slug` | One team: starters, staff, schedule, injuries, roster |
| `/v1/**` | The raw artifacts, byte-for-byte as committed (`/v1/teams.json`, `/v1/rosters/clemson.json`, …) |
| `/api/health` | Liveness plus the build manifest |
| `/api/routes` | The endpoint list |
| `/api/teams` | All 138 programs |
| `/api/teams/:slug` | Full profile — roster, depth chart, schedule, staff, SOS, polls, injuries |
| `/api/conferences`, `/api/conferences/:slug` | Conferences and membership |
| `/api/rankings` | AP and Coaches Top 25 |
| `/api/scoreboard` | 2026 games played so far |
| `/api/schedule?from=YYYY-MM-DD` | Upcoming games across all teams |
| `/api/sos/:season` | Strength of schedule (2026 or 2025) |
| `/api/stats/historical/:season` | Team, individual and advanced stats for one season |
| `/api/injuries` | Latest availability report |
| `/api/search?q=` | Team lookup |

## Configuration

Set in `apps/data-api/wrangler.toml`:

- **`ALLOWED_ORIGINS`** — defaults to `*`. Narrow it to the site's origins once
  the front end consumes the API.
- **`DATASET_VERSION`** — reported by `/api/health`.
- **Custom domain** — a commented `[[env.production.routes]]` block is ready for
  a hostname such as `data.cfbapex.com`; uncomment it once the DNS record exists.

## Notes

- The dataset is served from Cloudflare's static-asset store, not KV or R2. There
  is no database to drift out of sync with the repository: the deploy *is* the
  update.
- Responses carry `max-age=300, stale-while-revalidate=86400`. A deploy publishes
  a new asset set with new ETags, so a merge is visible on the next request
  rather than after the cache expires.
- The browse pages send `noindex, nofollow`. This is an internal verification
  surface and must not be indexed; the site's own launch gates are unaffected by
  it either way.
