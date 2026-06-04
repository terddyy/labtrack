import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve("..", "..");
const webRoot = path.join(repoRoot, "apps", "web");

test("web admin component calls server actions instead of direct Supabase RPC/table writes", () => {
  const source = readFileSync(path.join(webRoot, "components", "admin-dashboard.tsx"), "utf8");

  assert.match(source, /@\/lib\/admin\/actions/);
  assert.doesNotMatch(source, /\.rpc\(/);
  assert.doesNotMatch(source, /\.from\(/);
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
});

test("web App Router page loads admin access and dashboard data server-side", () => {
  const source = readFileSync(path.join(webRoot, "app", "page.tsx"), "utf8");

  assert.match(source, /getAdminAccess/);
  assert.match(source, /getAdminDashboardData/);
  assert.match(source, /initialAccess/);
  assert.match(source, /initialData/);
});

test("web quick login and QR actions keep explicit credential and payload controls", () => {
  const services = readFileSync(path.join(webRoot, "lib", "admin", "services.ts"), "utf8");
  const actions = readFileSync(path.join(webRoot, "lib", "admin", "actions.ts"), "utf8");

  assert.match(services, /isMissingSessionError\(userError\)[\s\S]*return \{ status: "signed-out" \}/);
  assert.match(services, /demoLoginFlag === "false"[\s\S]*return \[\]/);
  assert.match(services, /includeDefaults = nodeEnv !== "production" \|\| demoLoginFlag === "true"/);
  assert.match(services, /\.from\("assets"\)[\s\S]*\.select\("property_number"\)/);
  assert.doesNotMatch(actions, /propertyNumber/);
});

test("web typecheck does not depend on ignored .next generated route types", () => {
  const nextEnv = readFileSync(path.join(webRoot, "next-env.d.ts"), "utf8");

  assert.doesNotMatch(nextEnv, /\.next\/types\/routes\.d\.ts/);
});
