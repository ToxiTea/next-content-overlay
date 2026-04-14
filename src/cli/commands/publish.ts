import path from "node:path";
import { loadConfig } from "../../lib/config.js";
import { writeJsonFile } from "../../lib/fs.js";
import { ContentStorage } from "../../server/storage.js";

type PublishOptions = {
  cwd: string;
};

export async function runPublish(options: PublishOptions): Promise<void> {
  const config = await loadConfig(options.cwd);
  const publishMetaPath = path.join(options.cwd, ".overlay-content/last-publish.json");

  const storage = new ContentStorage(options.cwd);
  const { publishedCount, changedKeys } = await storage.publish();

  if (publishedCount === 0) {
    console.log("No draft changes to publish.");
    return;
  }

  await writeJsonFile(publishMetaPath, {
    publishedAt: new Date().toISOString(),
    changedKeys
  });

  console.log(`Published ${publishedCount} change(s) to ${config.contentFile}.`);
  for (const key of changedKeys) {
    console.log(`- ${key}`);
  }
}
