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

// --- API types (v1.0) ---

export type ContentAPIOptions = {
  /** Custom admin check. Defaults to env var / dev-mode check. */
  isAdmin?: (request: Request) => Promise<boolean> | boolean;
  /** Project root directory. Default: process.cwd() */
  contentDir?: string;
  /** Paths to revalidate after publish (Next.js revalidatePath). */
  revalidatePaths?: string[];
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

