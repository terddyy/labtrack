import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/20260606144623_fix_borrowing_rpc_and_storage_policies.sql", import.meta.url)
);
const migration = readFileSync(migrationPath, "utf8");

test("hosted CRUD fix migration removes borrowing ambiguity and repairs storage policies", () => {
  assert.match(migration, /create or replace function public\.create_borrowing/i);
  assert.match(migration, /create or replace function public\.checkout_borrowing_by_qr/i);
  assert.match(migration, /create or replace function public\.checkout_borrowing/i);
  assert.match(migration, /create or replace function public\.return_borrowing/i);
  assert.doesNotMatch(migration, /from public\.profiles where id = v_actor_id/i);
  assert.doesNotMatch(migration, /from public\.bookings where id = p_borrowing_id/i);
  assert.doesNotMatch(migration, /where id = v_booking\.id/i);
  assert.doesNotMatch(migration, /ai\.storage_path = a\.name/i);
  assert.match(migration, /ai\.storage_path = storage\.objects\.name/i);
  assert.match(migration, /Defect photo owners and admins delete objects/i);
  assert.match(migration, /owner_id = \(select auth\.uid\(\)\)::text/i);
});
