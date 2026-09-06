import { brand } from "@/lib/config";

export function GET() {
  return Response.json({
    status: "ok",
    service: brand.name,
    dataEnvironment: "dataset",
    timestamp: new Date().toISOString(),
  });
}
