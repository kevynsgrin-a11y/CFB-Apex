import assert from "node:assert/strict";
import test from "node:test";
import { decideLiveGameCandidate, idempotencyMaterial, type CanonicalLiveGameState } from "../lib/live-data.ts";
import { getProductionGates, isProductionLaunchReady } from "../lib/release-readiness.ts";

const baseline: CanonicalLiveGameState = {
  gameId: "game-1",
  status: "in_progress",
  homeScore: 14,
  awayScore: 10,
  sourceVersion: 20,
  providerRecordId: "provider-game-1",
  payloadSha256: "a".repeat(64),
  dataEnvironment: "production",
};

test("live candidates accept forward updates and ignore duplicate or older versions", () => {
  assert.deepEqual(
    decideLiveGameCandidate(baseline, { ...baseline, homeScore: 21, sourceVersion: 21 }),
    { action: "publish", reason: "valid_update" },
  );
  assert.deepEqual(decideLiveGameCandidate(baseline, { ...baseline }), {
    action: "ignore",
    reason: "duplicate_or_out_of_order",
  });
});

test("score reversals require an explicit provider correction reference", () => {
  const reversed = { ...baseline, homeScore: 7, sourceVersion: 21 };
  assert.deepEqual(decideLiveGameCandidate(baseline, reversed), {
    action: "quarantine",
    reason: "undocumented_score_reversal",
  });
  assert.deepEqual(
    decideLiveGameCandidate(baseline, { ...reversed, correctionReference: "play-revision-44" }),
    { action: "publish", reason: "documented_correction" },
  );
});

test("invalid transitions and environment mixing are quarantined", () => {
  assert.deepEqual(
    decideLiveGameCandidate(baseline, { ...baseline, status: "scheduled", sourceVersion: 21 }),
    { action: "quarantine", reason: "invalid_status_transition" },
  );
  assert.deepEqual(
    decideLiveGameCandidate(baseline, { ...baseline, dataEnvironment: "sandbox", sourceVersion: 21 }),
    { action: "quarantine", reason: "environment_mismatch" },
  );
});

test("verified finals require an explicit corrected edition for score changes", () => {
  const finalState: CanonicalLiveGameState = {
    ...baseline,
    status: "final_verified",
    sourceVersion: 30,
  };
  assert.deepEqual(
    decideLiveGameCandidate(finalState, { ...finalState, homeScore: 17, sourceVersion: 31 }),
    { action: "quarantine", reason: "invalid_status_transition" },
  );
  assert.deepEqual(
    decideLiveGameCandidate(finalState, {
      ...finalState,
      status: "corrected",
      homeScore: 17,
      sourceVersion: 31,
      correctionReference: "official-stat-correction-2",
    }),
    { action: "publish", reason: "documented_correction" },
  );
});

test("idempotency material is provider-version-payload specific", () => {
  assert.equal(idempotencyMaterial(baseline), `provider-game-1:20:${"a".repeat(64)}`);
});

test("production readiness is deny-by-default and requires every recorded approval", () => {
  assert.equal(isProductionLaunchReady({}), false);
  assert.ok(getProductionGates({}).every((gate) => gate.status === "blocked"));

  const approved = {
    DEMO_MODE: "false",
    DISABLE_LIVE_PROVIDERS: "false",
    DISABLE_OFFICIAL_POLLS: "true",
    CORE_DATA_RIGHTS_APPROVED: "true",
    MARKS_POLICY_APPROVED: "true",
    PROVIDER_CREDENTIALS_CONFIGURED: "true",
    ENTITY_CROSSWALK_VERIFIED: "true",
    SHADOW_PILOT_PASSED: "true",
    INGESTION_RECOVERY_DRILL_PASSED: "true",
    KILL_SWITCH_DRILL_PASSED: "true",
    ON_CALL_OWNER_ASSIGNED: "true",
    LEGAL_LAUNCH_APPROVED: "true",
    PUBLIC_LAUNCH_APPROVED: "true",
  };
  assert.equal(isProductionLaunchReady(approved), true);
});
