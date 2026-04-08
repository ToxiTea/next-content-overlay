import { type ContentMapEntry, type OverlayConfig } from "../types.js";
import { CliError } from "./errors.js";

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function assertStringArray(input: unknown, fieldName: string): string[] {
  if (!Array.isArray(input) || input.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    throw new CliError(`Invalid ${fieldName} in content-overlay config.`, {
      hint: `Expected "${fieldName}" to be a non-empty string array.`
    });
  }
  return input;
}

export function validateOverlayConfig(input: unknown): OverlayConfig {
  if (!isPlainObject(input)) {
    throw new CliError("Invalid content-overlay config file.", {
      hint: "Run: content-overlay init --force"
    });
  }

  const version = input.version;
  if (version !== 1) {
    throw new CliError(`Unsupported config version: ${String(version)}.`, {
      hint: "Run: content-overlay init --force"
    });
  }

  const scanDirs = assertStringArray(input.scanDirs, "scanDirs");
  const extensions = assertStringArray(input.extensions, "extensions");

  const contentFile = input.contentFile;
  const mapFile = input.mapFile;
  const draftFile = input.draftFile;

  if (typeof contentFile !== "string" || contentFile.trim().length === 0) {
    throw new CliError("Invalid contentFile in content-overlay config.");
  }
  if (typeof mapFile !== "string" || mapFile.trim().length === 0) {
    throw new CliError("Invalid mapFile in content-overlay config.");
  }
  if (typeof draftFile !== "string" || draftFile.trim().length === 0) {
    throw new CliError("Invalid draftFile in content-overlay config.");
  }

  return {
    version: 1,
    scanDirs,
    extensions,
    contentFile,
    mapFile,
    draftFile
  };
}

export function ensureStringRecord(input: unknown, label: string): Record<string, string> {
  if (!isPlainObject(input)) {
    throw new CliError(`Invalid ${label}; expected a JSON object.`, {
      hint: "Run: content-overlay init"
    });
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") {
      throw new CliError(`Invalid ${label}; key "${key}" must be a string.`);
    }
    result[key] = value;
  }
  return result;
}

export function ensureContentMap(input: unknown): ContentMapEntry[] {
  if (!Array.isArray(input)) {
    throw new CliError("Invalid content map; expected an array.", {
      hint: "Run: content-overlay scan"
    });
  }

  const result: ContentMapEntry[] = [];
  for (const value of input) {
    if (!isPlainObject(value)) {
      throw new CliError("Invalid content map entry; expected object values.");
    }
    const { key, sourceFile, line, column, defaultValue } = value;
    if (
      typeof key !== "string" ||
      typeof sourceFile !== "string" ||
      typeof line !== "number" ||
      typeof column !== "number" ||
      typeof defaultValue !== "string"
    ) {
      throw new CliError("Invalid content map entry shape.", {
        hint: "Run: content-overlay scan"
      });
    }
    result.push({ key, sourceFile, line, column, defaultValue });
  }

  return result;
}
