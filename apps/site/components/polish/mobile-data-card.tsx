import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface MobileDataField {
  label: string;
  value: ReactNode;
}

export function MobileDataCard({
  title,
  subtitle,
  summary,
  details,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  summary: readonly MobileDataField[];
  details: readonly MobileDataField[];
  action?: ReactNode;
}) {
  return (
    <details className="mobile-data-card">
      <summary>
        <span className="mobile-data-card__heading">
          <strong>{title}</strong>
          {subtitle ? <small>{subtitle}</small> : null}
        </span>
        <span className="mobile-data-card__summary">
          {summary.slice(0, 3).map((field) => (
            <span key={field.label}>
              <small>{field.label}</small>
              <b>{field.value}</b>
            </span>
          ))}
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="mobile-data-card__details">
        <dl>
          {details.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
        {action ? <div className="mobile-data-card__action">{action}</div> : null}
      </div>
    </details>
  );
}

export function MobileDataCardStack({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="mobile-data-card-stack" aria-label={label}>
      {children}
    </section>
  );
}
