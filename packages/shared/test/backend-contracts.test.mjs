import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { adminAssetRowDtoSchema, backendRpcArgumentNames, backendRpcNames, instructorAssetLookupDtoSchema } from "../dist/index.js";

const workflowMigrationPath = fileURLToPath(new URL("../../../supabase/migrations/202605220001_workflow_rpc_security.sql", import.meta.url));
const adminReadModelsMigrationPath = fileURLToPath(new URL("../../../supabase/migrations/202605280001_admin_read_models.sql", import.meta.url));
const bookingHardeningMigrationPath = fileURLToPath(new URL("../../../supabase/migrations/202605310001_booking_contract_hardening.sql", import.meta.url));
const borrowingMigrationPath = fileURLToPath(new URL("../../../supabase/migrations/202606040001_borrowing_availability_roles_reports.sql", import.meta.url));
const registrationPolicyMigrationPath = fileURLToPath(new URL("../../../supabase/migrations/202606040002_registration_policy_toggle.sql", import.meta.url));
const workflowMigration = readFileSync(workflowMigrationPath, "utf8");
const adminReadModelsMigration = readFileSync(adminReadModelsMigrationPath, "utf8");
const bookingHardeningMigration = readFileSync(bookingHardeningMigrationPath, "utf8");
const borrowingMigration = readFileSync(borrowingMigrationPath, "utf8");
const registrationPolicyMigration = readFileSync(registrationPolicyMigrationPath, "utf8");
const backendMigrations = `${workflowMigration}\n${adminReadModelsMigration}\n${bookingHardeningMigration}\n${borrowingMigration}\n${registrationPolicyMigration}`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readFunctionParameters(functionName) {
  const pattern = new RegExp(`create function public\\.${escapeRegExp(functionName)}\\s*\\((?<parameters>[\\s\\S]*?)\\)\\s*returns`, "i");
  const match = backendMigrations.match(pattern);
  return match?.groups?.parameters ?? null;
}

function readTableReturnColumns(functionName) {
  const pattern = new RegExp(`create function public\\.${escapeRegExp(functionName)}\\s*\\([\\s\\S]*?\\)\\s*returns table\\s*\\((?<columns>[\\s\\S]*?)\\)\\s*language`, "i");
  const match = backendMigrations.match(pattern);
  return [...(match?.groups?.columns ?? "").matchAll(/^\s*([a-z][a-z0-9_]*)\s+/gim)].map((columnMatch) => columnMatch[1]);
}

test("backend RPC constants match workflow migration function names and grants", () => {
  for (const functionName of Object.values(backendRpcNames)) {
    assert.match(backendMigrations, new RegExp(`create function public\\.${escapeRegExp(functionName)}\\s*\\(`, "i"));
    assert.match(backendMigrations, new RegExp(`grant execute on function public\\.${escapeRegExp(functionName)}\\s*\\(`, "i"));
    assert.match(backendMigrations, new RegExp(`revoke all on function public\\.${escapeRegExp(functionName)}\\s*\\(`, "i"));
  }
});

test("backend RPC argument constants match migration parameter names in order", () => {
  for (const [rpcKey, functionName] of Object.entries(backendRpcNames)) {
    const parameters = readFunctionParameters(functionName);
    assert.ok(parameters, `Expected to find parameters for ${functionName}`);

    const actualParameterNames = [...parameters.matchAll(/\b(p_[a-z0-9_]+)\b/gi)].map((match) => match[1]);
    assert.deepEqual(actualParameterNames, backendRpcArgumentNames[rpcKey], `${functionName} parameter names drifted`);
  }
});

test("resolve asset DTO matches RPC return columns", () => {
  const returnColumns = readTableReturnColumns(backendRpcNames.resolveAssetByQrCode);

  assert.deepEqual(returnColumns, [
    "qr_code_id",
    "asset_id",
    "property_number",
    "serial_number",
    "name",
    "category_id",
    "category_name",
    "location_id",
    "location_name",
    "condition",
    "status",
    "active_qr_code",
    "qr_generated_at"
  ]);

  assert.ok("active_qr_code" in instructorAssetLookupDtoSchema.shape);
  assert.equal("qr_code" in instructorAssetLookupDtoSchema.shape, false);
});

test("admin asset read model DTO matches RPC return columns", () => {
  const returnColumns = readTableReturnColumns(backendRpcNames.listAdminAssets);

  assert.deepEqual(returnColumns, [
    "id",
    "property_number",
    "serial_number",
    "name",
    "category_id",
    "category_name",
    "location_id",
    "location_name",
    "condition",
    "status",
    "notes",
    "created_by",
    "created_at",
    "updated_at",
    "active_qr_code_id",
    "active_qr_code",
    "active_qr_generated_at"
  ]);

  for (const column of returnColumns) {
    assert.ok(column in adminAssetRowDtoSchema.shape, `${column} missing from adminAssetRowDtoSchema`);
  }
});

test("create booking backend contract rejects past starts", () => {
  assert.match(bookingHardeningMigration, /p_requested_start_at\s*<=\s*now\(\)/i);
  assert.match(bookingHardeningMigration, /Booking start time must be later than now/i);
});

test("borrowing availability migration exposes room-aware read models", () => {
  assert.match(borrowingMigration, /create type public\.borrowing_resource_type as enum \('asset', 'room'\)/i);
  assert.match(borrowingMigration, /p_resource_type public\.borrowing_resource_type/i);
  assert.match(borrowingMigration, /Borrowing duration must be between 90 and 180 minutes/i);
  assert.match(borrowingMigration, /status = 'pending'::public\.booking_status then 'tentative'/i);
});

test("registration policy migration gates signup through the auth hook", () => {
  assert.match(registrationPolicyMigration, /create table if not exists public\.registration_settings/i);
  assert.match(registrationPolicyMigration, /restrict_signup_to_allowed_domains boolean not null default true/i);
  assert.match(registrationPolicyMigration, /insert into public\.registration_settings \(id, restrict_signup_to_allowed_domains\)\s*values \(true, true\)/i);
  assert.match(registrationPolicyMigration, /create unique index if not exists university_email_domains_domain_lower_key/i);
  assert.match(registrationPolicyMigration, /create policy "Super admins manage registration settings"/i);
  assert.match(registrationPolicyMigration, /if not app_private\.is_signup_domain_restriction_enabled\(\) then\s*return '\{\}'::jsonb;/i);
  assert.match(registrationPolicyMigration, /grant execute on function public\.hook_restrict_signup_by_email_domain\(jsonb\) to supabase_auth_admin/i);
  assert.match(registrationPolicyMigration, /revoke execute on function public\.hook_restrict_signup_by_email_domain\(jsonb\) from authenticated, anon, public/i);
});
