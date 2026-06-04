#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextEnvPath = path.resolve(__dirname, "..", "next-env.d.ts");
const generatedRouteImport = 'import "./.next/types/routes.d.ts";\n';
const source = readFileSync(nextEnvPath, "utf8");
const normalized = source.replace(generatedRouteImport, "");

if (normalized !== source) {
  writeFileSync(nextEnvPath, normalized);
}
