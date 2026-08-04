export type CanonicalLiveGameStatus =
  | "scheduled"
  | "pregame"
  | "in_progress"
  | "halftime"
  | "delayed"
  | "suspended"
  | "postponed"
  | "canceled"
  | "forfeit"
  | "final_unverified"
  | "final_verified"
  | "corrected";

export interface CanonicalLiveGameState {
  gameId: string;
  status: CanonicalLiveGameStatus;
  homeScore: number;
  awayScore: number;
  sourceVersion: number;
  providerRecordId: string;
  payloadSha256: string;
  dataEnvironment: "sandbox" | "production";
  correctionReference?: string;
}

export type CandidateDecision =
  | { action: "publish"; reason: "valid_initial_state" | "valid_update" | "documented_correction" }
  | { action: "ignore"; reason: "duplicate_or_out_of_order" }
  | {
      action: "quarantine";
      reason:
        | "environment_mismatch"
        | "game_mismatch"
        | "invalid_score"
        | "invalid_status_transition"
        | "undocumented_score_reversal";
    };

const allowedTransitions: Record<CanonicalLiveGameStatus, ReadonlySet<CanonicalLiveGameStatus>> = {
  scheduled: new Set(["pregame", "in_progress", "delayed", "postponed", "canceled", "forfeit"]),
  pregame: new Set(["in_progress", "delayed", "postponed", "canceled", "forfeit"]),
  in_progress: new Set(["halftime", "delayed", "suspended", "final_unverified", "forfeit"]),
  halftime: new Set(["in_progress", "delayed", "suspended", "final_unverified"]),
  delayed: new Set(["pregame", "in_progress", "suspended", "postponed", "canceled"]),
  suspended: new Set(["in_progress", "postponed", "canceled", "final_unverified", "forfeit"]),
  postponed: new Set(["scheduled", "pregame", "canceled"]),
  canceled: new Set(),
  forfeit: new Set(["final_unverified", "corrected"]),
  final_unverified: new Set(["final_verified", "corrected"]),
  final_verified: new Set(["corrected"]),
  corrected: new Set(["final_verified", "corrected"]),
};

function isValidScore(value: number) {
  return Number.isInteger(value) && value >= 0;
}

export function decideLiveGameCandidate(
  previous: CanonicalLiveGameState | null,
  candidate: CanonicalLiveGameState,
): CandidateDecision {
  if (!isValidScore(candidate.homeScore) || !isValidScore(candidate.awayScore)) {
    return { action: "quarantine", reason: "invalid_score" };
  }

  if (!previous) return { action: "publish", reason: "valid_initial_state" };

  if (candidate.dataEnvironment !== previous.dataEnvironment) {
    return { action: "quarantine", reason: "environment_mismatch" };
  }

  if (candidate.gameId !== previous.gameId) {
    return { action: "quarantine", reason: "game_mismatch" };
  }

  if (candidate.sourceVersion <= previous.sourceVersion) {
    return { action: "ignore", reason: "duplicate_or_out_of_order" };
  }

  if (candidate.status !== previous.status && !allowedTransitions[previous.status].has(candidate.status)) {
    return { action: "quarantine", reason: "invalid_status_transition" };
  }

  const scoreReversed =
    candidate.homeScore < previous.homeScore || candidate.awayScore < previous.awayScore;
  const scoreChanged =
    candidate.homeScore !== previous.homeScore || candidate.awayScore !== previous.awayScore;
  if (previous.status === "final_verified" && scoreChanged && candidate.status !== "corrected") {
    return { action: "quarantine", reason: "invalid_status_transition" };
  }

  if (candidate.status === "corrected" && !candidate.correctionReference) {
    return { action: "quarantine", reason: "undocumented_score_reversal" };
  }

  if (scoreReversed && !candidate.correctionReference) {
    return { action: "quarantine", reason: "undocumented_score_reversal" };
  }

  if (scoreReversed || candidate.status === "corrected") {
    return { action: "publish", reason: "documented_correction" };
  }
  return { action: "publish", reason: "valid_update" };
}

export function idempotencyMaterial(state: CanonicalLiveGameState) {
  return [state.providerRecordId, state.sourceVersion, state.payloadSha256].join(":");
}
