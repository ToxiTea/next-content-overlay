import path from "node:path";
import { promises as fs } from "node:fs";

const CONTENT_PATH = path.join(process.cwd(), "content", "site.json");

export async function getContent(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(CONTENT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}
