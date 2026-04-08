import test from "node:test";
import assert from "node:assert/strict";
import { extractTextEntries } from "../src/lib/scan.js";

test("extractTextEntries captures plain JSX text and creates stable keys", () => {
  const source = `
    export default function Page() {
      return (
        <main>
          <h1>Launch Fast</h1>
          <p>Launch Fast</p>
          <p>{dynamicValue}</p>
          <p>42</p>
        </main>
      );
    }
  `;

  const entries = extractTextEntries("C:/repo/app/page.tsx", source, "C:/repo");
  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.key, "app.page.launch-fast");
  assert.equal(entries[1]?.key, "app.page.launch-fast-2");
  assert.equal(entries[0]?.defaultValue, "Launch Fast");
});
