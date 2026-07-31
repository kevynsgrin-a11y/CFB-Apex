# ADR 0003 — Database and migrations

Do not allocate D1 for ephemeral fixture flows. When durable records are activated, use additive Drizzle migrations, indexed provenance-bearing tables, tested clean migration, and D1 Time Travel for recovery—not as a migration method.
