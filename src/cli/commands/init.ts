import path from "node:path";
import { promises as fs } from "node:fs";
import { DEFAULT_CONFIG, loadConfig, writeDefaultConfig } from "../../lib/config.js";
import { CliError } from "../../lib/errors.js";
import { readJsonFile, writeJsonFile } from "../../lib/fs.js";
import { ensureContentMap, ensureStringRecord } from "../../lib/validation.js";

type InitOptions = {
  cwd: string;
  force: boolean;
};

export async function runInit(options: InitOptions): Promise<void> {
  const result = await writeDefaultConfig(options.cwd, options.force);
  const activeConfig = result.created ? DEFAULT_CONFIG : await loadConfig(options.cwd);
  if (result.created) {
    console.log(`Created ${path.relative(options.cwd, result.path)}`);
  } else {
    console.log("Config already exists. Use --force to overwrite.");
  }

  const contentFile = path.join(options.cwd, activeConfig.contentFile);
  const rawContent = await readJsonFile<unknown>(contentFile);
  const existingContent = rawContent === null ? null : ensureStringRecord(rawContent, activeConfig.contentFile);
  if (!existingContent) {
    await writeJsonFile(contentFile, {});
    console.log(`Created ${activeConfig.contentFile}`);
  }

  const draftFile = path.join(options.cwd, activeConfig.draftFile);
  const rawDraft = await readJsonFile<unknown>(draftFile);
  const existingDraft = rawDraft === null ? null : ensureStringRecord(rawDraft, activeConfig.draftFile);
  if (!existingDraft) {
    await writeJsonFile(draftFile, existingContent ?? {});
    console.log(`Created ${activeConfig.draftFile}`);
  }

  const mapFile = path.join(options.cwd, activeConfig.mapFile);
  const rawMap = await readJsonFile<unknown>(mapFile);
  if (rawMap === null) {
    await writeJsonFile(mapFile, []);
    console.log(`Created ${activeConfig.mapFile}`);
  } else {
    ensureContentMap(rawMap);
  }

  const packageJsonPath = path.join(options.cwd, "package.json");
  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const hasNext = Boolean(pkg.dependencies?.next || pkg.devDependencies?.next);
    if (!hasNext) {
      console.log("Warning: next dependency not found in package.json. This tool is built for Next.js App Router.");
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CliError("Invalid package.json; unable to parse JSON.");
    }
    console.log("Warning: package.json not found. Run this in your Next.js project root.");
  }

  console.log("Init complete.");
}
