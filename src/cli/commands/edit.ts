import path from "node:path";
import { loadConfig } from "../../lib/config.js";
import { CliError } from "../../lib/errors.js";
import { readJsonFile } from "../../lib/fs.js";
import { ensureContentMap, ensureStringRecord } from "../../lib/validation.js";
import { ContentStorage } from "../../server/storage.js";

type EditOptions = {
  cwd: string;
  key: string;
  value: string;
};

export async function runEdit(options: EditOptions): Promise<void> {
  if (!/^[a-z0-9._-]+$/i.test(options.key)) {
    throw new CliError(`Invalid key "${options.key}".`, {
      hint: "Keys should use letters, numbers, dots, hyphens, and underscores."
    });
  }
  if (options.value.trim().length === 0) {
    throw new CliError("Edit value cannot be empty.");
  }

  const config = await loadConfig(options.cwd);
  const contentPath = path.join(options.cwd, config.contentFile);
  const mapPath = path.join(options.cwd, config.mapFile);

  const rawContent = await readJsonFile<unknown>(contentPath);
  const content = rawContent === null ? {} : ensureStringRecord(rawContent, config.contentFile);

  const rawMap = await readJsonFile<unknown>(mapPath);
  const map = rawMap === null ? [] : ensureContentMap(rawMap);
  const knownKeys = new Set([...Object.keys(content), ...map.map((entry) => entry.key)]);
  if (!knownKeys.has(options.key)) {
    throw new CliError(`Unknown key "${options.key}".`, {
      hint: "Run: content-overlay scan, then use one of the generated keys."
    });
  }

  const storage = new ContentStorage(options.cwd);
  const existingDraft = await storage.getDraft(options.key);
  const oldValue = existingDraft?.value ?? content[options.key];

  if (oldValue === options.value) {
    console.log(`No change for key: ${options.key}`);
    return;
  }

  const { version } = await storage.saveDraft(options.key, options.value, content[options.key]);

  if (existingDraft === null) {
    console.log(`Created draft key: ${options.key} (v${version})`);
  } else {
    console.log(`Updated draft key: ${options.key} (v${version})`);
    console.log(`Old: ${oldValue}`);
  }
  console.log(`New: ${options.value}`);
}
