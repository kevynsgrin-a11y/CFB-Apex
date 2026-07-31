import { readFile } from "node:fs/promises";

const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
if (hosting.d1) {
  throw new Error("D1 is declared; generate and validate migrations before continuing.");
}
console.log("Migration check: PASS — fixture preview declares no durable database.");
