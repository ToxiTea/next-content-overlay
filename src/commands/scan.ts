import path from "node:path";
import { promises as fs } from "node:fs";
import { loadConfig } from "../lib/config.js";
import { CliError } from "../lib/errors.js";
import { collectFiles, readJsonFile, writeJsonFile } from "../lib/fs.js";
import { extractTextEntries } from "../lib/scan.js";
import { type ContentMapEntry } from "../types.js";
import { ensureStringRecord } from "../lib/validation.js";

type ScanOptions = {
  cwd: string;
};

export async function runScan(options: ScanOptions): Promise<void> {
  const config = await loadConfig(options.cwd);
  const extensions = new Set(config.extensions.map((ext) => ext.toLowerCase()));
  const allFiles: string[] = [];
  const existingDirs: string[] = [];

  for (const dir of config.scanDirs) {
    const dirPath = path.join(options.cwd, dir);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        continue;
      }
      existingDirs.push(dir);
    } catch {
      continue;
    }
    const files = await collectFiles(dirPath, extensions);
    allFiles.push(...files);
  }

  if (existingDirs.length === 0) {
    throw new CliError("No scan directories found.", {
      hint: `Expected one of: ${config.scanDirs.join(", ")}`
    });
  }

  const uniqueFiles = [...new Set(allFiles)].sort((a, b) => a.localeCompare(b));

  const map: ContentMapEntry[] = [];
  for (const filePath of uniqueFiles) {
    const source = await fs.readFile(filePath, "utf8");
    const entries = extractTextEntries(filePath, source, options.cwd);
    map.push(...entries);
  }

  const contentPath = path.join(options.cwd, config.contentFile);
  const rawContent = await readJsonFile<unknown>(contentPath);
  const existingContent = rawContent === null ? {} : ensureStringRecord(rawContent, config.contentFile);
  const nextContent: Record<string, string> = { ...existingContent };
  let newKeys = 0;

  for (const entry of map) {
    if (!(entry.key in nextContent)) {
      nextContent[entry.key] = entry.defaultValue;
      newKeys += 1;
    }
  }

  await writeJsonFile(path.join(options.cwd, config.mapFile), map);
  await writeJsonFile(contentPath, nextContent);

  const draftPath = path.join(options.cwd, config.draftFile);
  const rawDraft = await readJsonFile<unknown>(draftPath);
  const existingDraft = rawDraft === null ? null : ensureStringRecord(rawDraft, config.draftFile);
  const nextDraft = { ...nextContent, ...(existingDraft ?? {}) };
  await writeJsonFile(draftPath, nextDraft);

  console.log(`Scanned ${uniqueFiles.length} files.`);
  console.log(`Found ${map.length} editable text nodes.`);
  console.log(`Added ${newKeys} new keys to ${config.contentFile}.`);
  if (map.length === 0) {
    console.log("Warning: No text nodes found. Make sure files contain plain JSX text between tags.");
  }
}
