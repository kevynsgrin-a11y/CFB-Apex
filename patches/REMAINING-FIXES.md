# Remaining Fixes — Verbatim Changes

Everything from the audit not covered by the two `worker/index.ts` diffs, the
`robots.ts`/`sitemap.ts` replacements, the PWA manifest, or the print stylesheet.

Each entry gives the exact change. Items needing a decision rather than an edit are
marked **NEEDS DECISION**.

| # | Issue | Severity | Effort |
|---|---|---|---|
| 6 | Placeholder support email | High | Quick |
| 7b | Manifest not linked from layout | High | Quick |
| 8 | Missing responsible-gaming helpline | High | Quick |
| 11 | Atom feed stubs return 503 | Medium | Quick |
| 12 | Logpush disabled | Medium | Quick (Cloudflare) |
| 14b | Print stylesheet not imported | Medium | Quick |
| 16 | No analytics | Medium | Quick |
| 4 | CSP `'unsafe-inline'` | High | **Longer-term** |
| 18 | JSON-LD limited to homepage | Low | Longer-term |
| 20 | Image-route CSP conflict | Low | Verify |

---

## Issue 6 — Placeholder support email

`lib/config.ts` ships `corrections@example.invalid`, while Cloudflare Email Routing
(MX + SPF + DKIM) is already live on the zone.

```ts
// lib/config.ts
var brand = {
	name: "CFB Apex",
	shortName: "CFB Apex",
	eyebrow: "Independent college football intelligence",
	tagline: "Every Saturday. One command center.",
	description: "Scores, roster movement, playoff paths, coaching economics, and gameday intelligence in one fast, source-aware workspace.",
	supportEmail: "corrections@cfbapex.com",
};
```

**The mailbox side is already done** — an Email Routing rule for
`corrections@cfbapex.com` was created on 28 Aug 2026, pointing at the
`congruent-mail-ingest` Worker to match the five existing role addresses
(`hello@`, `security@`, `admin@`, `ads@`, `affiliates@`). No further routing setup is
needed; only the `lib/config.ts` change above remains.

---

## Issue 7b — Link the manifest from the root layout

The manifest file is at `patches/public/manifest.webmanifest`; copy it to
`public/manifest.webmanifest`, then reference it.

If `app/layout.tsx` exports a metadata object, prefer the framework API:

```ts
export const metadata = {
	// ...existing fields
	manifest: "/manifest.webmanifest",
	icons: {
		icon: [
			{ url: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
	},
};

export const viewport = {
	// ...existing fields
	themeColor: "#07100D",
};
```

Otherwise add to `<head>` directly:

```html
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#07100D" />
```

**Icons still need producing** (audit Issue 17 — this review could not confirm any icon
assets exist). Required in `public/`: `icon-192.png`, `icon-512.png`,
`icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180×180),
plus `favicon.ico`. Maskable variants need ~20% safe-area padding or Android will crop
the artwork. Background `#07100D` matches the "Night" token.

While producing icons, also confirm `/og.png` exists — `generateMetadata()` references
`new URL("/og.png", origin)`, and if that asset is missing every social share renders
without an image.

---

## Issue 8 — Responsible-gaming helpline

The page already self-identifies the gap: *"Jurisdiction-specific helplines must be
supplied through an approved current source before launch."* Add a baseline national
resource now.

In the `responsible-gaming` entry of the policy content map, add to `sections`:

```ts
[
	"Get help",
	"If you or someone you know has a gambling problem, call or text the National Problem Gambling Helpline at 1-800-522-4700 — available 24/7, free, and confidential. State-specific resources will be added here before any real-money or licensed-odds feature is enabled.",
],
```

**NEEDS DECISION:** the number above is the US national helpline. Confirm it is current
at the time of launch and add state-specific lines before enabling anything
odds-related. This is copy that must be verified by a human, not carried over on trust.

---

## Issue 11 — Atom feed stubs return 503

Both feed routes hard-return `503` with no `Retry-After`, which invites indefinite
crawler and feed-reader retries once discoverable.

```ts
export function GET() {
	return new Response(null, {
		status: 404,
		headers: { "X-Robots-Tag": "noindex" },
	});
}
```

Apply to both the coaching feed and the portal feed route handlers. Restore real feed
bodies when a production provider is configured.

---

## Issue 12 — Enable Logpush

Worker settings currently report `"logpush": false`, so logs live only in
short-retention Workers Logs.

**Cloudflare → Workers & Pages → `cfb-apex` → Settings → Observability → Logpush**, or:

```
PATCH /accounts/{account_id}/workers/scripts/cfb-apex/settings
{ "logpush": true }
```

Enabling the flag alone changes nothing observable — a Logpush **job** with a
destination (R2, or an external sink) must also be created for logs to be retained.

---

## Issue 14b — Import the print stylesheet

Copy `patches/styles/print.css` into the project's styles directory and import it from
the global stylesheet, or paste its contents at the end of the existing global CSS.
Verify the class names in it against the real stylesheet first — they were read from
the compiled bundle and any that no longer exist should be dropped.

---

## Issue 16 — First-party analytics

There is currently no visibility into traffic at all. Cloudflare Web Analytics is
cookieless and fits the portfolio's privacy-first posture.

Enable at **Cloudflare → Analytics & Logs → Web Analytics**, add the site, then inject
the beacon and allowlist it in CSP:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
	data-cf-beacon='{"token": "<token-from-dashboard>"}'></script>
```

```
script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com;
connect-src 'self' https://cloudflareinsights.com;
```

Both CSP directives are required — the beacon script loads from
`static.cloudflareinsights.com` and reports to `cloudflareinsights.com`. Missing the
`connect-src` entry is the usual reason a correctly-loaded beacon reports nothing.

Deferring this until real traffic exists is reasonable; there is nothing to measure
while the site is noindexed.

---

## Issue 4 — CSP still allows `'unsafe-inline'` — **NEEDS DECISION**

`script-src` and `style-src` both permit `'unsafe-inline'`, which substantially weakens
CSP's XSS protection.

This is **not safely patchable from the compiled bundle**. A correct fix requires the
render pipeline to stamp a per-request nonce onto every inline `<script>` and `<style>`
it emits, then reflect that same nonce in the header. The framework already carries
nonce plumbing (there is a nonce-validation error path in the bundle referencing the
framework's own conventions), so this is a wiring exercise rather than a rearchitecture
— but it needs the real source to do properly.

Sequenced approach:

1. Confirm how the framework exposes the per-request nonce to the layout.
2. Apply it to every inline tag the app emits.
3. Swap the header to `'nonce-<value>'` and drop `'unsafe-inline'`.
4. Ship behind report-only first:
   `Content-Security-Policy-Report-Only` with the strict policy, alongside the existing
   enforcing header, and watch for violations before switching over.

Interim option: hash-based allowlisting (`'sha256-...'` per known inline block). Works
without nonce plumbing, but every inline-content change requires recomputing hashes.

---

## Issue 18 — Extend JSON-LD beyond the homepage

Confirmed present today: `WebSite` + `SearchAction` on the homepage only.

Once **real** content exists, add `SportsEvent` to `/games/:id` and `BreadcrumbList` to
deep team/player/stadium routes.

**Do not add this while the data layer is fixture-backed.** Structured data marks
content up as factual for search engines; emitting `SportsEvent` for fictional games
between fictional teams is exactly the kind of thing that earns a manual action. Gate
it on the same `isProductionLaunchReady()` check used for indexing.

---

## Issue 20 — Image-route CSP conflict — **VERIFY**

Two different CSPs can apply to `/_vinext/image` responses:

- a strict route-local helper: `script-src 'none'; frame-src 'none'; sandbox;`
- the global `secureResponse()` policy

Because `headers.set()` overwrites rather than merges, whichever runs last wins. In the
deployed entry point the image response is passed through `secureResponse()`, so the
global (weaker, for this route) policy appears to win — meaning the stricter sandboxing
intended for user-facing image responses may not be taking effect.

Confirm with a live request once the site is reachable:

```bash
curl -sI "https://cfbapex.com/_vinext/image?url=%2Ficon-512.png&w=256&q=75" | grep -i content-security-policy
```

If the global policy is returned, preserve the stricter one for that route — either
apply `secureResponse()` before the image helper, or have `secureResponse()` skip the
CSP header when one is already set.

---

## Not fixable in code

| Issue | Why | Owner |
|---|---|---|
| ~~5 — DMARC~~ | ✅ **Applied 28 Aug 2026** at `p=none`; verified resolving on 1.1.1.1 and 8.8.8.8. Escalate to `p=quarantine` after reviewing reports | — |
| 9 — No CI/CD | Requires pushing the real source | Local machine |
| 15 — No on-call owner | Staffing decision | Human |
| 21 — Policy review | Legal sign-off | Counsel |
| 22 — Core Web Vitals | Needs a reachable live page | Re-measure post-launch |
| NF-2 — Font paths | Build-pipeline defect | Local machine |
| NF-3 — `ADMIN_EMAILS` | Worker binding; **blocked on NF-1** | See `FINDINGS-NEW.md` |
