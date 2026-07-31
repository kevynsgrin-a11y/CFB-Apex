export interface BuyoutInputs {
  guaranteedRemaining: number;
  mitigationApplies: boolean;
  estimatedOffset: number;
  accelerationFees?: number;
}

export function calculateBuyout(inputs: BuyoutInputs) {
  const gross = Math.max(0, inputs.guaranteedRemaining) + Math.max(0, inputs.accelerationFees ?? 0);
  const offset = inputs.mitigationApplies
    ? Math.min(gross, Math.max(0, inputs.estimatedOffset))
    : 0;
  return {
    gross,
    offset,
    estimatedNet: Math.max(0, gross - offset),
    formula: inputs.mitigationApplies
      ? "Guaranteed compensation + acceleration fees − estimated mitigation/offset"
      : "Guaranteed compensation + acceleration fees",
  };
}
