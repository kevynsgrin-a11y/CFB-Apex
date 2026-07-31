# Security runbook

1. Triage severity, affected environment, data/provider/identity scope, and active exploitation.
2. Activate the relevant provider, partner, campaign, simulation, or feature kill switch.
3. Preserve bounded logs and immutable audit evidence without copying secrets or personal data.
4. Rotate affected credentials, revoke sessions/roles, quarantine records, and block unsafe destinations.
5. Patch, test injection/redirect/auth/CSRF/SSRF/rate-limit regressions, and deploy an immutable preview.
6. Notify counsel, providers, processors, users, or regulators only through the approved incident plan.
7. Publish a correction/security note when appropriate and complete a blameless review.

Never disclose secret values in health/admin APIs. Current CSP allows inline framework scripts; production should migrate to a nonce/hash policy before third-party activation.
