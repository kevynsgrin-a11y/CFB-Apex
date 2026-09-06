# Model card — portal impact

Version label: `portal-impact-2026.2.1-demo`

Current state: authored deterministic fixture outputs only. Each fictional event carries position, origin/destination, status, optional snaps/usage, a signed impact value, and confidence. Team summary values are also authored fixtures. Missing snaps/usage remain visibly unknown; NIL estimates are excluded.

The preview validates signs, missing-value presentation, provenance, filtering, and UI plumbing. It does not currently compute inbound/outbound aggregates, volatility, QB/OL continuity, or coverage from events, and it has no historical utilization validation.

Production work requires licensed/public events, season-aware membership, identity resolution, a versioned feature calculation, cutoff enforcement, immutable snapshots, and time-based backtests before this label can represent a trained model.
