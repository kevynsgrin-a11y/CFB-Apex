/**
 * cfb-apex-data — the edge API for the real 2026 FBS dataset.
 *
 * The dataset lives in this repository under `data/dist` and is staged into
 * `public/v1` at build time, so what is on `main` is exactly what this Worker
 * serves. Merging a change to the data and letting CI deploy is the whole
 * update path; there is no separate content system to fall out of sync with.
 *
 * Two surfaces:
 *   /v1/**        the raw dataset artifacts, byte-for-byte as committed
 *   /api/**       aggregations that would otherwise need a dozen round trips
 * plus a small server-rendered browser at `/` so the data can be eyeballed
 * without a client.
 */

import { AssetsDataSource, CfbDataClient } from "@cfb-apex/data";
import { renderPage } from "./html.js";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Comma-separated allow-list; `*` (the default) allows any origin. */
  ALLOWED_ORIGINS?: string;
  DATASET_VERSION?: string;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  // The dataset only changes on deploy, so it can be cached hard and revalidated
  // in the background. A merge still shows up immediately: a new deploy is a new
  // asset set with a new ETag.
  "cache-control": "public, max-age=300, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff",
};

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "*").trim();
  const origin = request.headers.get("origin");
  if (allowed === "*") {
    return { "access-control-allow-origin": "*" };
  }
  const list = allowed.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (origin && list.includes(origin)) {
    return { "access-control-allow-origin": origin, vary: "Origin" };
  }
  return {};
}

function json(body: unknown, request: Request, env: Env, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request, env) },
  });
}

function notFound(request: Request, env: Env, detail: string): Response {
  return json(
    {
      error: "not_found",
      detail,
      hint: "GET /api/routes for the available endpoints.",
    },
    request,
    env,
    404,
  );
}

const ROUTES = [
  { path: "/api/health", description: "Liveness plus the dataset build manifest" },
  { path: "/api/routes", description: "This list" },
  { path: "/api/teams", description: "All 138 FBS programs for 2026" },
  { path: "/api/conferences", description: "Conferences and their membership" },
  {
    path: "/api/teams/:slug",
    description: "Full team profile: roster, depth chart, schedule, staff, SOS, polls, injuries",
  },
  { path: "/api/rankings", description: "AP and Coaches Top 25, with poll metadata" },
  { path: "/api/scoreboard", description: "Games played so far in 2026" },
  { path: "/api/schedule?from=YYYY-MM-DD", description: "Upcoming games across all teams" },
  { path: "/api/sos/:season", description: "Strength of schedule (2026 or 2025)" },
  { path: "/api/injuries", description: "Latest published availability report" },
  { path: "/api/stats/historical/:season", description: "Team stats for one past season" },
  { path: "/api/search?q=", description: "Team lookup by name or slug" },
  { path: "/v1/**", description: "Raw dataset artifacts exactly as committed" },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(request, env),
          "access-control-allow-methods": "GET, HEAD, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
        },
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "method_not_allowed" }, request, env, 405);
    }

    // Raw dataset artifacts are served straight from the asset store.
    if (url.pathname === "/v1" || url.pathname.startsWith("/v1/")) {
      const response = await env.ASSETS.fetch(request);
      if (!response.ok) {
        return notFound(request, env, `no dataset artifact at ${url.pathname}`);
      }
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request, env))) {
        headers.set(key, value);
      }
      headers.set("cache-control", JSON_HEADERS["cache-control"]);
      return new Response(response.body, { status: response.status, headers });
    }

    const client = new CfbDataClient(new AssetsDataSource(env.ASSETS, url.origin, "/v1"));

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(url, request, env, client);
      }
      if (url.pathname === "/" || url.pathname.startsWith("/browse")) {
        return await renderPage(url, client, corsHeaders(request, env));
      }
    } catch (error) {
      return json(
        {
          error: "internal_error",
          detail: error instanceof Error ? error.message : String(error),
        },
        request,
        env,
        500,
      );
    }

    return notFound(request, env, `no route for ${url.pathname}`);
  },
};

async function handleApi(
  url: URL,
  request: Request,
  env: Env,
  client: CfbDataClient,
): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean).slice(1);
  const [head, ...rest] = segments;

  switch (head) {
    case "health": {
      const index = await client.index();
      return json(
        {
          status: "ok",
          dataset_version: env.DATASET_VERSION ?? index.meta.schema_version,
          as_of: index.meta.as_of ?? null,
          teams: index.team_count,
          datasets: Object.keys(index.datasets),
          warnings: index.warning_count,
        },
        request,
        env,
      );
    }

    case "routes":
      return json({ routes: ROUTES }, request, env);

    case "teams": {
      if (rest.length === 0) {
        const teams = await client.teams();
        return json({ count: teams.length, teams }, request, env);
      }
      const profile = await client.teamProfile(rest[0]);
      if (!profile) {
        return notFound(request, env, `unknown team: ${rest[0]}`);
      }
      return json(profile, request, env);
    }

    case "conferences": {
      const conferences = await client.conferences();
      if (rest.length === 0) {
        return json({ count: conferences.length, conferences }, request, env);
      }
      const conference = conferences.find((entry) => entry.slug === rest[0]);
      if (!conference) {
        return notFound(request, env, `unknown conference: ${rest[0]}`);
      }
      const teams = await client.teamsByConference(rest[0]);
      return json({ conference, teams }, request, env);
    }

    case "rankings": {
      const polls = await client.polls();
      if (!polls) {
        return notFound(request, env, "no poll data in this dataset build");
      }
      return json(polls, request, env);
    }

    case "scoreboard": {
      const season = await client.currentSeasonStats();
      if (!season) {
        return notFound(request, env, "no 2026 game data in this dataset build");
      }
      return json(season, request, env);
    }

    case "schedule": {
      const from = url.searchParams.get("from") ?? "2026-09-05";
      const limit = Number(url.searchParams.get("limit") ?? "50");
      const games = await client.upcomingGames(from, Number.isFinite(limit) ? limit : 50);
      return json({ from, count: games.length, games }, request, env);
    }

    case "sos": {
      const season = rest[0] ?? "2026";
      const sos = await client.strengthOfSchedule(season);
      if (!sos) {
        return notFound(request, env, `no strength-of-schedule data for ${season}`);
      }
      return json(sos, request, env);
    }

    case "injuries": {
      const report = await client.injuries();
      if (!report) {
        return notFound(request, env, "no injury report in this dataset build");
      }
      return json(report, request, env);
    }

    case "stats": {
      if (rest[0] === "historical" && rest[1]) {
        const season = Number(rest[1]);
        if (!Number.isInteger(season)) {
          return notFound(request, env, `not a season: ${rest[1]}`);
        }
        const [team, individual, advanced] = await Promise.all([
          client.historicalTeamStats(season),
          client.historicalIndividualStats(season),
          client.historicalAdvancedStats(season),
        ]);
        if (!team && !individual && !advanced) {
          return notFound(request, env, `no historical stats for ${season}`);
        }
        return json({ season, team, individual, advanced }, request, env);
      }
      if (rest[0] === "seasons") {
        return json({ seasons: await client.seasons() }, request, env);
      }
      return notFound(request, env, `no stats route for /${rest.join("/")}`);
    }

    case "search": {
      const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      if (!query) {
        return json({ query: "", results: [] }, request, env);
      }
      const teams = await client.teams();
      const results = teams
        .filter(
          (team) =>
            team.slug.includes(query) ||
            team.school.toLowerCase().includes(query) ||
            team.display_name.toLowerCase().includes(query) ||
            team.conference.toLowerCase().includes(query),
        )
        .slice(0, 25);
      return json({ query, count: results.length, results }, request, env);
    }

    default:
      return notFound(request, env, `no API route for /${segments.join("/")}`);
  }
}
