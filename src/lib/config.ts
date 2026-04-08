import path from "node:path";
import { type OverlayConfig } from "../types.js";
import { CliError } from "./errors.js";
import { fileExists, readJsonFile, writeJsonFile } from "./fs.js";
import { validateOverlayConfig } from "./validation.js";

export const CONFIG_FILE = "content-overlay.config.json";

export const DEFAULT_CONFIG: OverlayConfig = {
  version: 1,
  scanDirs: ["app", "components"],
  extensions: [".tsx", ".ts", ".jsx", ".js", ".mdx"],
  contentFile: "content/site.json",
  mapFile: ".overlay-content/content-map.json",
  draftFile: ".overlay-content/draft.json"
};

export async function loadConfig(cwd: string): Promise<OverlayConfig> {
  const configPath = path.join(cwd, CONFIG_FILE);
  const config = await readJsonFile<unknown>(configPath);
  if (config === null) {
    throw new CliError(`Missing ${CONFIG_FILE}.`, {
      hint: "Run: content-overlay init"
    });
  }
  return validateOverlayConfig(config);
}

export async function writeDefaultConfig(cwd: string, force = false): Promise<{ created: boolean; path: string }> {
  const configPath = path.join(cwd, CONFIG_FILE);
  const exists = await fileExists(configPath);
  if (exists && !force) {
    return { created: false, path: configPath };
  }
  await writeJsonFile(configPath, DEFAULT_CONFIG);
  return { created: true, path: configPath };
}
