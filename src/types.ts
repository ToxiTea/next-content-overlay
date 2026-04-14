// --- CLI types (v0.1) ---

export type OverlayConfig = {
  version: 1;
  scanDirs: string[];
  extensions: string[];
  contentFile: string;
  mapFile: string;
  draftFile: string;
};

export type ContentMapEntry = {
  key: string;
  sourceFile: string;
  line: number;
  column: number;
  defaultValue: string;
};

// --- Storage types (v1.0) ---

export type DraftEntry = {
  value: string;
  version: number;
  updatedAt: string;
};

export type HistoryEntry = {
  value: string;
  version: number;
  changeType: "save_draft" | "publish" | "restore";
  changedAt: string;
};

// --- Storage adapter (v1.1) ---

/**
 * Pluggable storage backend. The default is file-backed (`ContentStorage`),
 * but you can supply your own — e.g. Postgres, Supabase, Redis, GitHub API —
 * to make edits persist across deploys on hosts with ephemeral filesystems.
 *
 * Pass an instance to `createContentAPI({ storage })` and to `getContent({ storage })`.
 */
export interface StorageAdapter {
  /** Flat map of all published key→value pairs. Used by SSR and the API. */
  getPublished(): Promise<Record<string, string>>;
  /** Resolve a set of keys, optionally overlaying drafts for admins. */
  getContent(
    keys: string[],
    includeDraft: boolean
  ): Promise<{ content: Record<string, string>; versions: Record<string, number> }>;
  /** Upsert a draft value for a key, returning the new draft version. */
  saveDraft(key: string, value: string, baseValue?: string): Promise<{ version: number }>;
  /** Promote drafts to published. If keys are omitted, publish all changed drafts. */
  publish(keys?: string[]): Promise<{ publishedCount: number; changedKeys: string[] }>;
  /** Newest-first version history for a key. */
  getHistory(key: string, limit?: number): Promise<HistoryEntry[]>;
  /** Restore a historical version as a new draft. */
  restoreVersion(key: string, version: number): Promise<{ value: string; version: number }>;
  /** Count of keys whose draft differs from published. */
  getUnpublishedCount(): Promise<number>;
}

// --- API types (v1.0) ---

export type ContentAPIOptions = {
  /** Custom admin check. Defaults to env var / dev-mode check. */
  isAdmin?: (request: Request) => Promise<boolean> | boolean;
  /** Project root directory. Default: process.cwd(). Ignored if `storage` is provided. */
  contentDir?: string;
  /** Paths to revalidate after publish (Next.js revalidatePath). */
  revalidatePaths?: string[];
  /**
   * Custom storage backend. Defaults to the file-backed `ContentStorage`
   * rooted at `contentDir`. Supply your own adapter to persist edits to a
   * database or remote service.
   */
  storage?: StorageAdapter;
};

export type SaveRequest = {
  key: string;
  value: string;
  baseValue?: string;
};

export type SaveResponse = {
  success: boolean;
  draftValue: string;
  version: number;
};

export type PublishRequest = {
  keys?: string[];
  all?: boolean;
};

export type PublishResponse = {
  publishedCount: number;
  changedKeys: string[];
};

export type StatusResponse = {
  isAdmin: boolean;
  unpublishedCount: number;
};

export type HistoryResponse = {
  entries: HistoryEntry[];
};

export type RestoreRequest = {
  key: string;
  version: number;
};

export type RestoreResponse = {
  value: string;
  version: number;
};

