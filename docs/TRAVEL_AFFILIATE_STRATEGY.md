# Travel Affiliate Strategy — Flights, Hotels, Car Rental

Researched and staged 2026-09-09. Placement surfaces are live (fail-closed) on
both sites; each partner activates with one link paste via
`scripts/activate-affiliate.mjs`.

## The leverage thesis

We are not a typical publisher: the Oak & Main portfolio runs many consumer
domains concurrently, and CFBApex + DukeFantasy own a unique sports-travel
moment — every stadium gameday guide and team hub is a trip-planning
surface (book the hotel near the stadium, the rental car, the flight for the
away/bowl game). Partners get portfolio-wide distribution and seasonal volume
spikes aligned with the sports calendar. In exchange we prioritize
challengers with above-market revenue shares and long cookies — the
"startup that values a strategic distribution partner" trade.

## Recommended partners (2-3 per category)

### Hotels
| Partner | Network | Terms | Why them |
|---|---|---|---|
| **HotelPlanner** (primary) | FlexOffers or direct | 24% group / 4% individual stays | The sports-group specialist — fan blocks, bowl trips, team travel are their core business; headline hotel rate; US challenger footprint |
| **Trip.com** (secondary) | In-house (trip.com/partners) | Up to 7% hotels, tiered at volume | All-in-one: also flights (~4%) and cars under one login; 30-day cookie; tier upside rewards portfolio volume |
| **Stay22** (portfolio tail) | Direct | Revenue share on map-widget bookings | Startup; embeddable interactive map of stays near a venue — zero-maintenance monetization for the long tail of portfolio sites |

### Flights
| Partner | Network | Terms | Why them |
|---|---|---|---|
| **Kiwi.com** (primary) | Travelpayouts | 3% of full ticket price (~$13.50 avg/booking) | Challenger brand; virtual interlining surfaces cheap fan routes; flat % of fare beats "% of our revenue" marketing math |
| **WayAway** (secondary) | Travelpayouts only | Up to 50% of their revenue (≈1.1-1.3% of fare) | Cashback angle converts deal-hunting fans; highest headline rate |
| **Trip.com flights** (bundle) | In-house | ~4% domestic flights | Consolidates with the Trip.com hotel program |

Honest note: flights are the weakest travel monetizer industry-wide
(1-2% of fare is typical). Their value is completing the trip loop — the
attach (hotel + car) is where the money is.

### Car rental
| Partner | Network | Terms | Why them |
|---|---|---|---|
| **DiscoverCars** (primary) | Travelpayouts / CJ / in-house | 70% of their profit (60% via TP) + 30%/25% on coverage; **365-day cookie** | Highest car-rental split in the industry with the longest cookie; challenger growth stage |
| **EconomyBookings** (secondary) | In-house / CJ | 60% revenue share, no caps | Second-highest split; simple model |
| **Qeeq** (leverage play) | In-house | 5-8% of GROSS order value, top-performer tiers | % of gross can beat % of net on big bookings; startup growth stage that rewards volume partners |

## The consolidation move: Travelpayouts

One free Travelpayouts account unlocks **DiscoverCars (cars), WayAway and
Kiwi.com (flights), plus Booking/Agoda/Trip hotel programs** — one dashboard,
one payout threshold, and consolidated portfolio volume that qualifies for
custom rates. Apply there first; add HotelPlanner (FlexOffers) and Stay22
(direct) for the sports-group and widget plays.

## Placement surfaces (already built, fail-closed until activation)

- **Stadium gameday guides** (138 pages) — "Plan your trip" block: hotels
  near the venue + rental car + flights
- **Team hub gameday cards** — travel row
- **Watch boards** (both sites) — travel partner strip beside tickets
- Future: bowl/playoff trip pages (postseason = peak booking windows)

## Activation

When a partner approves and issues a tracking link (or we choose a direct
public link first):

    node scripts/activate-affiliate.mjs travel <partner-id> "<pasted link>"

The partner flips live on every surface at the next deploy. See
lib/travel-affiliates.ts for partner IDs.

## Application links (one-click)

- Travelpayouts: https://www.travelpayouts.com/en/ → Sign up (unlocks Kiwi, WayAway, DiscoverCars, Booking, Agoda, Trip)
- HotelPlanner via FlexOffers: https://www.flexoffers.com/affiliate-programs/hotel-group-reservations-by-hotelplanner-com-affiliate-program/ (or ask James Hodge's TicketNetwork team for an intro — travel affiliates overlap)
- Trip.com: https://www.trip.com/partners
- Stay22: https://www.stay22.com (creator/partner page)
- EconomyBookings: https://www.economybookings.com/affiliate
- Qeeq: https://www.qeeq.com/affiliate-program
- DiscoverCars (if direct): https://www.discovercars.com/affiliate
