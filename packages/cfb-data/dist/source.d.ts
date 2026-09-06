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
/** Reads the dataset from a directory on disk (Node only). */
export declare class FileDataSource implements DataSource {
    #private;
    readonly root: string;
    constructor(root: string);
    read<T>(path: string): Promise<T | null>;
    has(path: string): Promise<boolean>;
}
/** Reads the dataset over HTTP, e.g. from the deployed data API. */
export declare class HttpDataSource implements DataSource {
    #private;
    readonly baseUrl: string;
    constructor(baseUrl: string, fetchImpl?: typeof fetch);
    read<T>(path: string): Promise<T | null>;
    has(path: string): Promise<boolean>;
}
/**
 * Reads from a Cloudflare Workers static-asset binding.
 *
 * The binding only answers absolute URLs, so requests are rebased onto the
 * incoming origin.
 */
export declare class AssetsDataSource implements DataSource {
    #private;
    constructor(assets: {
        fetch: (request: Request) => Promise<Response>;
    }, origin: string, prefix?: string);
    read<T>(path: string): Promise<T | null>;
    has(path: string): Promise<boolean>;
}
/** Serves an already-loaded dataset, for tests and for bundled builds. */
export declare class MemoryDataSource implements DataSource {
    #private;
    constructor(entries: Record<string, unknown>);
    read<T>(path: string): Promise<T | null>;
    has(path: string): Promise<boolean>;
}
