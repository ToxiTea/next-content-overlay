import path from "node:path";
import { loadConfig } from "../lib/config.js";
import { readJsonFile, writeJsonFile } from "../lib/fs.js";
import { ensureStringRecord } from "../lib/validation.js";

type PublishOptions = {
  cwd: string;
};

export async function runPublish(options: PublishOptions): Promise<void> {
  const config = await loadConfig(options.cwd);
  const contentPath = path.join(options.cwd, config.contentFile);
  const draftPath = path.join(options.cwd, config.draftFile);
  const publishMetaPath = path.join(options.cwd, ".overlay-content/last-publish.json");

  const rawContent = await readJsonFile<unknown>(contentPath);
  const content = rawContent === null ? {} : ensureStringRecord(rawContent, config.contentFile);

  const rawDraft = await readJsonFile<unknown>(draftPath);
  const draft = rawDraft === null ? { ...content } : ensureStringRecord(rawDraft, config.draftFile);
  const nextContent = { ...content, ...draft };

  const candidateKeys = new Set([...Object.keys(content), ...Object.keys(nextContent)]);
  const changedKeys = [...candidateKeys].filter((key) => nextContent[key] !== content[key]);

  if (changedKeys.length === 0) {
    console.log("No draft changes to publish.");
    return;
  }

  await writeJsonFile(contentPath, nextContent);
  await writeJsonFile(draftPath, nextContent);
  await writeJsonFile(publishMetaPath, {
    publishedAt: new Date().toISOString(),
    changedKeys
  });

  console.log(`Published ${changedKeys.length} change(s) to ${config.contentFile}.`);
  for (const key of changedKeys) {
    console.log(`- ${key}`);
  }
}
