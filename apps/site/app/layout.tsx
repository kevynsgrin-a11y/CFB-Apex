import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { brand, environment } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : environment.siteUrl;
  const image = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: {
      default: `${brand.name} — Every Saturday. One command center.`,
      template: `%s | ${brand.name}`,
    },
    description: brand.description,
    applicationName: brand.name,
    robots: {
      // Page-level metadata allows indexing once the launch gates pass; the
      // Worker enforces X-Robots-Tag: noindex and a disallow-all robots.txt
      // until isProductionLaunchReady() is true.
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      title: `${brand.name} — Every Saturday. One command center.`,
      description: brand.description,
      siteName: brand.name,
      images: [{ url: image, width: 1792, height: 896, alt: `${brand.name} command center preview` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${brand.name} — Every Saturday. One command center.`,
      description: brand.description,
      images: [image],
    },
    other: {
      // TicketNetwork affiliate signup (Impact). Verification meta required in
      // the homepage <head>; rendered on every page via the root layout.
      "impact-site-verification": "c81c4223-6b4f-49f8-8ae5-93b6cc54ffb0",
    },
  };
}

export const viewport = {
  themeColor: "#07131f",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : environment.siteUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    description: brand.description,
    url: origin,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" data-environment="dataset">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script type="application/ld+json">
          {JSON.stringify(structuredData).replaceAll("<", "\\u003c")}
        </script>
        {children}
      </body>
    </html>
  );
}
