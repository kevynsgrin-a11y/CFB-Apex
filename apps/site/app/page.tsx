import type { Metadata } from "next";
import { HubApp } from "@/components/HubApp";
import { environment } from "@/lib/config";

// The homepage declares its canonical like every catch-all page does. It is
// absolute and built from the configured production origin, not the request
// host, so a preview or alternate host never self-canonicalises.
export const metadata: Metadata = {
  alternates: { canonical: `${environment.siteUrl.replace(/\/$/, "")}/` },
};

export default function Home() {
  return <HubApp path="/" />;
}
