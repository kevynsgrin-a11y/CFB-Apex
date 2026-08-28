# CFB Apex — Critical Fix Bundle (Indexing Triad)

Remediation bundle for the 28 August 2026 audit of `cfbapex.com`. Originally scoped to the three **Critical** issues from the 28 August 2026 audit of
`cfbapex.com`. Each bug was confirmed against the live production Worker before a
fix was written — see [`VERIFICATION.md`](./VERIFICATION.md).

> The audit uses Critical / High / Medium / Low severities. "Urgent" maps to the
> three Critical issues, which are all one root problem.

---

## ⚠️ Read this first — why the fixes are here and not applied in place

**This repository is empty.** There are no commits and no branches on
`kevynsgrin-a11y/CFB-Apex` (GitHub returns `409 Git Repository is empty`), and no
working tree locally.

The application source is not in version control anywhere reachable. The deployed
bundle leaks its build path:

```
C:/Users/Dell/OneDrive/Desktop/Documents/CFB Hub/.vinext/fonts/...
```

So the real source lives on a Windows/OneDrive machine and is published straight to
Cloudflare with `wrangler deploy` — consistent with the Cloudflare Workers Builds API
reporting **zero recorded builds**. This is audit Issue 9, and it is the blocker that
prevented a normal in-place fix.

**Consequence:** these patches could not be applied to the real files. They are
verified, ready-to-apply changes intended to be dropped into the actual source tree on
the machine that holds it.

## Why production was not patched directly

The deployed Worker *could* be edited via the Cloudflare API. That was deliberately not
done, for three reasons:

1. **It is build output, not source.** The bundle is compiled, minified vinext output.
   Hand-editing it is an anti-pattern.
2. **It would be silently reverted.** The next `wrangler deploy` from the owner's
   machine would overwrite the change with the unfixed source, with no warning.
3. **It risks the live site.** Re-uploading a hand-edited 1.4 MB compiled artifact to a
   live domain, with no CI and no rollback trail, is not a defensible change.

A fix that reverts itself and might break production is not a fix. The durable fix has
to land in source.

---

## What these patches actually change

They do **not** open the site to search engines.

All three layers are re-pointed at `isProductionLaunchReady()` — the project's own
existing helper in `lib/release-readiness.ts`, already used by `app/admin/page.tsx` and
the data-sources status surface. Because that helper currently returns `false` (all
twelve gates are unmet), **crawler-facing behavior is byte-identical today**: still
`Disallow: /`, still `noindex`, still gated.

The change is structural. It converts going live from *"edit three files and redeploy"*
into *"flip the launch flags"* — which is what the project's flag system was built for.

### Stricter than the audit recommended

Document 2 proposed gating on `PUBLIC_LAUNCH_APPROVED` alone. These patches use
`isProductionLaunchReady()` instead, which additionally requires the `LIVE_MODE` gate
(`DEMO_MODE === "false"` **and** `DISABLE_LIVE_PROVIDERS === "false"`).

That closes a real hole in the audit's own advice: with the single-flag version, someone
could set `PUBLIC_LAUNCH_APPROVED=true` while the site was still serving the fictional
fixture universe, and Google would index fake teams and fake stadiums. With the gate
helper, that is structurally impossible.

---

## Contents

| Path | Issue | Form |
|---|---|---|
| `patches/app/robots.ts` | 2 — `robots.txt` disallows everything | Complete drop-in file |
| `patches/app/sitemap.ts` | 3 — `sitemap.xml` returns `[]` | Complete drop-in file |
| `patches/worker/index.ts.diff` | 1 — unconditional `X-Robots-Tag: noindex` | Surgical hunks only |
| `VERIFICATION.md` | — | Confirmed-bug evidence |

`robots.ts` and `sitemap.ts` are given as complete files because both are small and
fully visible in the deployed bundle. `worker/index.ts` is given as hunks because its
import block is **not** visible in the bundle — a full-file replacement there would be
guesswork.

---

## How to apply

On the machine holding the real source (`.../Documents/CFB Hub/`):

1. Copy `patches/app/robots.ts` → `app/robots.ts`.
2. Copy `patches/app/sitemap.ts` → `app/sitemap.ts`.
3. Apply the four hunks in `patches/worker/index.ts.diff` to `worker/index.ts` by hand.
4. Check the import specifier. The patches use relative `../lib/release-readiness`,
   which is correct if `app/`, `worker/`, and `lib/` are siblings at the project root
   (as the bundle's module layout indicates). If the project uses a path alias, switch
   to `@/lib/release-readiness` to match local convention.
5. Build and verify locally — see below.
6. Deploy.

### Verifying after deploy

Behavior must be **unchanged**, because the gates are still closed:

```bash
curl -sI https://cfbapex.com/            | grep -i x-robots-tag   # expect: noindex, nofollow, noarchive
curl -s  https://cfbapex.com/robots.txt                           # expect: User-agent: *  /  Disallow: /
curl -s  https://cfbapex.com/sitemap.xml | head                   # expect: populated <urlset> (safe; still noindex)
```

To confirm the gate actually flips, set every launch flag to `true` in a **preview**
environment only and re-run the first two commands — `X-Robots-Tag` should disappear and
`robots.txt` should switch to `Allow: /` plus a `Sitemap:` line.

> Do not flip launch flags in production. Doing so opens indexing on a site currently
> serving fictional data, with `LEGAL_LAUNCH_APPROVED` and `MARKS_POLICY_APPROVED` both
> unmet. See the launch-gate checklist in audit Document 2, Appendix.

---

## Not included

The remaining audit findings (High: CSP `'unsafe-inline'`, missing DMARC, placeholder
support email, no PWA manifest, missing helpline copy, no CI/CD, no cache layer; plus
all Medium/Low items) are out of scope for this change, which covers only the Critical
triad. They are specified with verbatim fixes in audit Document 2.

The single highest-value follow-up is **Issue 9** — getting the real source into this
repository. Until that happens, every fix has to be hand-carried to one laptop, and
this bundle is the workaround rather than the workflow.

---

## Second pass — remaining audit points + new findings

Added after the initial Critical fix. See [`FINDINGS-NEW.md`](./FINDINGS-NEW.md) and
[`patches/REMAINING-FIXES.md`](./patches/REMAINING-FIXES.md).

### New findings (not in the original audit)

| ID | Severity | Summary |
|---|---|---|
| NF-1 | **Critical (latent)** | `/admin` auth trusts the spoofable `oai-authenticated-user-email` header; no Access/WAF/Transform rule covers the zone. Not exploitable only because `ADMIN_EMAILS` is unset — **do not set it until fixed** |
| NF-2 | **High** | Self-hosted `@font-face` CSS ships `C:/Users/...` paths: Geist/Geist Mono never load, and the developer's local path is exposed on every page |
| NF-3 | Medium | `/admin` permanently inaccessible (`ADMIN_EMAILS` absent) — fail-closed, but blocks the on-call gate |

### Added files

| Path | Covers |
|---|---|
| `FINDINGS-NEW.md` | NF-1, NF-2, NF-3 with verification evidence |
| `patches/worker/index.ts.hardening.diff` | NF-1, Issue 13 (HSTS preload), Issue 19 |
| `patches/public/manifest.webmanifest` | Issue 7 |
| `patches/styles/print.css` | Issue 14 |
| `patches/REMAINING-FIXES.md` | Issues 4, 6, 7b, 8, 11, 12, 14b, 16, 18, 20 |
| `COPILOT-PROMPT.md` | Everything requiring the local source, the Cloudflare dashboard, or a human |

### Apply order

`patches/worker/index.ts.diff` (Critical) **before**
`patches/worker/index.ts.hardening.diff` — the latter assumes `secureResponse()` has
already been changed to accept `env`.

Two items are deliberately held back pending a decision, both documented inline:
Hunk 1 of the hardening diff (confirm the ChatGPT proxy path first) and Hunk 3
(HSTS `preload` is hard to reverse).
