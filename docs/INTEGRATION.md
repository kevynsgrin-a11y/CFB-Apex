# Getting real data onto cfbapex.com

## Read this first

Merging this pull request **cannot on its own change what `cfbapex.com`
renders.** That is not a limitation of this change; it is the state of the
project, recorded as audit Issue 9 in [`README.md`](../README.md):

- The site's application source is **not in this repository**. The deployed
  bundle leaks its build path (`C:/Users/Dell/OneDrive/Desktop/Documents/CFB
  Hub/`), so the source lives on one Windows/OneDrive machine.
- It is published straight to Cloudflare with `wrangler deploy`. The Workers
  Builds API reports **zero recorded builds**, so nothing deploys the site from
  version control.

So a merge here changes two things immediately, and a third only once someone
carries the change to the machine that holds the app:

| On merge | Effect |
|---|---|
| The dataset is on `main` | Reviewable, diffable, reproducible from source |
| CI deploys `apps/data-api` | A live JSON API serving the real data — see [DEPLOYMENT.md](./DEPLOYMENT.md) |
| The site itself | **Unchanged** until step A or B below is done |

The single highest-value follow-up remains getting the app source into this
repository. Until then every route below is a hand-carry.

---

## Route A — the site reads the data at build time (recommended)

Best for the Next.js/vinext app: pages render from local JSON, so there is no
network call on the request path and a slow API can never blank a page.

**1. Vendor the dataset and the reader into the CFB Hub tree.**

```bash
# from the CFB Hub project root
git clone https://github.com/kevynsgrin-a11y/CFB-Apex /tmp/cfb-apex
cp -r /tmp/cfb-apex/data/dist            ./data/cfb-2026
cp -r /tmp/cfb-apex/packages/cfb-data    ./packages/cfb-data
npm install ./packages/cfb-data
```

**2. Replace the fixture provider.** Wherever the app currently loads
`fixture-pack-2026.07.31`:

```ts
import { createFileClient } from "@cfb-apex/data";

// One client for the whole build. Reads JSON off disk; nothing is fetched.
export const cfb = createFileClient(
  process.env.CFB_DATA_DIR ?? "./data/cfb-2026",
);
```

**3. Point the pages at it.** The reader is shaped around the routes the app
already has (they are enumerated in `patches/app/sitemap.ts`):

| Route | Call |
|---|---|
| `/teams` | `cfb.teams()` |
| `/teams/:slug` | `cfb.teamProfile(slug)` — roster, depth chart, schedule, staff, SOS, polls, injuries in one object |
| `/conferences` | `cfb.conferences()` |
| `/conferences/:slug` | `cfb.teamsByConference(slug)` |
| `/rankings` | `cfb.top25("ap")`, `cfb.top25("coaches")` |
| `/schedule` | `cfb.upcomingGames("2026-09-05")` |
| `/scores` | `cfb.currentSeasonStats()` |
| `/coaches` | `cfb.coachingIndex()` |
| `/coaches/:slug` | `cfb.coaching(slug)` |
| Historical pages | `cfb.seasons()`, `cfb.teamHistory(slug)`, `cfb.historicalTeamStats(2025)` |

**4. Enumerate the detail routes in the sitemap.** `patches/app/sitemap.ts`
deliberately omits `/teams/:slug` and friends with this comment:

> Dynamic detail routes are intentionally NOT enumerated while the data layer is
> fixture-backed. Add them here once real, licensed entities exist — the fixture
> universe is fictional and must never be submitted for discovery.

That condition is now met for the entities this dataset covers. Add them from
the dataset rather than from a hard-coded list, so the sitemap can never claim a
page the data cannot fill:

```ts
const cfb = createFileClient("./data/cfb-2026");
const teams = await cfb.teams();
const dynamicRoutes = teams.map((team) => `/teams/${team.slug}`);
```

**5. Handle the gaps.** 46 teams have no roster in the package and 32 have no
SOS (see [DATASET.md](./DATASET.md)). The reader returns `null` for those rather
than throwing. Render "not available for this team" — never an empty table,
which reads as "this team has no players".

**6. Build and deploy** as you do today (`wrangler deploy` from the CFB Hub
machine).

---

## Route B — the site reads the deployed API at runtime

Lighter to wire up, and the dataset can be updated without rebuilding the site.
The cost is a network dependency on the request path.

```ts
import { createHttpClient } from "@cfb-apex/data";

export const cfb = createHttpClient(process.env.CFB_DATA_API_URL!);
// e.g. https://cfb-apex-data.<subdomain>.workers.dev/v1
```

Everything else is identical — same methods, same types. Set
`ALLOWED_ORIGINS` on the data API to the site's origins rather than leaving it
`*` (see `apps/data-api/wrangler.toml`).

---

## The launch gates

Real data is necessary but **not sufficient** to make the site public. Per
[`VERIFICATION.md`](../VERIFICATION.md), the live Worker has twelve gates and
`isProductionLaunchReady()` requires all of them:

| Gate | Now | After this change |
|---|---|---|
| `DEMO_MODE` | `true` | must become `"false"` — this is what makes the site serve fixtures |
| `DISABLE_LIVE_PROVIDERS` | `true` | must become `"false"` |
| `ENTITY_CROSSWALK_VERIFIED` | `false` | this dataset's 138-team registry with cross-source name resolution is the crosswalk |
| `PUBLIC_LAUNCH_APPROVED` | `false` | a human decision |
| `LEGAL_LAUNCH_APPROVED` | `false` | a human decision |
| `MARKS_POLICY_APPROVED` | `false` | a human decision — school names and marks |
| `CORE_DATA_RIGHTS_APPROVED` | `false` | a human decision — see rights below |
| `POLL_RIGHTS_APPROVED` | `false` | a human decision — AP and Coaches Poll are licensed products |
| `PROVIDER_CREDENTIALS_CONFIGURED` | `false` | n/a for this dataset: it has no upstream provider |
| `SHADOW_PILOT_PASSED`, `INGESTION_RECOVERY_DRILL_PASSED`, `KILL_SWITCH_DRILL_PASSED`, `ON_CALL_OWNER_ASSIGNED` | `false` | operational, unchanged by this PR |

**Two things worth being direct about.**

*Do not flip `DEMO_MODE` and `DISABLE_LIVE_PROVIDERS` in production before the
site has actually been repointed at this dataset.* Between those two states the
site would be live-mode with no data source at all.

*The rights gates are real and this change does not clear them.* The dataset is
compiled from published sources — athletics sites, conference releases, ESPN,
AP, USA Today, Phil Steele, TeamRankings, footballdb, FEI and SP+ — each cited
per artifact in `meta.sources`. Rankings and rating systems in particular are
licensed products. `MARKS_POLICY_APPROVED`, `CORE_DATA_RIGHTS_APPROVED` and
`POLL_RIGHTS_APPROVED` are the project's own gates for exactly this, and they
are a legal decision, not an engineering one. Nothing here should be read as
clearing them.

Also note NF-1 in [`FINDINGS-NEW.md`](../FINDINGS-NEW.md): `/admin` trusts a
spoofable header and is only safe because `ADMIN_EMAILS` is unset. Do not set it
until that is fixed.

---

## Verifying after deploy

```bash
# The site should no longer mention the fixture universe anywhere.
curl -s https://cfbapex.com/teams | grep -ci "red mesa\|blue ridge state"   # expect 0

# Real programs should be present.
curl -s https://cfbapex.com/teams/clemson | grep -c "Dabo Swinney"          # expect >= 1

# The indexing gates should still hold until the launch decision is made.
curl -sI https://cfbapex.com/ | grep -i x-robots-tag   # expect: noindex, nofollow, noarchive
```

The dataset itself can be checked independently at any time:

```bash
python3 tools/etl/build.py --check   # data/dist matches a clean rebuild
python3 tools/etl/validate.py        # provenance, cross-references, no fixture leakage
npm test                             # reader behaviour against the real dataset
```
