#!/usr/bin/env node
import { runEdit } from "./commands/edit.js";
import { runInit } from "./commands/init.js";
import { runPublish } from "./commands/publish.js";
import { runScan } from "./commands/scan.js";
import { CliError, toErrorMessage } from "./lib/errors.js";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log("content-overlay <command> [options]");
  console.log("");
  console.log("Core flow: init -> scan -> edit -> publish");
  console.log("");
  console.log("Commands");
  console.log("  init [--force]        Initialize config and content files");
  console.log("  scan                  Scan source files and build content map");
  console.log('  edit <key> "<value>"  Update one draft content value');
  console.log("  publish               Publish draft values to content/site.json");
  console.log("");
  console.log("Flags");
  console.log("  -h, --help            Show help");
  console.log("  -v, --version         Show CLI version");
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;
  const cwd = process.cwd();

  try {
    if (!command || command === "help" || command === "--help" || command === "-h") {
      printHelp();
      return;
    }
    if (command === "--version" || command === "-v" || command === "version") {
      console.log(VERSION);
      return;
    }

    if (command === "init") {
      const allowed = new Set(["--force"]);
      const unknown = args.filter((arg) => arg.startsWith("-") && !allowed.has(arg));
      if (unknown.length > 0) {
        throw new CliError(`Unknown option(s): ${unknown.join(", ")}`, {
          hint: "Usage: content-overlay init [--force]"
        });
      }
      const force = args.includes("--force");
      await runInit({ cwd, force });
      return;
    }

    if (command === "scan") {
      if (args.length > 0) {
        throw new CliError("scan does not accept arguments.", {
          hint: "Usage: content-overlay scan"
        });
      }
      await runScan({ cwd });
      return;
    }

    if (command === "edit") {
      if (args[0] === "--help" || args[0] === "-h") {
        console.log('Usage: content-overlay edit <key> "<value>"');
        return;
      }
      const key = args[0];
      const value = args.slice(1).join(" ").trim();
      if (!key || !value) {
        throw new CliError("Missing required edit arguments.", {
          hint: 'Usage: content-overlay edit <key> "<value>"'
        });
      }
      await runEdit({ cwd, key, value });
      return;
    }

    if (command === "publish") {
      if (args.length > 0) {
        throw new CliError("publish does not accept arguments.", {
          hint: "Usage: content-overlay publish"
        });
      }
      await runPublish({ cwd });
      return;
    }

    throw new CliError(`Unknown command: ${command}`, {
      hint: "Run: content-overlay --help"
    });
  } catch (error) {
    const { message, hint } = toErrorMessage(error);
    console.error(`Error: ${message}`);
    if (hint) {
      console.error(`Hint: ${hint}`);
    }
    process.exitCode = 1;
  }
}

main();
