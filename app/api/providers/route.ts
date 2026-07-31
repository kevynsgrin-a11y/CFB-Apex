import { providerHealth } from "@/lib/fixtures";

export function GET() {
  return Response.json({
    environment: "fixture",
    providers: providerHealth,
  });
}
