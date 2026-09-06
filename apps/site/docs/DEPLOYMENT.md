# Deployment

The supported public fixture-beta target is the Cloudflare Worker `cfb-apex`, deployed from the Vinext-generated `dist/server` modules with `dist/client` static assets. `wrangler.deploy.jsonc` owns the public runtime configuration, Cloudflare Images binding, observability, safe environment flags, and the custom domains `cfbapex.com` and `www.cfbapex.com`. The Worker redirects `www` to the apex with HTTP 308.

Deployment sequence: successful `npm run verify` → `npm run cf:types` → `npm run deploy:dry-run` → exact source commit and GitHub push → `npm run deploy:production` → poll both hostnames → smoke-test navigation, security headers, noindex state, health, readiness, and the `www` redirect. Cloudflare Custom Domains create the required DNS records and certificates.

The domain deployment is authorized; production live data, indexing, campaign, paid provider, and commercial activation are not. Roll back by deploying the previous Git commit with the same Wrangler config, or by selecting the prior Worker version in Cloudflare, while keeping provider/partner kill switches active.

## Live-data progression

Production preparation is sequenced as `provider contract → sandbox/replay → shadow live → staff publication → limited public scoreboard → progressive modules/indexing`. The fixture beta, sandbox, and shadow deployments keep the current noindex/robots/sitemap lock. They do not authorize public display of live-provider data.

Before a public live release, complete every gate in `docs/PUBLIC_LAUNCH_RUNBOOK.md` and record the exact contracts, test artifacts, on-call owner, legal approval, and explicit public-launch approval. The first public release is text-only, Clean Mode, and scoreboard-first; polls, portal, coaching, models, odds/DFS, ads, affiliates, email, social automation, and marks remain separately gated.
