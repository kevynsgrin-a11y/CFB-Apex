import { providerHealth } from "@/lib/cfb-dataset";

export function GET() {
  return Response.json({
    environment: "dataset",
    providers: providerHealth,
  });
}
