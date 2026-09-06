/**
 * @cfb-apex/data — the real 2026 FBS dataset, typed.
 *
 * This package replaces the site's fixture pack. Point it at the committed
 * dataset and every page renders published data instead of invented teams:
 *
 * ```ts
 * import { createFileClient } from "@cfb-apex/data";
 *
 * const cfb = createFileClient("data/dist");
 * const clemson = await cfb.teamProfile("clemson");
 * const top25 = await cfb.top25("ap");
 * ```
 *
 * At the edge, read from the deployed API instead:
 *
 * ```ts
 * import { createHttpClient } from "@cfb-apex/data";
 * const cfb = createHttpClient("https://cfb-apex-data.example.workers.dev/v1");
 * ```
 */

export * from "./types.js";
export {
  AssetsDataSource,
  FileDataSource,
  HttpDataSource,
  MemoryDataSource,
  type DataSource,
} from "./source.js";
export { CfbDataClient, DatasetError, createClient, type DatasetIndex } from "./client.js";

import { CfbDataClient } from "./client.js";
import { FileDataSource, HttpDataSource, MemoryDataSource } from "./source.js";

/** Read the dataset from a directory on disk. Node only. */
export function createFileClient(root: string): CfbDataClient {
  return new CfbDataClient(new FileDataSource(root));
}

/** Read the dataset over HTTP from a deployed data API. */
export function createHttpClient(baseUrl: string, fetchImpl?: typeof fetch): CfbDataClient {
  return new CfbDataClient(new HttpDataSource(baseUrl, fetchImpl));
}

/** Read an already-loaded dataset. Useful in tests and bundled builds. */
export function createMemoryClient(entries: Record<string, unknown>): CfbDataClient {
  return new CfbDataClient(new MemoryDataSource(entries));
}
