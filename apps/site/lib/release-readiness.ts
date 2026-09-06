export interface ProductionGate {
  id: string;
  label: string;
  status: "ready" | "blocked";
  blockedReason: string;
}

const gateDefinitions = [
  {
    id: "LIVE_MODE",
    label: "Live mode deliberately enabled",
    blockedReason: "Fixture mode or the live-provider kill switch remains active.",
    ready: (environment: Record<string, string | undefined>) =>
      environment.DEMO_MODE === "false" && environment.DISABLE_LIVE_PROVIDERS === "false",
  },
  {
    id: "CORE_DATA_RIGHTS_APPROVED",
    label: "Core data display and derivative rights",
    blockedReason: "Signed provider rights are not recorded.",
    ready: (environment: Record<string, string | undefined>) => isApproved(environment.CORE_DATA_RIGHTS_APPROVED),
  },
  {
    id: "POLL_POLICY",
    label: "Official poll rights or disabled poll surfaces",
    blockedReason: "Poll rights are absent and official poll surfaces are not disabled.",
    ready: (environment: Record<string, string | undefined>) =>
      isApproved(environment.POLL_RIGHTS_APPROVED) || isApproved(environment.DISABLE_OFFICIAL_POLLS),
  },
  ...[
    ["MARKS_POLICY_APPROVED", "Text-only or licensed marks policy", "Marks fallback or licenses are not approved."],
    ["PROVIDER_CREDENTIALS_CONFIGURED", "Production provider credentials", "Server-side production credentials are absent."],
    ["ENTITY_CROSSWALK_VERIFIED", "2026 entity crosswalk", "Team, game, person, venue, and provider IDs are not verified."],
    ["SHADOW_PILOT_PASSED", "Replay and live shadow pilot", "The required nonpublic pilot has not passed."],
    ["INGESTION_RECOVERY_DRILL_PASSED", "Ingestion recovery and DLQ drill", "Recovery, replay, and dead-letter behavior is unproven."],
    ["KILL_SWITCH_DRILL_PASSED", "Publication kill-switch drill", "The publication freeze and rollback drill has not passed."],
    ["ON_CALL_OWNER_ASSIGNED", "Game-window operations owner", "No staffed live-game operations owner is recorded."],
    ["LEGAL_LAUNCH_APPROVED", "Legal launch approval", "Legal and data-rights launch approval is absent."],
    ["PUBLIC_LAUNCH_APPROVED", "Explicit public launch approval", "Public live launch has not been explicitly approved."],
  ].map(([id, label, blockedReason]) => ({
    id,
    label,
    blockedReason,
    ready: (environment: Record<string, string | undefined>) => isApproved(environment[id]),
  })),
];

function isApproved(value: string | undefined) {
  return value === "true";
}

export function getProductionGates(environment: Record<string, string | undefined>): ProductionGate[] {
  return gateDefinitions.map((gate) => ({
    id: gate.id,
    label: gate.label,
    status: gate.ready(environment) ? "ready" : "blocked",
    blockedReason: gate.blockedReason,
  }));
}

export function isProductionLaunchReady(environment: Record<string, string | undefined>) {
  return getProductionGates(environment).every((gate) => gate.status === "ready");
}
