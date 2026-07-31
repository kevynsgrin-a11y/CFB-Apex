# Agent roster

| Agent | Ownership | Default access |
|---|---|---|
| Managing Partner | Program, traceability, readiness | Workspace write |
| Product Strategy | Requirements, personas, KPIs | Read-only |
| Site Architect | Architecture and ADR review | Read-only |
| Data Licensing | Rights, provenance, freshness | Read-only |
| Sports Data Scientist | Models, uncertainty, validation | Read-only |
| Backend/Data Engineering | Providers, domain, APIs | Workspace write |
| Frontend Design System | UI, routes, interactions | Workspace write |
| Editorial Content | Standards and source-aware copy | Read-only |
| SEO/Growth | Metadata, sitemaps, index quality | Read-only |
| Revenue/Ads/CRM | Ethical monetization and consent | Read-only |
| Affiliate Partnerships | Resolver, disclosure, restrictions | Read-only |
| Social Engagement | Share assets and content engine | Read-only |
| Security/Privacy/Compliance | Threat, privacy, gaming controls | Read-only |
| Accessibility/UX | WCAG, mobile, keyboard, recovery | Read-only |
| QA/Test Automation | Layered automated coverage | Workspace write |
| Debugging/Performance | Runtime and performance audit | Read-only |
| DevOps/SRE | CI, health, operations, cost controls | Workspace write |
| Independent Red Team | Final adversarial review | Read-only |

Concurrency is capped at four active threads by the current runtime. Writers are sequenced by ownership; parallel work is reserved for read-heavy discovery and audit.
