import { readFile } from "node:fs/promises";

async function main() {
  const pkgRaw = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const pkg = JSON.parse(pkgRaw);
  if (pkg.license !== "MIT") {
    throw new Error(`package.json license must be MIT, found: ${String(pkg.license)}`);
  }

  const licenseText = await readFile(new URL("../LICENSE", import.meta.url), "utf8");
  if (!licenseText.toLowerCase().includes("mit license")) {
    throw new Error("LICENSE file does not look like MIT text.");
  }

  console.log("License check passed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`License check failed: ${message}`);
  process.exitCode = 1;
});
