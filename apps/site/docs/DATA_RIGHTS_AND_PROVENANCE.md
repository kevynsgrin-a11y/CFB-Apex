# Data rights and provenance

Rights are deny-by-default. The public source drawer may expose the source name/link, as-of time, freshness, verification state, model/fixture status, confidence, and required attribution; contract-confidential fields stay private.

## Record contract

- Identity: source/provider/dataset/entity IDs.
- Source: type, publisher, URL or document ID.
- Time: published, updated, `source_as_of`, observed, fetched, verified, valid, stale, and expiry times.
- Rights: license class, policy/contract version, permitted uses, territory, attribution, retention/deletion.
- Processing: ingest run, schema/transform version, payload/record hash, lineage.
- Verification: status, method, reviewer, corroboration, confidence, dispute state.
- Corrections: superseded record, case, change reason, corrected time.
- Mode: data environment, record origin, fixture flag.
- Model: model version, feature cutoff, issue time, seed, uncertainty.

## Demo/live separation

One request declares one data environment. Fixture IDs and caches are prefixed and isolated. Fixtures always carry `R0_FIXTURE`, a visible demonstration label, and noindex metadata. Production outages return stale/unavailable production data, never fixtures. Fixture analytics never enter production KPI reporting.
