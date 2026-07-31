# Threat model

Protect provider credentials/terms, admin roles, email/preferences, consent attestations, provenance integrity, editorial state, partner destinations, and simulation availability.

Threats include secret leakage, identity-header spoofing, admin takeover, XSS/injection, CSRF, SSRF, open redirect, webhook forgery, expensive-provider abuse, simulation denial of service, newsletter enumeration, malicious corrections, affiliate redirect abuse, cache/environment contamination, and supply-chain compromise.

Controls: origin protection; sign-in plus server allowlist/RBAC; schema/length/cardinality validation; parameterized persistence; output encoding; no arbitrary remote fetch; HTTPS destination registry; same-origin/CSRF checks; signed webhooks; bounded retries/timeouts/payloads; rate/concurrency/iteration caps; environment-separated cache; security headers; dependency/secret scans; immutable audit events; data minimization and retention.
