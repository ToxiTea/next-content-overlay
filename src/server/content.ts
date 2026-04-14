import path from "node:path";
import { readJsonFile } from "../lib/fs.js";
import type { StorageAdapter } from "../types.js";

export type GetContentOptions = {
  /** Project root directory. Default: process.cwd(). Ignored if `storage` is provided. */
  rootDir?: string;
  /** Custom storage adapter. If provided, reads published content from it. */
  storage?: StorageAdapter;
};

/**
 * Read published content for SSR. Defaults to reading `content/site.json`
 * from disk, but accepts a custom `StorageAdapter` so database-backed setups
 * can hydrate the provider the same way.
 *
 * Backward compatible: `getContent()` and `getContent("/my/root")` still work.
 */
export async function getContent(
  optionsOrRootDir?: string | GetContentOptions
): Promise<Record<string, string>> {
  const options: GetContentOptions =
    typeof optionsOrRootDir === "string"
      ? { rootDir: optionsOrRootDir }
      : optionsOrRootDir ?? {};

  if (options.storage) {
    return options.storage.getPublished();
  }

  const contentPath = path.join(options.rootDir ?? process.cwd(), "content", "site.json");
  const raw = await readJsonFile<unknown>(contentPath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
