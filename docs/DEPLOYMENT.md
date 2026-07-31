# Deployment

The supported target is a Sites preview using the Cloudflare-compatible `dist/` output. `.openai/hosting.json` owns the opaque Sites project ID and optional logical D1/R2 bindings.

Deployment sequence: successful `npm run verify` → exact source commit → credential-scoped push → package the validated commit → save one Sites version → deploy privately when available → poll status → smoke-test the returned URL.

No custom domain, DNS, production provider, campaign, paid account, or commercial activation is authorized. Roll back by redeploying the previous immutable Sites version and disabling provider/partner flags.
