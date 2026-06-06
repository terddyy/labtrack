import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve("..", "..");
const mobileRoot = path.join(repoRoot, "apps", "mobile");
const protectedRoot = path.join(mobileRoot, "app", "(protected)");
const hookFiles = [
  "use-asset-workflow.ts",
  "use-bookings.ts",
  "use-dashboard-summary.ts",
  "use-notifications.ts",
  "use-scanner.ts",
  "use-ticket-thread.ts"
];

function listFiles(root) {
  const entries = readdirSync(root);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      files.push(...listFiles(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

test("mobile instructor routes are behind a protected route group layout", () => {
  const rootLayout = readFileSync(path.join(mobileRoot, "app", "_layout.tsx"), "utf8");

  assert.match(rootLayout, /Stack\.Protected/);
  assert.match(rootLayout, /guard=\{isReady\}/);
  assert.match(rootLayout, /guard=\{!isReady\}/);
  assert.equal(existsSync(path.join(protectedRoot, "(tabs)", "scan.tsx")), true);
  assert.equal(existsSync(path.join(protectedRoot, "asset", "[payload].tsx")), true);
  assert.equal(existsSync(path.join(mobileRoot, "app", "sign-in.tsx")), true);

  const protectedScreens = listFiles(protectedRoot).filter((file) => file.endsWith(".tsx") && !file.endsWith("_layout.tsx"));
  const screenImportsGate = protectedScreens.filter((file) => readFileSync(file, "utf8").includes("RequireActiveProfile"));

  assert.deepEqual(screenImportsGate.map((file) => path.relative(repoRoot, file)), []);
});

test("mobile workflow hooks exist for route and list orchestration", () => {
  for (const file of hookFiles) {
    assert.equal(existsSync(path.join(mobileRoot, "lib", file)), true, file);
  }
});

test("mobile API uses bounded list reads and server-side dashboard counts", () => {
  const apiSource = readFileSync(path.join(mobileRoot, "lib", "labtrack-api.ts"), "utf8");
  const dashboardHookSource = readFileSync(path.join(mobileRoot, "lib", "use-dashboard-summary.ts"), "utf8");

  assert.match(apiSource, /MAX_LIST_LIMIT = 100/);
  assert.match(apiSource, /\.range\(offset, offset \+ limit - 1\)/);
  assert.match(apiSource, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(dashboardHookSource, /getDashboardSummary/);
});

test("mobile Supabase client follows React Native auth lifecycle requirements", () => {
  const supabaseSource = readFileSync(path.join(mobileRoot, "lib", "supabase.ts"), "utf8");
  const authSource = readFileSync(path.join(mobileRoot, "lib", "auth.ts"), "utf8");
  const packageJson = readFileSync(path.join(mobileRoot, "package.json"), "utf8");

  assert.match(supabaseSource, /react-native-url-polyfill\/auto/);
  assert.match(supabaseSource, /AppState\.addEventListener/);
  assert.match(supabaseSource, /startAutoRefresh/);
  assert.match(supabaseSource, /stopAutoRefresh/);
  assert.match(authSource, /onAuthStateChange/);
  assert.match(packageJson, /react-native-url-polyfill/);
});

test("mobile home surfaces hidden data and push registration failures", () => {
  const homeSource = readFileSync(path.join(protectedRoot, "(tabs)", "index.tsx"), "utf8");

  assert.match(homeSource, /bookingQueue\.error/);
  assert.match(homeSource, /defects\.error/);
  assert.match(homeSource, /registerForPushNotifications\(\)\.catch/);
});
