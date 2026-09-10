/**
 * Travel-affiliate partner configuration (hotels, flights, car rental).
 *
 * Mirrors the ticket-partner pattern in lib/affiliates.ts: partners are
 * RECOMMENDED but not yet applied, so every surface renders fail-closed
 * (hidden) until a partner carries a `trackedUrl` or `destTemplate`. When a
 * partner approves and issues its link, `scripts/activate-affiliate.mjs`
 * flips it live across every surface at the next deploy.
 *
 * Selection strategy lives in docs/TRAVEL_AFFILIATE_STRATEGY.md:
 * challengers with above-market revenue shares (sports-travel placements),
 * consolidated under Travelpayouts where possible for volume leverage.
 */

export type TravelCategory = "hotels" | "flights" | "cars";

export interface TravelPartnerConfig {
  id: string;
  category: TravelCategory;
  name: string;
  network: string;
  commissionNote: string;
  /** Destination URL template with {query}; set at activation (verified). */
  destTemplate: string | null;
  /** Network click URL wrapping the destination; null until tracking is live. */
  trackedUrl: string | null;
}

export const travelPartners: TravelPartnerConfig[] = [
  // --- hotels ---
  {
    id: "hotelplanner",
    category: "hotels",
    name: "HotelPlanner",
    network: "FlexOffers / direct",
    commissionNote: "24% group · 4% individual stays",
    destTemplate: null,
    trackedUrl: null,
  },
  {
    id: "trip-com-hotels",
    category: "hotels",
    name: "Trip.com",
    network: "In-house",
    commissionNote: "Up to 7% hotels (tiered at volume)",
    destTemplate: null,
    trackedUrl: null,
  },
  {
    id: "stay22",
    category: "hotels",
    name: "Stay22",
    network: "Direct",
    commissionNote: "Revenue share on map-widget bookings",
    destTemplate: null,
    trackedUrl: null,
  },
  // --- flights ---
  {
    id: "kiwi",
    category: "flights",
    name: "Kiwi.com",
    network: "Travelpayouts",
    commissionNote: "3% of ticket price (~$13.50 avg)",
    destTemplate: null,
    trackedUrl: null,
  },
  {
    id: "wayaway",
    category: "flights",
    name: "WayAway",
    network: "Travelpayouts",
    commissionNote: "Up to 50% of their flight revenue",
    destTemplate: null,
    trackedUrl: null,
  },
  {
    id: "trip-com-flights",
    category: "flights",
    name: "Trip.com Flights",
    network: "In-house",
    commissionNote: "~4% domestic flights",
    destTemplate: null,
    trackedUrl: null,
  },
  // --- cars ---
  {
    id: "discovercars",
    category: "cars",
    name: "DiscoverCars",
    network: "Travelpayouts / CJ / in-house",
    commissionNote: "60-70% of their profit · 365-day cookie",
    destTemplate: null,
    trackedUrl: null,
  },
  {
    id: "economybookings",
    category: "cars",
    name: "EconomyBookings",
    network: "In-house / CJ",
    commissionNote: "60% revenue share, no caps",
    destTemplate: null,
    trackedUrl: null,
  },
  {
    id: "qeeq",
    category: "cars",
    name: "Qeeq",
    network: "In-house",
    commissionNote: "5-8% of gross order value",
    destTemplate: null,
    trackedUrl: null,
  },
];

export interface TravelLink {
  partner: string;
  category: TravelCategory;
  url: string;
  commissionNote: string;
  tracked: boolean;
}

/** Partners ready to render (activation filled a destination or tracker). */
export function activeTravelPartners(category?: TravelCategory): TravelPartnerConfig[] {
  return travelPartners.filter(
    (partner) =>
      (partner.trackedUrl || partner.destTemplate) &&
      (!category || partner.category === category),
  );
}

/**
 * Travel partner links for a destination query (e.g. "hotels near Bryant-Denny
 * Stadium, Tuscaloosa" or "Tuscaloosa car rental"). Only activated partners
 * return links — unactivated ones never render (fail-closed).
 */
export function travelLinksForQuery(query: string, category: TravelCategory): TravelLink[] {
  return activeTravelPartners(category).map((partner) => {
    const destination = (partner.destTemplate ?? "{query}").replace(
      "{query}",
      encodeURIComponent(query),
    );
    return {
      partner: partner.name,
      category: partner.category,
      url: partner.trackedUrl
        ? partner.trackedUrl.replace("{url}", encodeURIComponent(destination))
        : destination,
      commissionNote: partner.commissionNote,
      tracked: Boolean(partner.trackedUrl),
    };
  });
}

export const travelAffiliatesConfigured = travelPartners.some(
  (partner) => partner.trackedUrl || partner.destTemplate,
);
