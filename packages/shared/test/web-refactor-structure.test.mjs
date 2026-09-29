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

test("web asset form keeps generated identifiers off the user form and accepts an image", () => {
  const source = readFileSync(path.join(webRoot, "components", "assets", "asset-form.tsx"), "utf8");

  assert.doesNotMatch(source, /htmlFor="property-number"/);
  assert.doesNotMatch(source, /htmlFor="serial-number"/);
  assert.match(source, /name="imageFile"/);
  assert.match(source, /type="file"/);
});

test("web App Router page loads admin access and dashboard data server-side", () => {
  const source = readFileSync(path.join(webRoot, "app", "page.tsx"), "utf8");

  assert.match(source, /getAdminAccess/);
  assert.match(source, /getAdminDashboardData/);
  assert.match(source, /initialAccess/);
  assert.match(source, /initialData/);
});

test("web uses Next proxy to refresh Supabase SSR sessions", () => {
  const source = readFileSync(path.join(webRoot, "proxy.ts"), "utf8");

  assert.match(source, /createServerClient/);
  assert.match(source, /export async function proxy/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /request\.cookies\.getAll\(\)/);
  assert.match(source, /response\.cookies\.set/);
});

test("web dashboard data loading isolates Supabase read failures", () => {
  const source = readFileSync(path.join(webRoot, "lib", "admin", "services.ts"), "utf8");

  assert.match(source, /readDashboardQuery/);
  assert.match(source, /readDashboardValue/);
  assert.match(source, /readDashboardCount/);
  assert.match(source, /logDashboardReadFailure/);
  assert.doesNotMatch(source, /\.find\(Boolean\)/);
});

test("web sign-in and QR actions keep explicit credential and payload controls", () => {
  const services = readFileSync(path.join(webRoot, "lib", "admin", "services.ts"), "utf8");
  const actions = readFileSync(path.join(webRoot, "lib", "admin", "actions.ts"), "utf8");

  assert.match(services, /isMissingSessionError\(userError\)[\s\S]*return \{ status: "signed-out" \}/);
  assert.doesNotMatch(services, /quick.?login|demo.?access/i);
  assert.match(services, /\.from\("assets"\)[\s\S]*\.select\("property_number"\)/);
  assert.doesNotMatch(actions, /propertyNumber/);
});

test("web typecheck does not depend on ignored .next generated route types", () => {
  const nextEnv = readFileSync(path.join(webRoot, "next-env.d.ts"), "utf8");

  assert.doesNotMatch(nextEnv, /\.next\/types\/routes\.d\.ts/);
});

test("web package exposes a typecheck script for the release gate", () => {
  const packageJson = JSON.parse(readFileSync(path.join(webRoot, "package.json"), "utf8"));

  assert.equal(typeof packageJson.scripts.typecheck, "string");
  assert.match(packageJson.scripts.typecheck, /tsc/);
});

test("web defect review loads and renders private signed photo evidence", () => {
  const servicesSource = readFileSync(path.join(repoRoot, "apps", "web", "lib", "admin", "services.ts"), "utf8");
  const defectsSource = readFileSync(path.join(repoRoot, "apps", "web", "components", "defects", "defect-admin-panel.tsx"), "utf8");

  assert.match(servicesSource, /defect_photos\.recent/);
  assert.match(servicesSource, /createSignedUrl\(photo\.storage_path/);
  assert.match(defectsSource, /reportPhotos/);
  assert.match(defectsSource, /Defect evidence/);
});

test("report filters avoid the sidebar-constrained desktop overflow", () => {
  const reportsSource = readFileSync(path.join(webRoot, "components", "reports", "reports-panel.tsx"), "utf8");

  assert.doesNotMatch(reportsSource, /lg:grid-cols-\[1\.4fr_1fr_1fr_1fr_1fr_auto\]/);
  assert.match(reportsSource, /2xl:grid-cols-\[minmax\(0,1\.4fr\)_repeat\(4,minmax\(0,1fr\)\)_auto\]/);
  assert.match(reportsSource, /className="flex min-w-0 flex-col gap-1\.5"/);
});

test("reports render analytics as a human-readable table instead of raw JSON", () => {
  const source = readFileSync(path.join(webRoot, "components", "reports", "report-payload.tsx"), "utf8");

  assert.match(source, /column === "label" \? "Measure"/);
  assert.match(source, /isMetrics \? "Result"/);
  assert.match(source, /<AnalyticsTable rows=\{payload\}/);
  assert.doesNotMatch(source, /<pre/);
  assert.doesNotMatch(source, /JSON\.stringify|formatReportPayload/);
});

test("borrowing requests expose overdue as a derived filter", () => {
  const source = readFileSync(path.join(webRoot, "components", "bookings", "booking-admin-panel.tsx"), "utf8");

  assert.match(source, /bookingFilterOptions[\s\S]*"overdue"/);
  assert.match(source, /isOverdueBooking/);
  assert.match(source, /filter === "overdue"/);
});

test("opening a message thread clears linked and legacy unread notifications", () => {
  const servicesSource = readFileSync(path.join(webRoot, "lib", "admin", "services.ts"), "utf8");
  const dashboardSource = readFileSync(path.join(webRoot, "components", "admin-dashboard.tsx"), "utf8");

  assert.match(servicesSource, /related_thread_id\.eq\.\$\{threadId\},related_thread_id\.is\.null/);
  assert.match(dashboardSource, /unreadMessageCount: Math\.max\(0, current\.unreadMessageCount - \(markedCount \?\? 0\)\)/);
  assert.match(dashboardSource, /unread_count: thread\.id === threadId \? 0/);
});
