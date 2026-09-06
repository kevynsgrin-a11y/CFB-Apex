# Public launch runbook

Current state: `PRIVATE FIXTURE PREVIEW`; public live-data launch is `NO-GO`.

## Hard gates

The `/api/readiness` response and protected admin console expose deny-by-default evidence gates. Environment flags record approvals but never create them.

- Core data public-display, storage, retention, correction, advertising, SEO, and derived-model rights approved
- Poll rights approved or poll surfaces withheld
- Text-only marks policy approved or applicable marks licensed
- Production secrets and bindings configured server-side
- 2026 entity/membership/rules crosswalk independently verified
- Replay and live shadow pilot passed
- Duplicate, out-of-order, disconnect, REST catch-up, DLQ, stale, correction, and rollback drills passed
- Global/provider/module ingestion and publication kill switches tested
- Staffed game-window owner and escalation contacts assigned
- Legal/data-rights approval recorded
- Explicit public launch approval recorded

## Deployment sequence

1. Procurement signs the provider order form and completes the rights matrix in `docs/DATA_PROVIDER_MATRIX.md`.
2. Create isolated `sandbox`, `shadow`, and `production` Cloudflare resources. Never share fixture cache keys, D1 databases, R2 prefixes, queues, analytics, or secrets with live environments.
3. Generate typed adapters from the contracted schemas. Store credentials only in environment secrets.
4. Create additive D1 migrations for source artifacts, crosswalks, candidate revisions, publication versions, corrections, and audit state. Run clean migration and Time Travel restore drills.
5. Run provider replay through raw, normalized, quarantine, publication-preview, and correction paths. Public routes remain on fixtures and noindex.
6. Shadow real games without changing the active public version. Compare against official results and retain bounded pilot evidence.
7. Staff at least one complete game window. Exercise disconnect, provider stall, stale display, score reversal, status conflict, DLQ, global freeze, and rollback.
8. Enable staff-only publication behind authentication. Review source drawers, timestamps, accessibility, mobile behavior, cache invalidation, and correction propagation.
9. Run `npm run verify`, production load tests, dependency/security review, and a final legal/data-rights checklist against the exact release commit and order form.
10. Request explicit authorization for public deployment and canonical-domain/indexing activation. Do not infer approval from contracts or a passing pilot.
11. Launch a text-only, Clean Mode scoreboard first. Keep polls, PBP, models, portal, coaching, odds/DFS, ads, affiliates, email, social automation, and logos separately disabled until their gates pass.
12. Enable sitemap segments progressively only after each page class is complete, source-backed, production-permitted, and non-thin.

## Stop and rollback

Freeze publication immediately for fixture/live mixing, missing provenance, unauthorized data or marks, score/status corruption, provider sequence regression, stale data shown as current, material contract breach, critical security/privacy issue, or partial publication.

Freezing publication must not stop evidence collection. Mark the provider stale, retain the last authorized version when rights permit, show an unavailable state otherwise, restore the prior active pointer, purge affected cache tags, withdraw generated derivatives, and open a correction/incident case. Code rollback does not roll back D1 or R2; migrations remain additive and recovery follows `docs/BACKUP_RESTORE.md`.

## Current activation lock

The Worker still emits `X-Robots-Tag: noindex, nofollow, noarchive`; `robots.ts` disallows crawling; `sitemap.ts` returns no URLs; `.openai/hosting.json` declares no D1 or R2. These are intentional safety controls and must not be removed during sandbox or shadow work.
