# Privacy data map

| Data | Purpose | Default |
|---|---|---|
| ChatGPT email/name | Identity/admin authorization | Server-only, no public cache |
| Newsletter email/preferences | Requested messages | Provider activation only; bounded suppression |
| Favorites/mode | Personalization | Device local |
| Analytics | Reliability and task usage | Pseudonymous; no direct identifiers |
| Correction contact | Follow-up | Delete/anonymize after closure window |
| Adult/jurisdiction attestation | Optional content disclosure | Coarse device-local state; no DOB |
| IP/user agent | Abuse/security | Short-lived security logs |
| Provider payload | Product data | Contract-controlled |

Every future email, analytics, consent, error, auth, ad, hosting, and data vendor needs a processor record, permitted purpose, retention, transfer basis, and deletion path. Children/teen handling, GPC, state privacy rights, and DSAR workflows require counsel before production.
