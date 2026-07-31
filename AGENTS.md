# College Football Hub agent guide

## Mission

Build a fast, conference-neutral, source-aware college football utility. Fixture data must be deterministic and visibly labeled. Never imply that demonstration, inferred, stale, rumored, or model-generated information is live fact.

## Working rules

- Preserve the Vinext/Next.js App Router structure and Cloudflare-compatible ESM output.
- Keep brand copy in `lib/config.ts`, domain types in `lib/types.ts`, deterministic data in `lib/fixtures.ts`, and interactive product behavior in client components.
- Do not add secret-bearing browser calls. All future live providers must sit behind typed server-side adapters.
- Use accessible HTML, keyboard-visible focus, reduced-motion support, resilient empty/error/stale states, and mobile-first layouts.
- Keep Clean Mode as the default. Odds and DFS content require a deliberate disclosure gate.
- Never add unlicensed logos, proprietary metrics, paywall-derived reporting, fake partner IDs, or fabricated “live” data.
- Sequence writers that touch the same files. Audit and research agents should be read-only.
- Update `docs/REQUIREMENTS_TRACEABILITY.md`, `docs/ASSUMPTIONS_REGISTER.md`, and `docs/DECISION_LOG.md` when scope or implementation decisions change.
- Before handoff, run the most relevant checks from `npm run verify`.

## Required handoff

Every agent response must include:

1. Mission and scope.
2. Inputs reviewed.
3. Assumptions made.
4. Decisions and rationale.
5. Deliverables with exact paths.
6. Tests or evidence.
7. Known risks and unresolved items.
8. Required next owner.
9. Acceptance status: `PASS`, `PASS WITH CONDITIONS`, or `FAIL`.

Return distilled evidence, never raw unbounded logs.
