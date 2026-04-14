import path from "node:path";
import { readJsonFile } from "../lib/fs.js";

/**
 * Read published content from content/site.json.
 * Use this in server components to pass initialContent to ContentOverlayProvider.
 *
 * @param rootDir - Project root directory. Default: process.cwd()
 * @returns Record<string, string> of published content
 */
export async function getContent(rootDir?: string): Promise<Record<string, string>> {
  const contentPath = path.join(rootDir ?? process.cwd(), "content", "site.json");
  const raw = await readJsonFile<unknown>(contentPath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
