# Performance budget

Targets: mobile Lighthouse performance ≥90 without third-party production tags; accessibility/SEO/best practices ≥95; LCP <2.5s p75; INP <200ms p75; CLS <0.1.

Budgets: primary utility before nonessential modules; no autoplay; no third-party tags in preview; fixed ad/media dimensions; route-level rendering; CSS-only atmosphere; tabular text instead of chart libraries; bounded client simulation; no provider calls during render; no horizontal page overflow at 320px.

Any third-party script needs consent, failure isolation, lazy loading, CSP update, performance measurement, and a kill switch.

## Preview evidence

- Production build completes without external provider or third-party requests during render.
- Compiled client output is approximately 2.42 MB including a 1.85 MB social-card asset and local fonts; the largest JavaScript chunks are approximately 190 KB framework, 87 KB product shell, and 81 KB runtime before transfer compression.
- No horizontal overflow was observed at the captured mobile viewport.
- Real-user p75 Core Web Vitals and Lighthouse scores are not claimed for this private preview. Route splitting, social-card optimization, and measured lab/field performance remain public-launch work.
