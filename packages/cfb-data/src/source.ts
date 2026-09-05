/**
 * Where the dataset is read from.
 *
 * The same reader API serves two very different callers, so the transport is a
 * parameter rather than a build-time assumption:
 *
 *   - The site's build reads JSON off disk and bundles it, so pages render with
 *     zero network calls and cannot go blank because an API was slow.
 *   - The edge Worker reads over HTTP from its own asset store.
 *
 * Both go through `DataSource`, so a page written against one works against the
 * other unchanged.
 */

export interface DataSource {
  /** Resolve a dist-relative path such as `rosters/clemson.json`. */
  read<T>(path: string): Promise<T | null>;
  /** True when the artifact exists, without paying to parse it. */
  has(path: string): Promise<boolean>;
}

const JSON_SUFFIX = ".json";

function normalize(path: string): string {
  const trimmed = path.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (trimmed.includes("..")) {
    throw new Error(`refusing to traverse outside the dataset: ${path}`);
  }
  return trimmed.endsWith(JSON_SUFFIX) ? trimmed : `${trimmed}${JSON_SUFFIX}`;
}

/** Reads the dataset from a directory on disk (Node only). */
export class FileDataSource implements DataSource {
  readonly root: string;
  #cache = new Map<string, unknown>();

  constructor(root: string) {
    this.root = root;
  }

  async read<T>(path: string): Promise<T | null> {
    const key = normalize(path);
    if (this.#cache.has(key)) {
      return this.#cache.get(key) as T;
    }
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    try {
      const text = await readFile(join(this.root, key), "utf8");
      const value = JSON.parse(text) as T;
      this.#cache.set(key, value);
      return value;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        this.#cache.set(key, null);
        return null;
      }
      throw error;
    }
  }

  async has(path: string): Promise<boolean> {
    const { access } = await import("node:fs/promises");
    const { join } = await import("node:path");
    try {
      await access(join(this.root, normalize(path)));
      return true;
    } catch {
      return false;
    }
  }
}

/** Reads the dataset over HTTP, e.g. from the deployed data API. */
export class HttpDataSource implements DataSource {
  readonly baseUrl: string;
  readonly #fetch: typeof fetch;
  #cache = new Map<string, unknown>();

  constructor(baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.#fetch = fetchImpl;
  }

  async read<T>(path: string): Promise<T | null> {
    const key = normalize(path);
    if (this.#cache.has(key)) {
      return this.#cache.get(key) as T;
    }
    const response = await this.#fetch(`${this.baseUrl}/${key}`);
    if (response.status === 404) {
      this.#cache.set(key, null);
      return null;
    }
    if (!response.ok) {
      throw new Error(`dataset fetch failed: ${key} -> HTTP ${response.status}`);
    }
    const value = (await response.json()) as T;
    this.#cache.set(key, value);
    return value;
  }

  async has(path: string): Promise<boolean> {
    return (await this.read(path)) !== null;
  }
}

/**
 * Reads from a Cloudflare Workers static-asset binding.
 *
 * The binding only answers absolute URLs, so requests are rebased onto the
 * incoming origin.
 */
export class AssetsDataSource implements DataSource {
  readonly #assets: { fetch: (request: Request) => Promise<Response> };
  readonly #origin: string;
  readonly #prefix: string;
  #cache = new Map<string, unknown>();

  constructor(
    assets: { fetch: (request: Request) => Promise<Response> },
    origin: string,
    prefix = "/v1",
  ) {
    this.#assets = assets;
    this.#origin = origin.replace(/\/+$/, "");
    this.#prefix = prefix.replace(/\/+$/, "");
  }

  async read<T>(path: string): Promise<T | null> {
    const key = normalize(path);
    if (this.#cache.has(key)) {
      return this.#cache.get(key) as T;
    }
    const response = await this.#assets.fetch(
      new Request(`${this.#origin}${this.#prefix}/${key}`),
    );
    if (!response.ok) {
      this.#cache.set(key, null);
      return null;
    }
    const value = (await response.json()) as T;
    this.#cache.set(key, value);
    return value;
  }

  async has(path: string): Promise<boolean> {
    return (await this.read(path)) !== null;
  }
}

/** Serves an already-loaded dataset, for tests and for bundled builds. */
export class MemoryDataSource implements DataSource {
  #entries: Map<string, unknown>;

  constructor(entries: Record<string, unknown>) {
    this.#entries = new Map(
      Object.entries(entries).map(([key, value]) => [normalize(key), value]),
    );
  }

  async read<T>(path: string): Promise<T | null> {
    return (this.#entries.get(normalize(path)) as T) ?? null;
  }

  async has(path: string): Promise<boolean> {
    return this.#entries.has(normalize(path));
  }
}
