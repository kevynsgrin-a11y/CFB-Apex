# KPI framework

## Primary measures

- Weekly Trusted Core-Task Users: privacy-safe unique users completing a qualifying core task where data mode, freshness, and provenance rendered.
- Core Task Completion Rate: route-specific completed journeys divided by starts; errors remain in the denominator.
- 28-day Return-to-Utility Rate: current completers who also completed a task in the preceding 28 days.

Fixture and production metrics are always separated.

## Drivers

First-session activation, median time to first task, per-module completion, simulation completion/share, source-drawer engagement, favorite reuse, correction completion, and authorized-destination actions.

## Guardrails

Zero material fixture/model/stale/provenance/gate/secret/rumor-to-fact violations; zero critical accessibility failures; blocking errors, provider failures, and Core Web Vitals visible by module.

## Event contract

Every event includes module, route, task, data mode, source state, freshness state, product mode, season, and schema version. Never include raw email, exact birth date, precise location, or sensitive gambling selections. Business targets wait for an instrumentation shakedown and a 2–4 week production baseline.
