# Bug Verification — Critical Issues 1–3 (Indexing Triad)

Each issue below was **confirmed against the live production Cloudflare Worker**
(script `cfb-apex`) before any fix was written. Evidence is quoted verbatim from the
deployed bundle actually serving `cfbapex.com`.

Verified: 28 August 2026.

> The audit's severity scale is Critical / High / Medium / Low. "Urgent" maps to the
> three **Critical** issues, all three of which are the same root problem: the site is
> blocked from search indexing on three independent, redundant layers.

---

## How verification was performed

Direct HTTP access to `cfbapex.com` is blocked at the network layer for this
environment (confirmed to be an environment-wide egress policy, not a site fault —
control fetches to unrelated domains fail identically). Verification therefore used
the **deployed Worker bundle as ground truth**, retrieved live from the Cloudflare
account, plus the Cloudflare control plane for bindings and configuration.

For these three issues this is *stronger* evidence than a single black-box response
would be: it reads the exact code that generates the behavior on every request, rather
than inferring behavior from one observed sample.

---

## Issue 1 — `X-Robots-Tag: noindex, nofollow, noarchive` on every response

**Status: CONFIRMED.**

`worker/index.ts` → `secureResponse()`, deployed bundle **line 33184**:

```js
secured.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
```

The header is set **unconditionally** — there is no environment check, no flag, and no
route exclusion. Every response returned by the Worker passes through this function.
Confirmed at all three call sites (bundle lines 33203, 33213, 33214):

```js
// www -> apex canonical redirect
return secureResponse(new Response(null, { status: 308, ... }), url);
// image optimization route
if (url.pathname === "/_vinext/image") return secureResponse(await handleImageOptimization(...), url);
// every application route
return secureResponse(await app_router_entry_default.fetch(request, env, ctx), url);
```

**Impact:** even if `robots.txt` were opened, this header alone would keep every page
out of the index — and because it is also applied to the canonical 308 redirect, it
suppresses `www` → apex signal consolidation.

**Note for the fix:** `secureResponse` currently has the signature
`secureResponse(response, url)` and does not receive `env`. However `env` **is** in
scope at all three call sites (they sit inside `fetch(request, env, ctx)`), so
threading it through is a safe, local change.

---

## Issue 2 — `robots.txt` disallows all crawlers site-wide

**Status: CONFIRMED.**

`app/robots.ts`, deployed bundle **lines 32350–32355**:

```js
function robots() {
	return { rules: {
		userAgent: "*",
		disallow: "/"
	} };
}
```

Registered as a metadata route serving `/robots.txt` (bundle lines 32775–32784).
No sitemap directive is emitted.

**Impact:** blanket `Disallow: /` for every compliant crawler.

---

## Issue 3 — `sitemap.xml` returns zero URLs

**Status: CONFIRMED.**

`app/sitemap.ts`, deployed bundle **lines 32359–32361**:

```js
function sitemap() {
	return [];
}
```

Registered as a metadata route serving `/sitemap.xml` (bundle lines 32785–32792).
The route emits structurally valid XML with an empty `<urlset>`.

**Impact:** no URLs are ever submitted for discovery.

---

## Corroborating external evidence

- `site:cfbapex.com` — **zero results**.
- Brand query `"CFB Apex" college football` — **zero results** referencing the property.

Consistent with all three layers being active simultaneously.

---

## Confirmed current gate state

Live Worker bindings at verification time (these make the fix behavior-preserving —
see below):

| Binding | Value |
|---|---|
| `DEMO_MODE` | `true` |
| `DISABLE_LIVE_PROVIDERS` | `true` |
| `PUBLIC_LAUNCH_APPROVED` | `false` |
| `LEGAL_LAUNCH_APPROVED` | `false` |
| `MARKS_POLICY_APPROVED` | `false` |
| `CORE_DATA_RIGHTS_APPROVED` | `false` |
| `SITE_URL` | `https://cfbapex.com` |

Plus `POLL_RIGHTS_APPROVED`, `ENTITY_CROSSWALK_VERIFIED`,
`PROVIDER_CREDENTIALS_CONFIGURED`, `SHADOW_PILOT_PASSED`,
`INGESTION_RECOVERY_DRILL_PASSED`, `KILL_SWITCH_DRILL_PASSED`,
`ON_CALL_OWNER_ASSIGNED` — all `false`.

---

## Root-cause assessment

These are **not defects**. They are a deliberate, well-engineered pre-launch gate on a
site currently serving entirely fictional fixture data (`fixture-pack-2026.07.31`,
teams such as "Red Mesa" and "Blue Ridge State").

The actual defect is narrower and worth stating precisely:

> The indexing block is **hard-coded** rather than **gated**, so going live requires a
> source change and redeploy in three separate files, instead of flipping the launch
> flags the project already maintains for exactly this purpose.

That is what the accompanying patches fix. They do **not** open the site to crawlers.

---

## Why the fix is behavior-preserving today

The patches gate all three layers on `isProductionLaunchReady(env)` — the project's
**existing** helper in `lib/release-readiness.ts` (bundle lines 31941–32027), already
used by `app/admin/page.tsx` and the data-sources status surface.

Because that helper requires **all twelve** gates to pass — and `DEMO_MODE` is `true`,
`DISABLE_LIVE_PROVIDERS` is `true`, and every approval flag is `false` — it currently
returns `false`. Applying these patches therefore produces **byte-identical
crawler-facing behavior**: still `Disallow: /`, still `noindex`, still gated.

The change is purely structural: it converts a code change into a flag flip.

**This is deliberately stricter than the audit's own written recommendation.** The
audit (Document 2, Issues 1–2) proposed gating on `PUBLIC_LAUNCH_APPROVED` alone.
Using `isProductionLaunchReady()` is safer, because it also requires the `LIVE_MODE`
gate (`DEMO_MODE === "false"` **and** `DISABLE_LIVE_PROVIDERS === "false"`). That makes
it structurally impossible to index the site while it is still serving fixture data —
a failure mode the single-flag version would have allowed.

---

## Post-fix verification run

The behavior-preservation claim above was **executed, not assumed**. The gate logic was
transcribed verbatim from the deployed bundle (lines 31942–32027) and the patched
`robots()` and `secureResponse()` decisions were run against the real production
binding values recorded above.

```
--- A. Current production env (behavior MUST be unchanged) ---
PASS  launch gate closed
PASS  robots.txt still Disallow: /
PASS  robots.txt advertises no sitemap
PASS  X-Robots-Tag noindex still applied

--- B. The audit's ORIGINAL single-flag advice (the hole this closes) ---
PASS  PUBLIC_LAUNCH_APPROVED alone does NOT open indexing
      (still serving DEMO_MODE=true fixture data — correctly stays private)

--- C. All gates satisfied (launch path works) ---
PASS  launch gate open
PASS  robots.txt switches to Allow
PASS  sitemap advertised
PASS  X-Robots-Tag noindex dropped

--- D. Fail-safe: missing/undefined env ---
PASS  undefined env still noindexes
PASS  empty env still noindexes
PASS  empty env robots still disallows

ALL CHECKS PASSED
```

Group **A** is the important one: it confirms the patches change nothing a crawler can
observe today. Group **D** confirms the fail-safe direction — if `env` is not threaded
correctly to a call site, the gate evaluates as unmet and the noindex header is still
applied. The failure mode is "stays private", never "accidentally indexed".

Both `patches/app/robots.ts` and `patches/app/sitemap.ts` were additionally
syntax-checked (`node --experimental-strip-types --check`) and parse cleanly.

**Not verified:** these checks exercise transcribed logic, not the real modules, because
the project source is not in this repository (see `README.md`). They confirm the fix
logic is correct; they do not substitute for building and running the patched files in
the real project before deploying.
