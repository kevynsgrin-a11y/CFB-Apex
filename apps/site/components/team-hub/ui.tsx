"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, FileQuestion } from "lucide-react";
import type { HubTeam } from "@/lib/team-hub";
import { useFavoriteGesture } from "@/components/polish/favorites";

export const NOT_PUBLISHED = "Not published";

export function published(value: string | number | null | undefined) {
  return value == null || value === "" ? NOT_PUBLISHED : String(value);
}

export function rank(value: number | null | undefined) {
  return value == null ? NOT_PUBLISHED : `#${value}`;
}

export function decimal(value: number | null | undefined) {
  return value == null ? NOT_PUBLISHED : value.toFixed(1);
}

export function dateLabel(value: string | null | undefined, year = true) {
  if (!value) return NOT_PUBLISHED;
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return NOT_PUBLISHED;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(date);
}

export function HubMark({
  team,
  hero = false,
}: {
  team: Pick<HubTeam, "shortName" | "logo"> & Partial<Pick<HubTeam, "slug">>;
  hero?: boolean;
}) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const favoriteGesture = useFavoriteGesture(team.slug, team.shortName);
  return (
    <span
      className={hero ? "hub-mark hub-mark--hero" : "hub-mark"}
      aria-hidden="true"
      {...favoriteGesture}
    >
      {team.logo && failedLogo !== team.logo ? (
        <Image
          src={team.logo}
          alt=""
          unoptimized
          width={hero ? 240 : 48}
          height={hero ? 240 : 48}
          loading={hero ? "eager" : "lazy"}
          onError={() => setFailedLogo(team.logo ?? null)}
        />
      ) : (
        <span className="font-display">
          {team.shortName
            .split(" ")
            .map((word) => word[0])
            .slice(0, 3)
            .join("")}
        </span>
      )}
    </span>
  );
}

export function HubLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="hub-link" href={href}>
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </a>
  );
}

export function HubHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="hub-section-heading">
      <div>
        <span className="hub-eyebrow">{eyebrow}</span>
        <h2 className="font-display">{title}</h2>
      </div>
      {children}
    </header>
  );
}

export function HubEmpty({
  title = "Not published",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="hub-empty">
      <FileQuestion size={24} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function HubSection({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={id.charAt(0).toUpperCase() + id.slice(1)}
      className="hub-section"
    >
      {children}
    </section>
  );
}
