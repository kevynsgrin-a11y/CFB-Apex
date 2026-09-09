"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { teamStyle, type BroadcastTeam } from "@/lib/homepage";
import { useFavoriteGesture } from "@/components/polish/favorites";

export function ApexLogo() {
  return (
    <a className="apex-logo" href="/" aria-label="CFB Apex home">
      <span className="apex-logo-word font-display">
        CFB<span>APEX</span>
        <i aria-hidden="true" />
      </span>
      <span className="apex-logo-caption">COLLEGE FOOTBALL. ELEVATED.</span>
    </a>
  );
}

export function TeamMark({
  team,
  size = "md",
  priority = false,
}: {
  team: BroadcastTeam;
  size?: "xs" | "sm" | "md" | "lg" | "hero";
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const favoriteGesture = useFavoriteGesture(team.slug, team.shortName);
  return (
    <span
      className={`apex-team-mark apex-team-mark--${size}`}
      style={teamStyle(team.color)}
      aria-hidden="true"
      {...favoriteGesture}
    >
      {team.logo && !failed ? (
        <Image
          unoptimized
          src={team.logo}
          alt=""
          width={size === "hero" ? 160 : 48}
          height={size === "hero" ? 160 : 48}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-display">{team.abbreviation}</span>
      )}
    </span>
  );
}

export function BroadcastBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "cyan";
}) {
  return <span className={`apex-badge apex-badge--${tone}`}>{children}</span>;
}

export function LaneHeading({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
  id,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  id: string;
}) {
  return (
    <div className="apex-lane-heading">
      <div>
        <span className="apex-eyebrow">{eyebrow}</span>
        <h2 id={id} className="font-display text-balance">
          {title}
        </h2>
      </div>
      {href && (
        <a className="apex-text-link" href={href}>
          {linkLabel}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

export function BroadcastButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      className={`apex-button${secondary ? " apex-button--secondary" : ""}`}
      href={href}
    >
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </a>
  );
}
