import { mkdir, writeFile } from "node:fs/promises";

const output = new URL("../artifacts/generated-social/drafts.json", import.meta.url);
await mkdir(new URL("../artifacts/generated-social/", import.meta.url), { recursive: true });
const drafts = [
  {
    kind: "product",
    status: "draft_requires_review",
    fixture: true,
    headline: "Every Saturday. One command center.",
    copy: "A demonstration of scores, roster movement, playoff paths, coaching economics, and gameday intelligence—without pretending fixture data is live.",
    canonicalPath: "/",
    altText: "College Football Hub dark command-center preview with fictional matchup and utility modules.",
  },
  {
    kind: "playoff_scenario",
    status: "draft_requires_review",
    fixture: true,
    headline: "You call the Saturdays. The field moves.",
    copy: "Force fictional outcomes, keep the seed, and reproduce the same demonstration playoff path.",
    canonicalPath: "/playoff-predictor",
    altText: "Demonstration playoff field with seeded probabilities and visible model version.",
  },
];
await writeFile(output, `${JSON.stringify(drafts, null, 2)}\n`, "utf8");
console.log("Generated fact-check-required fixture social drafts.");
