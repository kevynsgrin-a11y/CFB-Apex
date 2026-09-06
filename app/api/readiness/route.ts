import { providerHealth } from "@/lib/cfb-dataset";
import { getProductionGates, isProductionLaunchReady } from "@/lib/release-readiness";

export function GET() {
  const gates = getProductionGates(process.env);
  return Response.json(
    {
      readyForPreview: true,
      readyForProductionLiveData: isProductionLaunchReady(process.env),
      datasetProvider: providerHealth.find((provider) => provider.id === "cfb-apex-dataset")?.status,
      externalDependencies: providerHealth
        .filter((provider) => provider.mode === "production")
        .map(({ id, status, note }) => ({ id, status, note })),
      productionGates: gates.map(({ id, label, status, blockedReason }) => ({
        id,
        label,
        status,
        note: status === "blocked" ? blockedReason : "Approval recorded.",
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
