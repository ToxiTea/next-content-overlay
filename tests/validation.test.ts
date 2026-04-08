import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../src/lib/config.js";
import { validateOverlayConfig, ensureStringRecord } from "../src/lib/validation.js";

test("validateOverlayConfig accepts valid config", () => {
  const config = validateOverlayConfig(DEFAULT_CONFIG);
  assert.equal(config.version, 1);
  assert.deepEqual(config.scanDirs, ["app", "components"]);
});

test("validateOverlayConfig rejects invalid version", () => {
  assert.throws(() => validateOverlayConfig({ ...DEFAULT_CONFIG, version: 2 }));
});

test("ensureStringRecord rejects non-string values", () => {
  assert.throws(() => ensureStringRecord({ ok: "yes", bad: 123 }, "content/site.json"));
});
