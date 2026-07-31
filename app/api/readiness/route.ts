import { providerHealth } from "@/lib/fixtures";

export function GET() {
  return Response.json({
    readyForPreview: true,
    readyForProductionLiveData: false,
    fixtureProvider: providerHealth.find((provider) => provider.id === "fixture-sports")?.status,
    externalDependencies: providerHealth
      .filter((provider) => provider.mode === "production")
      .map(({ id, status, note }) => ({ id, status, note })),
  });
}
