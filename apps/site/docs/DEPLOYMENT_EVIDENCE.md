# Deployment evidence

## Public fixture-beta release — 2026-08-04 UTC

- Cloudflare account: `Kevynsgrin@gmail.com's Account`
- Worker: `cfb-apex`
- Initial source commit: `6e29994` (`feat: prepare CFB Apex public fixture beta`)
- Initial Cloudflare version: `fe7c4f47-8e1b-45de-abe2-54a6b2c757da`
- Canonical URL: `https://cfbapex.com`
- Redirect URL: `https://www.cfbapex.com`
- Worker fallback URL: `https://cfb-apex.kevynsgrin.workers.dev`

## Evidence captured

- `npm run verify`: PASS — type check, warning-only lint gate, 12 domain/data tests, production build, 5 rendered Worker tests, 2 accessibility tests, 2 SEO tests, 2 link tests, 17 visual captures, migration guard, and fixture seed guard.
- `wrangler types`: PASS — generated bindings include `ASSETS`, `IMAGES`, the canonical site URL, deny-by-default launch gates, and active live/commercial kill switches.
- `wrangler deploy --dry-run`: PASS — 1,395.36 KiB total upload, 307.18 KiB gzip, six server modules, and 29 static files.
- Cloudflare deployment: PASS — 19 ms startup, both custom domains attached, and the public Worker URL enabled.
- DNS/TLS: PASS — Cloudflare authoritative DNS and `1.1.1.1` resolve both hostnames; HTTPS responds at the apex and `www` presents a valid edge response.
- Canonical redirect: PASS — `https://www.cfbapex.com/scores?week=1` returns HTTP 308 to the identical apex path and query.
- Public smoke matrix: PASS — three consecutive HTTP 200 responses for `/`, `/scores`, `/transfer-portal`, `/playoff-predictor`, `/coaching-carousel`, `/dfs`, `/stadiums/harbor-field`, `/games/game-nco-ptb`, `/api/health`, `/api/readiness`, and `/robots.txt` after custom-domain propagation.
- Security/data-state checks: PASS — HSTS, CSP, frame denial, no-sniff, permissions policy, and `X-Robots-Tag: noindex, nofollow, noarchive` are present; health reports `CFB Apex` in the `fixture` environment; readiness reports `readyForProductionLiveData: false`.
- Headless browser: PASS — home and scores pages render meaningful content with no framework error overlay; primary navigation and key calls to action are discoverable.

## Boundaries retained

This evidence authorizes only the public deterministic fixture beta. No licensed live provider, official poll, odds, advertising, affiliate, email-send, or indexing activation occurred. The readiness API and tracked Cloudflare variables keep those capabilities disabled.

GitHub target `kevynsgrin-a11y/CFB-Apex` was confirmed through the connected GitHub app. The repository is public and empty; publication remains pending the owner's explicit confirmation that the full source tree may be made public.
