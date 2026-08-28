# GitHub Copilot Agent Prompt

Everything from the CFB Apex audit that could not be done from the Claude Code session.
That session had **no access to the application source** (this repo was empty; the
source lives on the local Windows machine) and does not make production DNS or
deployment changes.

**How to use:** open Copilot Chat in **Agent mode** with the real CFB Apex project open
(`C:\Users\Dell\OneDrive\Desktop\Documents\CFB Hub\`), then paste everything between
the markers below.

Sections marked **[HUMAN — not for the agent]** cannot be done by Copilot at all
(dashboard, DNS, legal). Those are listed separately at the end — do them yourself.

---

## ✂️ ---------- BEGIN PROMPT — PASTE FROM HERE ----------

You are working in the CFB Apex codebase: a college-football intelligence site built on
**vinext** (a Vite + React Server Components framework whose API mirrors the Next.js App
Router) and deployed as a single **Cloudflare Worker** via `wrangler deploy`.

An external audit found a set of issues. Fix them in the order below. Work carefully and
do not widen scope — several of these are deliberately narrow.

### Critical context — read before changing anything

1. **The site serves entirely fictional fixture data** (fake teams like "Red Mesa",
   fake stadiums like "Sunstone Stadium"). It is intentionally hidden from search
   engines. **Do not make the site indexable.** Several tasks below touch indexing
   logic; all of them must keep the site hidden until launch gates pass.
2. **`lib/release-readiness.ts` already exists** and exports
   `isProductionLaunchReady(environment)` plus `getProductionGates(environment)`.
   Reuse these. Do not write new flag-checking logic.
3. `process.env` is populated from Worker bindings — `app/admin/page.tsx` already does
   `getProductionGates(process.env)`. Follow that pattern.
4. This project has **no test suite and no CI**. Verify by building and by reading
   carefully, not by relying on a green pipeline.

---

### TASK 1 — Apply the indexing-triad patches (highest priority)

A reviewed patch bundle exists in the `CFB-Apex` GitHub repo on branch
`claude/solardime-comprehensive-audit-2u0iwq` (PR #1). Fetch it and apply to this
project:

- `patches/app/robots.ts` → replace `app/robots.ts`
- `patches/app/sitemap.ts` → replace `app/sitemap.ts`
- `patches/worker/index.ts.diff` → apply its four hunks to `worker/index.ts` by hand
  (it is a guide-diff, not a `git apply` target — the import block was not visible to
  its author)

The change gates all three indexing layers on `isProductionLaunchReady()` instead of
hard-coding them.

**Fix the import specifier.** The patches use relative `../lib/release-readiness`.
If this project uses a path alias (check `tsconfig.json` / `vite.config.*`), switch to
`@/lib/release-readiness` to match local convention.

**Expected result: no behavioral change.** All twelve launch gates are currently unmet,
so `robots.txt` must still be `Disallow: /` and every response must still carry
`X-Robots-Tag: noindex`. If behavior *does* change, you have made an error — stop and
report it.

Verify locally before deploying:
```bash
npm run build
# then against the local dev/preview server:
curl -s localhost:<port>/robots.txt          # expect: User-agent: *  /  Disallow: /
curl -sI localhost:<port>/ | grep -i robots  # expect: noindex, nofollow, noarchive
```

---

### TASK 2 — Fix the broken self-hosted font paths (real, user-visible bug)

**Problem:** the production bundle's inlined `@font-face` CSS contains absolute Windows
filesystem paths:

```css
src: url(C:/Users/Dell/OneDrive/Desktop/Documents/CFB Hub/.vinext/fonts/geist-8ac0455e797f/geist-ff2310f5.woff2) format('woff2');
```

Consequences, all live right now: **Geist and Geist Mono never load** (browsers cannot
resolve a `C:/` path, so every page renders in fallback fonts); the developer's local
directory structure is **exposed in the HTML of every page**; and no font preload links
are generated, because vinext's `extractFontUrlsFromCSS()` only collects URLs starting
with `/` — the Windows paths silently fail that test.

**Root cause:** the `vinext:google-fonts` build plugin is emitting build-cache absolute
paths instead of public asset URLs. Almost certainly a Windows path-separator bug.

**Do this:**
1. Locate where the plugin writes `_selfHostedCSS` (search the vinext plugin source for
   `_selfHostedCSS` and for the font-caching step that populates `.vinext/fonts/`).
2. Determine whether the `.woff2` files are copied into the deployed asset output at
   all, or only into the `.vinext/` build cache.
3. Make the emitted `src:` a root-relative public URL (e.g.
   `/_vinext/fonts/geist-.../geist-....woff2`) and ensure the font files are actually
   served from that path.
4. Check whether a newer `vinext` release already fixes this — a Windows path bug of
   this shape is likely known upstream. Prefer upgrading over patching a dependency.

**Verify:** build, load a page, and confirm the inlined `@font-face` rules contain
`src: url(/...)` and that `<link rel="preload" as="font">` tags now appear. They cannot
appear today — their absence is a reliable signal the bug is still present.

**Do not** "fix" this by pointing the fonts back at Google's CDN. The build-time
self-hosting is a deliberate privacy choice.

---

### TASK 3 — Close the admin authentication bypass

**Do not skip this, and do not set `ADMIN_EMAILS` until it is done.**

`app/chatgpt-auth.ts` derives user identity purely from a request header:

```js
var USER_EMAIL_HEADER = "oai-authenticated-user-email";
async function getChatGPTUser() {
	const email = (await headers()).get(USER_EMAIL_HEADER);
	if (!email) return null;
	return { displayName: ..., email, fullName };
}
```

`app/admin/page.tsx` authorizes on that value against `ADMIN_EMAILS`. There is no
signature or session check, vinext's `filterInternalHeaders()` does **not** strip this
header, and no Cloudflare Access / WAF / Transform rule covers this zone. Any request
from the internet can set it.

It is not exploitable *today* only because `ADMIN_EMAILS` is unset, so the allowlist is
empty and authorization always fails. Setting that binding — which is required to make
the ops console usable — opens a full bypass to anyone who guesses an allowlisted email.

Apply `patches/worker/index.ts.hardening.diff` (Hunk 1) from the same branch: strip all
`oai-authenticated-user-*` headers at the Worker entry unless the caller presents a
`TRUSTED_PROXY_SECRET`.

**First, determine which case applies** and tell me which one you found:
- **(a) The app is never served through the OpenAI/ChatGPT proxy** — apply the strip
  unconditionally, and treat `/admin` as needing a separate authenticator.
- **(b) The app IS served through that proxy** — apply the strip, then configure
  `TRUSTED_PROXY_SECRET` as a Worker **secret** (`wrangler secret put`, never
  `plain_text`) with the proxy sending the matching header. If the proxy cannot send a
  custom header, say so — the fallback is Cloudflare mTLS or an Access service token,
  which is a dashboard task for me.

Search the codebase for `/signin-with-chatgpt`, `/callback`, and any OAuth
configuration to work out which case is real. Report your finding before finalizing.

---

### TASK 4 — Get this project into version control

The `CFB-Apex` GitHub repo is effectively empty; this project has never been committed.
Everything currently depends on one local directory, behind a live production site.

1. Add a `.gitignore` appropriate to a Vite/Cloudflare Workers project — at minimum
   `node_modules/`, `.vinext/`, `dist/`, `.wrangler/`, `.dev.vars`, `*.local`,
   `.env*`.
2. **Before the first commit, verify no secrets are staged.** Check for API tokens,
   `.dev.vars`, and any provider credentials. Run `git status` after staging and read
   the list. Report anything suspicious instead of committing it.
3. Commit the project and push to the `CFB-Apex` remote.
4. Then connect Cloudflare Workers Builds (Workers & Pages → `cfb-apex` → Settings →
   Builds → Connect to Git) so deploys stop being untracked local `wrangler deploy`
   runs.

---

### TASK 5 — Smaller fixes

Apply from `patches/REMAINING-FIXES.md` on the same branch. Each has exact code there.

- **Issue 6** — `lib/config.ts`: change `supportEmail` from
  `corrections@example.invalid` to `corrections@cfbapex.com`.
- **Issue 7** — copy `patches/public/manifest.webmanifest` → `public/`, link it from
  the root layout, and add `theme-color` `#07100D`. **Icons do not exist yet** —
  generate `icon-192.png`, `icon-512.png`, maskable variants (with ~20% safe-area
  padding), `apple-touch-icon.png` (180×180), and `favicon.ico`. Also confirm `/og.png`
  exists, since `generateMetadata()` references it.
- **Issue 8** — add the National Problem Gambling Helpline text to the
  `responsible-gaming` policy content (exact copy in the patch file).
- **Issue 11** — the two Atom feed route handlers return `503` with no `Retry-After`;
  change to `404` with `X-Robots-Tag: noindex`.
- **Issue 14** — copy `patches/styles/print.css` into the styles directory and import
  it. Verify its class names against the real stylesheet and drop any that do not
  exist.
- **Issue 19** — append `upgrade-insecure-requests;` to the CSP in `secureResponse()`
  (Hunk 2 of the hardening diff).

**Do NOT apply Hunk 3 of the hardening diff** (HSTS `preload`) yet — see the human
checklist below.

---

### TASK 6 — Report back, do not guess

When finished, tell me:
1. Which ChatGPT-proxy case you found in Task 3 (a or b).
2. What the actual root cause of the font path bug was, and whether a `vinext` upgrade
   fixed it.
3. Anything you chose not to change, and why.
4. Confirmation that indexing behavior is **unchanged** after Task 1.

Do not attempt: DNS changes, Cloudflare dashboard configuration, flipping any launch
gate flag, or setting `ADMIN_EMAILS`. Those are mine.

## ✂️ ---------- END PROMPT — PASTE TO HERE ----------

---

## [HUMAN — not for the agent]

Copilot cannot do these. They need the Cloudflare dashboard, a registrar, or a person.

### 1. Set `main` as the repository default branch
GitHub made `claude/solardime-comprehensive-audit-2u0iwq` the default because it was
pushed to an empty repo first.

**GitHub → CFB-Apex → Settings → General → Default branch → switch to `main`.**

Do this before merging PR #1, or the merge target will be wrong.

### 2. Add a DMARC record (audit Issue 5)
SPF and DKIM are correctly published; DMARC is missing.

**Cloudflare → DNS → Records → Add record:**
```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@cfbapex.com; fo=1
```

Start at `p=none` (monitoring only, zero deliverability risk), review reports for a
couple of weeks, then move to `p=quarantine` and eventually `p=reject`. The original
audit suggested starting at `p=quarantine` — `p=none` first is the safer rollout, and
worth the extra step.

Also create the Email Routing rule for `corrections@cfbapex.com` (Issue 6) and verify
the destination address via Cloudflare's confirmation email — the code change alone
does nothing until the rule exists.

### 3. Enable Logpush (audit Issue 12)
**Workers & Pages → `cfb-apex` → Settings → Observability → Logpush.** Enabling the flag
alone changes nothing — also create a Logpush **job** with a destination (R2 is
cheapest) or logs still won't be retained.

### 4. Protect `/admin` with Cloudflare Access
Recommended regardless of how Task 3 resolves. The account already runs Access on five
other properties, so the pattern is established.

**Zero Trust → Access → Applications → Add → Self-hosted**, domain
`cfbapex.com`, path `/admin`, policy: allow your email only.

Only after this (or Task 3) is in place, set the `ADMIN_EMAILS` binding.

### 5. HSTS preload — deliberate, separate step (audit Issue 13)
Hunk 3 of the hardening diff sets `max-age=63072000; includeSubDomains; preload`.

**Confirm every subdomain of cfbapex.com is HTTPS-only first.** Preload-list removal
takes months. Once confirmed, apply the hunk, deploy, then submit at
https://hstspreload.org.

### 6. Assign an on-call owner (audit Issue 15)
Staffing decision. The `ON_CALL_OWNER_ASSIGNED` gate should not be flipped until a real
person is monitoring `corrections@cfbapex.com` and Worker error logs.

### 7. Legal review of policy pages (audit Issue 21)
Have counsel read `/privacy`, `/terms`, and `/responsible-gaming` in full before
flipping `LEGAL_LAUNCH_APPROVED`. Also verify the helpline number added in Task 5 is
current.

### 8. Re-measure Core Web Vitals (audit Issue 22)
Could not be measured — the audit session's network egress was blocked. Run Lighthouse
and PageSpeed Insights once the site is publicly reachable. **Do this after Task 2** —
measuring before the font fix will produce numbers that don't reflect the real site.

---

## Suggested order

1. **[HUMAN]** Set `main` as default branch → merge PR #1
2. **[AGENT]** Task 1 (indexing patches) — verify behavior unchanged
3. **[AGENT]** Task 4 (version control) — do this early; everything after is safer with
   history and a rollback path
4. **[AGENT]** Task 2 (font bug) — the only item currently degrading real visitors
5. **[AGENT]** Task 3 (auth bypass) + **[HUMAN]** items 2–4
6. **[AGENT]** Task 5 (smaller fixes)
7. **[HUMAN]** items 5–8, then the launch-gate checklist in audit Document 2

Nothing here flips a launch gate. The site stays correctly hidden throughout.
