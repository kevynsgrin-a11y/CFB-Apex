export type AnalyticsEventName =
  | "score_filter_used"
  | "favorite_added"
  | "game_opened"
  | "destination_action"
  | "odds_mode_enabled"
  | "source_drawer_opened"
  | "portal_filter_used"
  | "simulation_completed"
  | "simulation_shared"
  | "coach_buyout_viewed"
  | "dfs_filter_used"
  | "stadium_guide_opened"
  | "newsletter_updated"
  | "correction_submitted";

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  module: string;
  route: string;
  dataMode: "fixture" | "production";
  productMode: "clean" | "analysis";
  season: number;
  schemaVersion: "1";
  context?: Record<string, string | number | boolean>;
}

export function trackEvent(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cfb-hub:analytics", { detail: event }));
}
