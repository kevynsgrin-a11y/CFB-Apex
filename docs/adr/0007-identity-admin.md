# ADR 0007 — Identity and admin

ChatGPT sign-in establishes identity only. `/admin` additionally requires a server-side `ADMIN_EMAILS` allowlist. Admin responses expose no secrets and future state changes require RBAC, audit, same-origin/CSRF controls, and no-store caching.
