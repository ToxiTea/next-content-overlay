import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { runInit } from "../src/commands/init.js";
import { runScan } from "../src/commands/scan.js";
import { runEdit } from "../src/commands/edit.js";
import { runPublish } from "../src/commands/publish.js";
import { readJsonFile } from "../src/lib/fs.js";
import { DEFAULT_CONFIG } from "../src/lib/config.js";

async function writeFile(filePath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

test("full flow works in a temp next-like project", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "content-overlay-"));

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify(
        {
          name: "demo",
          private: true,
          dependencies: { next: "16.1.6", react: "19.2.4", "react-dom": "19.2.4" }
        },
        null,
        2
      )
    );

    await writeFile(
      path.join(root, "app/page.tsx"),
      `
      export default function Page() {
        return (
          <main>
            <h1>Launch Fast Demo</h1>
          </main>
        );
      }
      `
    );

    await runInit({ cwd: root, force: false });
    await runScan({ cwd: root });

    const map = (await readJsonFile<Array<{ key: string }>>(path.join(root, DEFAULT_CONFIG.mapFile))) ?? [];
    assert.ok(map.length > 0);
    const key = map[0]?.key;
    assert.ok(key);

    await runEdit({ cwd: root, key: key!, value: "Updated Launch Fast Demo" });
    await runPublish({ cwd: root });

    const content = (await readJsonFile<Record<string, string>>(path.join(root, DEFAULT_CONFIG.contentFile))) ?? {};
    assert.equal(content[key!], "Updated Launch Fast Demo");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
