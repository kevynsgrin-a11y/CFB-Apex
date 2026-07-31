import { brand } from "@/lib/config";

export function GET() {
  return Response.json({
    status: "ok",
    service: brand.name,
    dataEnvironment: "fixture",
    timestamp: new Date().toISOString(),
  });
}
