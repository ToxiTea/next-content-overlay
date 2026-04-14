import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { ContentStorage } from "../src/server/storage.js";
import { writeJsonFile } from "../src/lib/fs.js";

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
