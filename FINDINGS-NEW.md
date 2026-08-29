# New Findings — Not in the 28 August 2026 Audit

Three issues found while preparing the remaining fixes. All three were verified
against the live production Worker and the live Cloudflare control plane.

Two of these are more material than most of the original audit, which largely found
deliberate pre-launch gating and config hygiene. **NF-1 and NF-2 are real defects in
shipped code.**

| ID | Severity | Summary | Exploitable / visible today? |
|---|---|---|---|
| NF-1 | **Critical (latent)** | Admin auth trusts a spoofable request header | No — gated only by an unset binding |
| NF-2 | **High** | Self-hosted font CSS ships local Windows filesystem paths | **Yes — affects every visitor now** |
| NF-3 | Medium | Admin console permanently inaccessible | Yes (fail-closed) |

---

## NF-1 — Admin authentication trusts an unverified, spoofable request header

**Severity: Critical (latent — not currently exploitable).**

### The mechanism

`app/chatgpt-auth.ts` derives user identity **entirely from a request header**
(bundle lines 31024–31042):

```js
var USER_EMAIL_HEADER = "oai-authenticated-user-email";

async function getChatGPTUser() {
	const requestHeaders = await headers();
	const email = requestHeaders.get(USER_EMAIL_HEADER);
	if (!email) return null;
	...
	return { displayName: fullName ?? email, email, fullName };
}
```

`app/admin/page.tsx` authorizes on that value (bundle lines 32036–32038):

```js
const user = await getChatGPTUser();
const allowlist = (process.env.ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
const authorized = Boolean(user && allowlist.includes(user.email.toLowerCase()));
```

There is no signature check, no session token, and no cryptographic binding — the
header value *is* the identity.

### Why the existing header filter does not stop it

The Worker entry does call `filterInternalHeaders(request.headers)`, but that function
strips only a fixed list (bundle lines 16754–16765, 17898–17902):

```js
var INTERNAL_HEADERS = [
	MIDDLEWARE_REWRITE_HEADER, MIDDLEWARE_REDIRECT_HEADER, MIDDLEWARE_SET_COOKIE_HEADER,
	MIDDLEWARE_SKIP_HEADER, MIDDLEWARE_OVERRIDE_HEADERS, MIDDLEWARE_NEXT_HEADER,
	"x-now-route-matches", "x-matched-path", "x-nextjs-data", "x-next-resume-state-length"
];
```

`oai-authenticated-user-email` is **not** in that list, so it passes through from
external requests untouched. The framework's own comment on this list states the intent
exactly — *"An attacker could forge these to influence routing or impersonate internal
data fetches"* — the auth header simply was never added to it.

### No edge protection compensates for it

Verified live against the Cloudflare account:

- **Cloudflare Access:** no application covers `cfbapex.com` (existing apps cover only
  `*.apiops.pages.dev`, `apiops.pages.dev`, `api.oakandmain.dev`,
  `*.portfolioops.pages.dev`, `portfolioops.pages.dev`).
- **WAF custom rules:** none configured on the zone.
- **Request Transform Rules:** none configured on the zone.

`cfbapex.com` is bound directly to the Worker as a public custom domain. Any request
from the open internet reaches the handler with attacker-controlled headers intact.

### Current status: NOT exploitable

The `ADMIN_EMAILS` binding **does not exist** on the Worker. So:

```
(undefined ?? "") → "" → "".split(",") → [""] → .filter(Boolean) → []
[].includes(anything) → false → authorized === false, always
```

The console is fail-closed today. That is luck of configuration, not a control.

### The trigger that makes it exploitable

Setting `ADMIN_EMAILS` — which is exactly what must happen to make the ops console
usable, and is implied by the `ON_CALL_OWNER_ASSIGNED` launch gate — turns this into a
full admin-console bypass for anyone who can guess an allowlisted address:

```
curl https://cfbapex.com/admin -H "oai-authenticated-user-email: <allowlisted address>"
```

Owner email addresses are rarely secret (WHOIS, git history, site contact copy), so
"guess the email" is not a meaningful control.

### What the console exposes

The launch-gate operations surface — `getProductionGates(process.env)` — i.e. the
production readiness state of the entire property.

> **Do not set `ADMIN_EMAILS` until this is fixed.** Doing so is the single action that
> converts this from latent to live.

### Fix

Two layers, both recommended:

1. **Stop trusting the header on external requests.** Strip all
   `oai-authenticated-user-*` headers at the Worker entry so only a trusted upstream
   can introduce them. See `patches/worker/index.ts.hardening.diff`.
2. **Put a real authenticator in front of `/admin`.** A Cloudflare Access
   self-hosted application on `cfbapex.com/admin` (the account already uses this
   pattern on five other properties) is the lowest-effort correct control.

**Caveat requiring your input:** `oai-authenticated-user-email` is the OpenAI Apps /
ChatGPT convention, where the header is injected by OpenAI's trusted proxy. If this app
is *also* served through that proxy, blindly stripping the header will break that
sign-in path. The correct end state is to accept the header **only** when the request
demonstrably came from the trusted proxy (mTLS, a shared secret header, or an
Access service token) and strip it otherwise. Confirm how the ChatGPT integration is
meant to reach this app before applying layer 1 as-is.

---

## NF-2 — Self-hosted font CSS ships absolute Windows filesystem paths

**Severity: High. Affects every visitor right now.**

### Evidence

`app/layout.tsx` passes build-generated `_selfHostedCSS` into the font loaders
(bundle line 30912). That CSS contains:

```css
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(C:/Users/Dell/OneDrive/Desktop/Documents/CFB Hub/.vinext/fonts/geist-8ac0455e797f/geist-ff2310f5.woff2) format('woff2');
  unicode-range: ...;
}
```

Every `@font-face` block for both **Geist** and **Geist Mono** — across all five
unicode subsets each — carries a `C:/Users/...` path instead of a web-servable URL.

This CSS is injected verbatim into the served HTML. `injectSelfHostedCSS()`
(bundle lines 30762–30774) pushes it straight into the SSR style buffer with no URL
rewriting:

```js
function injectSelfHostedCSS(css) {
	if (injectedSelfHosted.has(css)) return;
	injectedSelfHosted.add(css);
	collectFontPreloadsFromCSS(css);
	if (typeof document === "undefined") { ssrFontStyles$1.push(css); return; }
	...
}
```

### Corroboration from the code itself

`extractFontUrlsFromCSS()` (bundle lines 30731–30739) only collects URLs that are
root-relative:

```js
if (url && url.startsWith("/")) urls.push(url);
```

A `C:/Users/...` value fails that test, so **zero font preload links are generated**.
The preload path silently produces nothing — which is itself confirmation that these
values are not valid web URLs.

### Impact

1. **The custom typography never loads.** A browser cannot resolve
   `url(C:/Users/...)` — it is either an unknown `c:` scheme or a 404 against the
   origin. Both Geist and Geist Mono fail, and every page renders in fallback fonts.
   The "Night Game Ledger" design system's entire typographic layer is not what ships.
2. **Information disclosure.** The developer's local username and full directory
   structure (`C:/Users/Dell/OneDrive/Desktop/Documents/CFB Hub/`) are embedded in the
   HTML of every page, readable by any visitor.
3. **Wasted bytes.** Several KB of dead `@font-face` CSS is inlined into every
   response and can never do anything.

Note this also means the audit's Visual Design grade (B+) was assessed from design
tokens that the live site does not actually render with.

### Root cause

The `vinext:google-fonts` build plugin is emitting build-machine absolute paths rather
than public asset URLs. The `.vinext/fonts/` directory is a build cache path, not a
served location. This is almost certainly a Windows path-handling defect (POSIX
separator assumptions) in the plugin's URL rewriting step.

### Fix

This is a build-pipeline issue, not an application-code issue, so it cannot be patched
blind from the deployed bundle. Resolve on the machine holding the source:

1. Confirm whether the `.woff2` files are copied into the deployed asset output at all
   (check the build output directory and the `ASSETS` upload manifest).
2. If they are served, the fix is to make the plugin emit the public URL
   (e.g. `/_vinext/fonts/geist-.../geist-....woff2`) rather than the cache path.
3. If they are not served, the plugin's asset-copy step is also not running.
4. Check for a `vinext` upgrade — a Windows path bug of this shape is likely known
   upstream.

**Interim option** if the build fix is not quick: drop `_selfHostedCSS` and let the
fonts load from Google's CDN, or replace Geist with a system font stack. Both trade
against the site's zero-third-party-request privacy posture, so treat as temporary.

**Verify the fix** by loading any page and confirming `src: url(/...)` in the inlined
`@font-face` rules, plus `<link rel="preload" as="font">` tags appearing (they cannot
appear today, per `extractFontUrlsFromCSS` above).

---

## NF-3 — Admin console is permanently inaccessible

**Severity: Medium.**

### Evidence

`app/admin/page.tsx` requires a match against `ADMIN_EMAILS` (bundle line 32037).
That binding is **absent** from the Worker's configuration — the deployed binding set
contains `ASSETS`, `IMAGES`, `SITE_URL`, and the seventeen demo/launch-gate flags, but
no `ADMIN_EMAILS`.

The allowlist therefore evaluates to `[]` and `authorized` is always `false`. No one
can reach the operations console, including its launch-gate dashboard.

### Assessment

Failing closed is the **correct** direction, and given NF-1 it is currently the only
thing preventing an auth bypass. But the console is inoperable, which blocks the
`ON_CALL_OWNER_ASSIGNED` launch gate — there is no working surface for an on-call owner
to monitor.

### Fix

**Sequenced deliberately — order matters:**

1. Fix **NF-1** first (strip the header, and/or put Cloudflare Access in front of
   `/admin`).
2. Only then set `ADMIN_EMAILS` to the operator address(es).
3. Verify the console rejects a spoofed header before relying on it:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://cfbapex.com/admin \
     -H "oai-authenticated-user-email: <the allowlisted address>"
   ```
   This must **not** return an authorized console page.

Setting `ADMIN_EMAILS` before step 1 opens the bypass described in NF-1.
