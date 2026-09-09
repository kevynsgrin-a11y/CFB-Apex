import type { ReactNode } from "react";
import { Database } from "lucide-react";

interface DataBoardHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function DataBoardHero({
  eyebrow,
  title,
  description,
  action,
}: DataBoardHeroProps) {
  return (
    <header className="db-hero">
      <div className="apex-container db-hero__inner">
        <div className="db-hero__copy">
          <span className="db-eyebrow">{eyebrow}</span>
          <h1 className="font-display text-balance">{title}</h1>
          <p className="text-pretty">{description}</p>
        </div>
        {action ? <div className="db-hero__action">{action}</div> : null}
      </div>
    </header>
  );
}

export interface SummaryItem {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

export function DataBoardSummary({
  items,
  caption,
  label,
}: {
  items: readonly SummaryItem[];
  caption?: string | null;
  label: string;
}) {
  return (
    <section className="apex-container db-summary-block" aria-label={label}>
      <dl className="db-summary">
        {items.map((item) => (
          <div key={item.label} data-emphasis={item.emphasis || undefined}>
            <dt>{item.label}</dt>
            <dd className="font-display">{item.value}</dd>
          </div>
        ))}
      </dl>
      {caption ? <p className="db-quiet-caption">{caption}</p> : null}
    </section>
  );
}

export function DataBoardEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="db-empty" aria-live="polite">
      <Database size={24} aria-hidden="true" />
      <h2 className="font-display">{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export function formatDataDate(value: string | null | undefined) {
  if (!value) return "Not published";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
