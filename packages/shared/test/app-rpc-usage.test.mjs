import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { backendRpcNames } from "../dist/index.js";

const repoRoot = path.resolve("..", "..");
const appRoots = [
  path.join(repoRoot, "apps", "mobile"),
  path.join(repoRoot, "apps", "web")
];
const ignoredDirectories = new Set([
  ".expo",
  ".next",
  "build",
  "dist",
  "node_modules"
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function listSourceFiles(root) {
  const entries = readdirSync(root);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (!ignoredDirectories.has(entry)) {
        files.push(...listSourceFiles(absolutePath));
      }

      continue;
    }

    if (sourceExtensions.has(path.extname(entry))) {
      files.push(absolutePath);
    }
  }

  return files;
}

test("app code uses shared RPC keys instead of backend RPC string literals", () => {
  const rpcNames = Object.values(backendRpcNames);
  const offenders = [];

  for (const root of appRoots) {
    for (const file of listSourceFiles(root)) {
      const source = readFileSync(file, "utf8");

      if (source.includes(".rpc(")) {
        offenders.push(`${path.relative(repoRoot, file)} calls rpc() directly`);
      }

      for (const rpcName of rpcNames) {
        if (source.includes(rpcName)) {
          offenders.push(`${path.relative(repoRoot, file)} contains ${rpcName}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});
