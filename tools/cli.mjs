#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];
const args = process.argv.slice(3);

function run(commandName, commandArgs) {
  const child = spawn(commandName, commandArgs, { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
}

if (!command || command === "--help" || command === "-h") {
  console.log("Usage: docsdb <command>");
  console.log("Commands:");
  console.log("  query  Run a query against the docs index");
  console.log("  build  Validate docs and build the index");
  process.exit(0);
}

if (command === "query") {
  run(process.execPath, [path.resolve(__dirname, "query.mjs"), ...args]);
} else if (command === "build") {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  run(npmCmd, ["run", "build"]);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}
