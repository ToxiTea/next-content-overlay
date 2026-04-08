import { promises as fs } from "node:fs";
import path from "node:path";
import { CliError } from "./errors.js";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    throw new CliError(`Failed to read file: ${filePath}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new CliError(`Invalid JSON in file: ${filePath}`);
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  try {
    await ensureDir(dir);
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch {
    throw new CliError(`Failed to write file: ${filePath}`);
  }
}

export async function collectFiles(rootDir: string, extensions: Set<string>): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
          continue;
        }
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}
