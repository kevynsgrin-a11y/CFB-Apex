# Load test results

Current scope is deterministic local verification, not production load certification.

- Simulation tests run seeded 2,000–4,000-iteration cases and validate bounds, determinism, valid participants, whole-number iterations, and two-sided forced outcomes.
- The UI and API cap runs at 20,000; the API measures actual body bytes, rejects requests over 20KB, and returns 400 for invalid scenario participants.
- Public rendering makes no external provider call.
- The preview is owner-only; it is not approved as a public compute endpoint.
- Production concurrency, queue, CPU, database, and ingestion load testing remains an external prelaunch requirement after infrastructure and licensed providers exist.
