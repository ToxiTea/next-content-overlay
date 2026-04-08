import path from "node:path";
import { type ContentMapEntry } from "../types.js";

const JSX_TEXT_REGEX = />([^<>{}\n]+)</g;

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

function indexToLineCol(input: string, index: number): { line: number; column: number } {
  const before = input.slice(0, index);
  const lines = before.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

function isUsefulText(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 3) return false;
  if (!/[a-zA-Z]/.test(normalized)) return false;
  if (normalized.startsWith("{") || normalized.endsWith("}")) return false;
  return true;
}

export function extractTextEntries(filePath: string, fileContents: string, cwd: string): ContentMapEntry[] {
  const rel = path.relative(cwd, filePath).replace(/\\/g, "/");
  const relNoExt = rel.replace(/\.[^.]+$/, "");
  const fileToken = relNoExt.replace(/\//g, ".");
  const seen = new Map<string, number>();
  const results: ContentMapEntry[] = [];

  for (const match of fileContents.matchAll(JSX_TEXT_REGEX)) {
    const raw = match[1] ?? "";
    const text = raw.replace(/\s+/g, " ").trim();
    if (!isUsefulText(text)) continue;

    const slug = toSlug(text);
    if (!slug) continue;

    const count = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, count);

    const key = count === 1 ? `${fileToken}.${slug}` : `${fileToken}.${slug}-${count}`;
    const position = indexToLineCol(fileContents, match.index ?? 0);

    results.push({
      key,
      sourceFile: rel,
      line: position.line,
      column: position.column,
      defaultValue: text
    });
  }

  return results;
}

