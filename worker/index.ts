/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { isProductionLaunchReady } from "../lib/release-readiness";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  [key: string]: unknown;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function secureResponse(response: Response, url: URL, launchReady: boolean) {
  const secured = new Response(response.body, response);
  secured.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; media-src 'none'; worker-src 'self';",
  );
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()",
  );
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // Indexing is gated on the production launch decision. Until every release
  // gate is ready, the site stays out of search engines.
  if (!launchReady) {
    secured.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  if (url.protocol === "https:") {
    secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return secured;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const launchReady = isProductionLaunchReady(
      env as unknown as Record<string, string | undefined>,
    );

    if (url.hostname.toLowerCase() === "www.cfbapex.com") {
      const canonicalUrl = new URL(request.url);
      canonicalUrl.protocol = "https:";
      canonicalUrl.hostname = "cfbapex.com";
      canonicalUrl.port = "";
      return secureResponse(
        new Response(null, {
          status: 308,
          headers: {
            "Cache-Control": "public, max-age=3600",
            Location: canonicalUrl.toString(),
          },
        }),
        url,
        launchReady,
      );
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return secureResponse(imageResponse, url, launchReady);
    }

    // robots.txt is a build-time artifact that disallows everything. Once the
    // launch gates are ready, serve crawling rules from the Worker instead.
    if (url.pathname === "/robots.txt" && launchReady) {
      const body = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "",
        `Sitemap: https://cfbapex.com/sitemap.xml`,
        "",
      ].join("\n");
      return secureResponse(
        new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
        url,
        launchReady,
      );
    }

    const response = await handler.fetch(request, env, ctx);
    return secureResponse(response, url, launchReady);
  },
};

export default worker;
