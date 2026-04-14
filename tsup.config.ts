import { defineConfig } from "tsup";

export default defineConfig([
  // React components (client-side)
  {
    entry: { "react/index": "src/react/index.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    external: ["react", "react-dom", "next"],
    outDir: "dist",
    splitting: false,
    banner: { js: '"use client";' },
  },
  // Server utilities (Node-only)
  {
    entry: { "server/index": "src/server/index.ts" },
    format: ["esm"],
    dts: true,
    external: ["next", "react"],
    outDir: "dist",
    splitting: false,
  },
  // CLI entry (ESM only, with shebang)
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    dts: true,
    outDir: "dist",
    splitting: false,
    shims: true,
  },
]);
