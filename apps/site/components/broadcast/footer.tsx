import { ArrowUpRight, ChevronDown, ShieldCheck } from "lucide-react";
import { ApexLogo } from "./primitives";

const columns = [
  {
    title: "Product",
    links: [
      ["Scores & schedules", "/scores"],
      ["All teams", "/teams"],
      ["Rankings", "/rankings"],
      ["Transfer portal", "/transfer-portal"],
      ["Newsletter", "/newsletter"],
    ],
  },
  {
    title: "Trust",
    links: [
      ["Our methodology", "/methodology"],
      ["Data sources", "/data-sources"],
      ["Corrections", "/corrections"],
      ["Privacy & terms", "/privacy"],
      ["Responsible gaming", "/responsible-gaming"],
    ],
  },
  {
    title: "Business",
    links: [
      ["About CFB Apex", "/about"],
      ["Advertise", "/advertise"],
      ["Partnerships", "/partnerships"],
      ["Media kit", "/media-kit"],
    ],
  },
  {
    title: "Contact",
    links: [
      ["hello@cfbapex.com", "mailto:hello@cfbapex.com"],
      ["admin@cfbapex.com", "mailto:admin@cfbapex.com"],
      ["media@cfbapex.com", "mailto:media@cfbapex.com"],
      ["socials@cfbapex.com", "mailto:socials@cfbapex.com"],
      ["privacy@cfbapex.com", "mailto:privacy@cfbapex.com"],
    ],
  },
];

export function BroadcastFooter() {
  return (
    <footer className="apex-footer">
      <div className="apex-container">
        <div className="apex-footer-main">
          <div className="apex-footer-brand">
            <ApexLogo />
            <p>
              For the way you follow the game.
              <br />
              Every team. Every Saturday.
            </p>
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              Independent. Source-aware. Fan-first.
            </span>
          </div>
          <div className="apex-footer-columns apex-footer-columns--desktop">
            {columns.map((column) => (
              <div key={column.title}>
                <h2>{column.title}</h2>
                {column.links.map(([label, href]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="apex-footer-accordion">
            {columns.map((column) => (
              <details key={column.title}>
                <summary>
                  <span>{column.title}</span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div>
                  {column.links.map(([label, href]) => (
                    <a key={href} href={href}>
                      {label}
                    </a>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
        <div className="apex-footer-bottom">
          <span>© 2026 CFB Apex. All rights reserved.</span>
          <div>
            <a href="/terms">Terms</a>
            <a href="/affiliate-disclosure">Affiliate disclosure</a>
            <a href="/data-sources">
              2026 FBS dataset
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
