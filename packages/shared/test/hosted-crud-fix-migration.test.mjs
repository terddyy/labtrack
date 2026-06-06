import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/20260606144623_fix_borrowing_rpc_and_storage_policies.sql", import.meta.url)
);
const migration = readFileSync(migrationPath, "utf8");

const hostedAccessMigrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20260606153000_fix_hosted_priority_helper_and_asset_image_access.sql",
    import.meta.url
  )
);
const hostedAccessMigration = readFileSync(hostedAccessMigrationPath, "utf8");

const hostedQrPickupMigrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/20260606154500_restore_borrower_qr_pickup_rpc.sql", import.meta.url)
);
const hostedQrPickupMigration = readFileSync(hostedQrPickupMigrationPath, "utf8");

const hostedQrHardeningMigrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20260606160000_harden_qr_checkout_and_defect_photo_policies.sql",
    import.meta.url
  )
);
const hostedQrHardeningMigration = readFileSync(hostedQrHardeningMigrationPath, "utf8");

const hostedQrLockOrderMigrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20260606161000_order_qr_checkout_locks_and_pickup_scope.sql",
    import.meta.url
  )
);
const hostedQrLockOrderMigration = readFileSync(hostedQrLockOrderMigrationPath, "utf8");

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

test("hosted CRUD access migration restores priority helper and asset image reads", () => {
  assert.match(hostedAccessMigration, /create or replace function app_private\.first_priority_borrowing_id/i);
  assert.match(hostedAccessMigration, /create or replace function app_private\.can_read_asset_image_metadata/i);
  assert.match(hostedAccessMigration, /create or replace function app_private\.can_read_asset_image_object/i);
  assert.match(hostedAccessMigration, /app_private\.can_read_asset_image_metadata\(asset_images\.asset_id\)/i);
  assert.match(hostedAccessMigration, /app_private\.can_read_asset_image_object\(storage\.objects\.name\)/i);
  assert.doesNotMatch(hostedAccessMigration, /ai\.storage_path = a\.name/i);
});

test("hosted CRUD QR pickup migration restores borrower pickup RPC", () => {
  assert.match(hostedQrPickupMigration, /create or replace function public\.get_borrower_qr_pickup/i);
  assert.match(hostedQrPickupMigration, /returns table \(\s*state text,\s*borrowing_id uuid,/i);
  assert.match(hostedQrPickupMigration, /app_private\.first_priority_borrowing_id/i);
  assert.match(hostedQrPickupMigration, /grant execute on function public\.get_borrower_qr_pickup\(text\) to authenticated/i);
  assert.match(hostedQrPickupMigration, /notify pgrst, 'reload schema'/i);
});

test("hosted CRUD QR hardening migration fixes reviewer findings", () => {
  const bookingLockIndex = hostedQrHardeningMigration.indexOf("from public.bookings b");
  const assetLockIndex = hostedQrHardeningMigration.indexOf("from public.asset_qr_codes aq");

  assert.match(hostedQrHardeningMigration, /create or replace function public\.checkout_borrowing_by_qr/i);
  assert.ok(bookingLockIndex > -1, "checkout_borrowing_by_qr should lock a booking row");
  assert.ok(assetLockIndex > -1, "checkout_borrowing_by_qr should lock an asset row");
  assert.ok(bookingLockIndex < assetLockIndex, "checkout_borrowing_by_qr should lock booking before asset");
  assert.match(hostedQrHardeningMigration, /v_asset\.is_room_bound = true/i);
  assert.match(hostedQrHardeningMigration, /b\.resource_type = 'room'::public\.borrowing_resource_type/i);
  assert.match(hostedQrHardeningMigration, /Defect photo owners and admins delete objects/i);
  assert.match(hostedQrHardeningMigration, /app_private\.is_active_user\(auth\.uid\(\)\)[\s\S]*owner_id = \(select auth\.uid\(\)\)::text/i);
  assert.match(hostedQrHardeningMigration, /notify pgrst, 'reload schema'/i);
});

test("hosted CRUD QR lock order migration orders advisory lock before asset row lock", () => {
  const bookingLockIndex = hostedQrLockOrderMigration.indexOf("from public.bookings b");
  const advisoryLockIndex = hostedQrLockOrderMigration.indexOf("perform app_private.lock_borrowing_scope");
  const assetLockIndex = hostedQrLockOrderMigration.indexOf("from public.asset_qr_codes aq");

  assert.ok(bookingLockIndex > -1, "checkout_borrowing_by_qr should lock a booking row");
  assert.ok(advisoryLockIndex > -1, "checkout_borrowing_by_qr should take the borrowing advisory lock");
  assert.ok(assetLockIndex > -1, "checkout_borrowing_by_qr should lock an asset row");
  assert.ok(bookingLockIndex < advisoryLockIndex, "checkout_borrowing_by_qr should lock booking before advisory scope");
  assert.ok(advisoryLockIndex < assetLockIndex, "checkout_borrowing_by_qr should lock advisory scope before asset");
  assert.match(hostedQrLockOrderMigration, /and b\.resource_type = 'room'::public\.borrowing_resource_type\s+and b\.location_id = v_asset\.location_id/i);
  assert.doesNotMatch(hostedQrLockOrderMigration, /left join public\.assets ba/i);
  assert.doesNotMatch(hostedQrLockOrderMigration, /ba\.is_room_bound = true/i);
  assert.match(hostedQrLockOrderMigration, /notify pgrst, 'reload schema'/i);
});
