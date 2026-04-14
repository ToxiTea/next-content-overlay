import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { ContentStorage } from "../src/server/storage.js";
import { createContentAPI } from "../src/server/createContentAPI.js";
import { writeJsonFile } from "../src/lib/fs.js";
import type { StorageAdapter, HistoryEntry } from "../src/types.js";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "overlay-storage-"));
}

test("ContentStorage: save, getDraft, and getPublished", async () => {
  const root = await makeTempDir();
  try {
    // Create required directories and initial content file
    await fs.mkdir(path.join(root, "content"), { recursive: true });
    await writeJsonFile(path.join(root, "content", "site.json"), {});
    await fs.mkdir(path.join(root, ".overlay-content"), { recursive: true });

    const storage = new ContentStorage(root);

    // Save a draft
    const { version } = await storage.saveDraft("hero.title", "Hello World", "Default Title");
    assert.equal(version, 1);

    // Read draft back
    const draft = await storage.getDraft("hero.title");
    assert.ok(draft);
    assert.equal(draft.value, "Hello World");
    assert.equal(draft.version, 1);

    // Published should have the base value (since key was new)
    const published = await storage.getPublished();
    assert.equal(published["hero.title"], "Default Title");

    // Save again — version increments
    const { version: v2 } = await storage.saveDraft("hero.title", "Updated Hello");
    assert.equal(v2, 2);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ContentStorage: publish copies draft to published", async () => {
  const root = await makeTempDir();
  try {
    await fs.mkdir(path.join(root, "content"), { recursive: true });
    await writeJsonFile(path.join(root, "content", "site.json"), { "hero.title": "Original" });
    await fs.mkdir(path.join(root, ".overlay-content"), { recursive: true });

    const storage = new ContentStorage(root);

    await storage.saveDraft("hero.title", "Edited Title");
    const { publishedCount, changedKeys } = await storage.publish();

    assert.equal(publishedCount, 1);
    assert.deepEqual(changedKeys, ["hero.title"]);

    const published = await storage.getPublished();
    assert.equal(published["hero.title"], "Edited Title");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ContentStorage: unpublished count tracks pending changes", async () => {
  const root = await makeTempDir();
  try {
    await fs.mkdir(path.join(root, "content"), { recursive: true });
    await writeJsonFile(path.join(root, "content", "site.json"), { "a": "one", "b": "two" });
    await fs.mkdir(path.join(root, ".overlay-content"), { recursive: true });

    const storage = new ContentStorage(root);

    // No drafts yet — count is 0
    assert.equal(await storage.getUnpublishedCount(), 0);

    // Save a draft for "a"
    await storage.saveDraft("a", "one-edited");
    assert.equal(await storage.getUnpublishedCount(), 1);

    // Publish — count drops to 0
    await storage.publish();
    assert.equal(await storage.getUnpublishedCount(), 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ContentStorage: history and restore", async () => {
  const root = await makeTempDir();
  try {
    await fs.mkdir(path.join(root, "content"), { recursive: true });
    await writeJsonFile(path.join(root, "content", "site.json"), {});
    await fs.mkdir(path.join(root, ".overlay-content"), { recursive: true });

    const storage = new ContentStorage(root);

    await storage.saveDraft("k", "v1", "v1");
    await storage.saveDraft("k", "v2");
    await storage.saveDraft("k", "v3");

    // History should have 3 entries, newest first
    const history = await storage.getHistory("k");
    assert.equal(history.length, 3);
    assert.equal(history[0].value, "v3");
    assert.equal(history[0].version, 3);
    assert.equal(history[2].value, "v1");

    // Restore version 1
    const restored = await storage.restoreVersion("k", 1);
    assert.equal(restored.value, "v1");
    assert.equal(restored.version, 4); // new version number

    // Draft should now be v1's text
    const draft = await storage.getDraft("k");
    assert.equal(draft?.value, "v1");

    // History should now have 4 entries (including the restore)
    const updatedHistory = await storage.getHistory("k");
    assert.equal(updatedHistory.length, 4);
    assert.equal(updatedHistory[0].changeType, "restore");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ContentStorage: migrates v0.1 flat draft format", async () => {
  const root = await makeTempDir();
  try {
    await fs.mkdir(path.join(root, "content"), { recursive: true });
    await writeJsonFile(path.join(root, "content", "site.json"), { "a": "one" });
    await fs.mkdir(path.join(root, ".overlay-content"), { recursive: true });
    // Write v0.1 flat format
    await writeJsonFile(path.join(root, ".overlay-content", "draft.json"), {
      "a": "one-draft",
      "b": "two-draft"
    });

    const storage = new ContentStorage(root);
    const drafts = await storage.getAllDrafts();

    assert.equal(drafts["a"]?.value, "one-draft");
    assert.equal(drafts["a"]?.version, 1);
    assert.equal(drafts["b"]?.value, "two-draft");

    // Backup file should exist
    const backupPath = path.join(root, ".overlay-content", "draft.v0.backup.json");
    const stat = await fs.stat(backupPath);
    assert.ok(stat.isFile());
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

/** Minimal in-memory StorageAdapter used to prove the seam in createContentAPI. */
function makeMemoryAdapter(): StorageAdapter & { __drafts: Map<string, { value: string; version: number }>; __published: Map<string, string> } {
  const published = new Map<string, string>();
  const drafts = new Map<string, { value: string; version: number }>();
  const history = new Map<string, HistoryEntry[]>();

  const adapter: StorageAdapter = {
    async getPublished() {
      return Object.fromEntries(published);
    },
    async getContent(keys, includeDraft) {
      const content: Record<string, string> = {};
      const versions: Record<string, number> = {};
      for (const k of keys) {
        if (includeDraft && drafts.has(k)) {
          const d = drafts.get(k)!;
          content[k] = d.value;
          versions[k] = d.version;
        } else if (published.has(k)) {
          content[k] = published.get(k)!;
          versions[k] = 0;
        }
      }
      return { content, versions };
    },
    async saveDraft(key, value, baseValue) {
      if (!published.has(key) && baseValue !== undefined) {
        published.set(key, baseValue);
      }
      const prev = drafts.get(key);
      const version = prev ? prev.version + 1 : 1;
      drafts.set(key, { value, version });
      const entries = history.get(key) ?? [];
      entries.push({ value, version, changeType: "save_draft", changedAt: new Date().toISOString() });
      history.set(key, entries);
      return { version };
    },
    async publish(keys) {
      const candidates = keys ?? Array.from(drafts.keys());
      const changedKeys: string[] = [];
      for (const k of candidates) {
        const d = drafts.get(k);
        if (!d) continue;
        if (d.value === (published.get(k) ?? "")) continue;
        published.set(k, d.value);
        drafts.set(k, { value: d.value, version: d.version + 1 });
        changedKeys.push(k);
      }
      return { publishedCount: changedKeys.length, changedKeys };
    },
    async getHistory(key, limit = 25) {
      const entries = history.get(key) ?? [];
      return entries.slice(-limit).reverse();
    },
    async restoreVersion(key, version) {
      const entries = history.get(key) ?? [];
      const target = entries.find((e) => e.version === version);
      if (!target) throw new Error(`Version ${version} not found`);
      const prev = drafts.get(key);
      const next = prev ? prev.version + 1 : 1;
      drafts.set(key, { value: target.value, version: next });
      return { value: target.value, version: next };
    },
    async getUnpublishedCount() {
      let count = 0;
      for (const [k, d] of drafts) {
        if (d.value !== (published.get(k) ?? "")) count++;
      }
      return count;
    },
  };

  return Object.assign(adapter, { __drafts: drafts, __published: published });
}

test("StorageAdapter: custom adapter plugs into createContentAPI end-to-end", async () => {
  const storage = makeMemoryAdapter();
  const handler = createContentAPI({
    storage,
    isAdmin: () => true,
  });

  const ctx = { params: Promise.resolve({ action: ["save"] }) };
  const saveReq = new Request("http://test/api/content-overlay/save", {
    method: "POST",
    body: JSON.stringify({ key: "hero.title", value: "From Memory Adapter", baseValue: "Default" }),
  });
  const saveRes = await handler(saveReq, ctx);
  assert.equal(saveRes.status, 200);
  const saveBody = await saveRes.json() as { success: boolean; version: number };
  assert.equal(saveBody.success, true);
  assert.equal(saveBody.version, 1);

  // Adapter state reflects the save
  assert.equal(storage.__drafts.get("hero.title")?.value, "From Memory Adapter");
  assert.equal(storage.__published.get("hero.title"), "Default");

  // Publish via the real HTTP handler
  const pubReq = new Request("http://test/api/content-overlay/publish", {
    method: "POST",
    body: JSON.stringify({ all: true }),
  });
  const pubRes = await handler(pubReq, { params: Promise.resolve({ action: ["publish"] }) });
  assert.equal(pubRes.status, 200);
  const pubBody = await pubRes.json() as { publishedCount: number; changedKeys: string[] };
  assert.equal(pubBody.publishedCount, 1);
  assert.deepEqual(pubBody.changedKeys, ["hero.title"]);

  // Published store now has the edited value
  assert.equal(storage.__published.get("hero.title"), "From Memory Adapter");

  // GET /me reports zero unpublished after publish
  const meReq = new Request("http://test/api/content-overlay/me");
  const meRes = await handler(meReq, { params: Promise.resolve({ action: ["me"] }) });
  const meBody = await meRes.json() as { isAdmin: boolean; unpublishedCount: number };
  assert.equal(meBody.isAdmin, true);
  assert.equal(meBody.unpublishedCount, 0);
});

test("ContentStorage: getContent returns published and draft values", async () => {
  const root = await makeTempDir();
  try {
    await fs.mkdir(path.join(root, "content"), { recursive: true });
    await writeJsonFile(path.join(root, "content", "site.json"), { "a": "published-a" });
    await fs.mkdir(path.join(root, ".overlay-content"), { recursive: true });

    const storage = new ContentStorage(root);
    await storage.saveDraft("a", "draft-a", "published-a");

    // Without draft
    const noDraft = await storage.getContent(["a"], false);
    assert.equal(noDraft.content["a"], "published-a");

    // With draft
    const withDraft = await storage.getContent(["a"], true);
    assert.equal(withDraft.content["a"], "draft-a");
    assert.equal(withDraft.versions["a"], 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
