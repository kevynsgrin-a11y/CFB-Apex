/**
 * Ticket-affiliate partner configuration (TicketNetwork primary, TicketSmarter
 * secondary — both via CJ Affiliate).
 *
 * FAIL-CLOSED BY DESIGN: `cjUrl` is null until the CJ account is approved and
 * the advertiser-specific click URL is issued. While it is null,
 * ticketLinksForTeam() returns nothing and the site renders its no-partner
 * ticket card. The templates below contain no secrets — CJ tracking URLs are
 * public destination links — they are simply not yet issued.
 *
 * To activate a partner once CJ approves:
 *   1. Fill `cjUrl` with the CJ click link, e.g.
 *      "https://www.dpbolvw.net/click-<siteid>-<adid>?url={url}"
 *      ({url} is replaced with the percent-encoded destination).
 *   2. Verify the destination template resolves to that partner's live
 *      search results for a college team.
 *   3. Rendered links carry rel="sponsored nofollow" and sit beside the
 *      /affiliate-disclosure page, which is already live.
 */

export interface TicketPartnerConfig {
  id: "ticketnetwork" | "ticketsmarter";
  name: string;
  /** Destination search URL; {query} is replaced with the team display name. */
  destTemplate: string;
  /** CJ click URL wrapping the destination; null until the account is live. */
  cjUrl: string | null;
  commissionNote: string;
}

export const ticketPartners: TicketPartnerConfig[] = [
  {
    id: "ticketnetwork",
    name: "TicketNetwork",
    destTemplate: "https://www.ticketnetwork.com/en/search?q={query}",
    cjUrl: null,
    commissionNote: "12.5–14.5% per sale",
  },
  {
    id: "ticketsmarter",
    name: "TicketSmarter",
    destTemplate: "https://www.ticketsmarter.com/search?q={query}",
    cjUrl: null,
    commissionNote: "8% per sale",
  },
];

export interface TicketLink {
  partner: string;
  url: string;
  commissionNote: string;
}

/** Affiliate ticket links for a team, or [] while no partner is configured. */
export function ticketLinksForTeam(displayName: string): TicketLink[] {
  const links: TicketLink[] = [];
  for (const partner of ticketPartners) {
    if (!partner.cjUrl) continue;
    const destination = partner.destTemplate.replace(
      "{query}",
      encodeURIComponent(`${displayName} football tickets`),
    );
    links.push({
      partner: partner.name,
      url: partner.cjUrl.replace("{url}", encodeURIComponent(destination)),
      commissionNote: partner.commissionNote,
    });
  }
  return links;
}

export const ticketAffiliatesConfigured = ticketPartners.some((partner) => partner.cjUrl != null);
