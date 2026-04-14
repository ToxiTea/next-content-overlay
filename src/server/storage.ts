import path from "node:path";
import { promises as fs } from "node:fs";
import { readJsonFile, writeJsonFile, ensureDir } from "../lib/fs.js";
import { sanitizeText } from "../lib/sanitize.js";
import type { DraftEntry, HistoryEntry, StorageAdapter } from "../types.js";

type DraftStore = Record<string, DraftEntry>;
type HistoryStore = Record<string, HistoryEntry[]>;

export class ContentStorage implements StorageAdapter {
  private contentPath: string;
  private draftPath: string;
  private historyPath: string;
  private lockDir: string;

  constructor(rootDir: string) {
    this.contentPath = path.join(rootDir, "content", "site.json");
    this.draftPath = path.join(rootDir, ".overlay-content", "draft.json");
    this.historyPath = path.join(rootDir, ".overlay-content", "history.json");
    this.lockDir = path.join(rootDir, ".overlay-content", ".lock");
  }

  /** Read published content (flat key→value). */
  async getPublished(): Promise<Record<string, string>> {
    const raw = await readJsonFile<unknown>(this.contentPath);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  }

  /** Read a single draft entry. */
  async getDraft(key: string): Promise<DraftEntry | null> {
    const drafts = await this.getAllDrafts();
    return drafts[key] ?? null;
  }

  /** Read all drafts. Auto-migrates v0.1 flat format. */
  async getAllDrafts(): Promise<DraftStore> {
    const raw = await readJsonFile<unknown>(this.draftPath);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length === 0) return {};

    // Detect v0.1 flat format (all values are strings)
    const isFlat = entries.every(([, v]) => typeof v === "string");
    if (isFlat) {
      return await this.migrateFlatDrafts(raw as Record<string, string>);
    }

    // v1.0 format
    const result: DraftStore = {};
    for (const [key, value] of entries) {
      if (value && typeof value === "object" && "value" in value) {
        result[key] = value as DraftEntry;
      }
    }
    return result;
  }

  /** Save a draft value. Returns the new version number. */
  async saveDraft(key: string, value: string, baseValue?: string): Promise<{ version: number }> {
    return this.withLock(async () => {
      const sanitized = sanitizeText(value);
      const drafts = await this.getAllDrafts();
      const existing = drafts[key];
      const nextVersion = existing ? existing.version + 1 : 1;
      const now = new Date().toISOString();

      // Ensure published value exists for new keys
      const published = await this.getPublished();
      if (!(key in published) && baseValue !== undefined) {
        published[key] = sanitizeText(baseValue);
        await this.writePublished(published);
      }

      // Update draft
      drafts[key] = { value: sanitized, version: nextVersion, updatedAt: now };
      await this.writeDrafts(drafts);

      // Record history
      await this.appendHistory(key, {
        value: sanitized,
        version: nextVersion,
        changeType: "save_draft",
        changedAt: now,
      });

      return { version: nextVersion };
    });
  }

  /** Publish drafts. If keys provided, publish only those; otherwise publish all changed. */
  async publish(keys?: string[]): Promise<{ publishedCount: number; changedKeys: string[] }> {
    return this.withLock(async () => {
      const drafts = await this.getAllDrafts();
      const published = await this.getPublished();
      const now = new Date().toISOString();

      const candidates = keys ?? Object.keys(drafts);
      const changedKeys: string[] = [];

      for (const key of candidates) {
        const draft = drafts[key];
        if (!draft) continue;
        if (draft.value === (published[key] ?? "")) continue;

        // Update published
        published[key] = draft.value;

        // Increment draft version
        const nextVersion = draft.version + 1;
        drafts[key] = { value: draft.value, version: nextVersion, updatedAt: now };

        // Record history
        await this.appendHistory(key, {
          value: draft.value,
          version: nextVersion,
          changeType: "publish",
          changedAt: now,
        });

        changedKeys.push(key);
      }

      if (changedKeys.length > 0) {
        await this.writePublished(published);
        await this.writeDrafts(drafts);
      }

      return { publishedCount: changedKeys.length, changedKeys };
    });
  }

  /** Get version history for a key. */
  async getHistory(key: string, limit = 25): Promise<HistoryEntry[]> {
    const history = await this.readHistory();
    const entries = history[key] ?? [];
    // Return newest first, limited
    return entries.slice(-limit).reverse();
  }

  /** Restore a historical version as a new draft. */
  async restoreVersion(key: string, version: number): Promise<{ value: string; version: number }> {
    return this.withLock(async () => {
      const history = await this.readHistory();
      const entries = history[key] ?? [];
      const target = entries.find((e) => e.version === version);

      if (!target) {
        throw new Error(`Version ${version} not found for key "${key}"`);
      }

      const drafts = await this.getAllDrafts();
      const existing = drafts[key];
      const nextVersion = existing ? existing.version + 1 : 1;
      const now = new Date().toISOString();

      drafts[key] = { value: target.value, version: nextVersion, updatedAt: now };
      await this.writeDrafts(drafts);

      await this.appendHistory(key, {
        value: target.value,
        version: nextVersion,
        changeType: "restore",
        changedAt: now,
      });

      return { value: target.value, version: nextVersion };
    });
  }

  /** Count keys where draft differs from published. */
  async getUnpublishedCount(): Promise<number> {
    const drafts = await this.getAllDrafts();
    const published = await this.getPublished();
    let count = 0;
    for (const [key, draft] of Object.entries(drafts)) {
      if (draft.value !== (published[key] ?? "")) count++;
    }
    return count;
  }

  /** Get content for specific keys (published + optionally drafts). */
  async getContent(keys: string[], includeDraft = false): Promise<{
    content: Record<string, string>;
    versions: Record<string, number>;
  }> {
    const published = await this.getPublished();
    const drafts = includeDraft ? await this.getAllDrafts() : {};
    const content: Record<string, string> = {};
    const versions: Record<string, number> = {};

    for (const key of keys) {
      if (includeDraft && drafts[key]) {
        content[key] = drafts[key].value;
        versions[key] = drafts[key].version;
      } else if (key in published) {
        content[key] = published[key];
        versions[key] = 0;
      }
    }
    return { content, versions };
  }

  // --- Private helpers ---

  private async readHistory(): Promise<HistoryStore> {
    const raw = await readJsonFile<unknown>(this.historyPath);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw as HistoryStore;
  }

  private async appendHistory(key: string, entry: HistoryEntry): Promise<void> {
    const history = await this.readHistory();
    if (!history[key]) history[key] = [];
    history[key].push(entry);
    await ensureDir(path.dirname(this.historyPath));
    await writeJsonFile(this.historyPath, history);
  }

  private async writePublished(data: Record<string, string>): Promise<void> {
    await ensureDir(path.dirname(this.contentPath));
    await writeJsonFile(this.contentPath, data);
  }

  private async writeDrafts(data: DraftStore): Promise<void> {
    await ensureDir(path.dirname(this.draftPath));
    await writeJsonFile(this.draftPath, data);
  }

  /** Migrate v0.1 flat draft format to v1.0 DraftEntry format. */
  private async migrateFlatDrafts(flat: Record<string, string>): Promise<DraftStore> {
    // Backup the old format
    const backupPath = this.draftPath.replace(".json", ".v0.backup.json");
    await writeJsonFile(backupPath, flat);

    const now = new Date().toISOString();
    const migrated: DraftStore = {};
    for (const [key, value] of Object.entries(flat)) {
      migrated[key] = { value, version: 1, updatedAt: now };
    }
    await this.writeDrafts(migrated);
    return migrated;
  }

  /** Simple directory-based file lock for atomic operations. */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = 10;
    const retryDelay = 50;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.mkdir(this.lockDir, { recursive: false });
        break;
      } catch (err) {
        if (i === maxRetries - 1) {
          // Force-remove stale lock after all retries
          try { await fs.rmdir(this.lockDir); } catch { /* ignore */ }
          await fs.mkdir(this.lockDir, { recursive: false });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    try {
      return await fn();
    } finally {
      try { await fs.rmdir(this.lockDir); } catch { /* ignore */ }
    }
  }
}
