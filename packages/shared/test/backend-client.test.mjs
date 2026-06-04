import assert from "node:assert/strict";
import test from "node:test";
import {
  backendRpcNames,
  callRpc,
  instructorAssetLookupDtoSchema
} from "../dist/index.js";

const assetId = "8f4a8f90-9231-4ef0-b621-2c97af733001";
const qrId = "8f4a8f90-9231-4ef0-b621-2c97af733002";

test("instructor asset lookup DTO accepts the active_qr_code return column", () => {
  assert.equal(instructorAssetLookupDtoSchema.safeParse({
    qr_code_id: qrId,
    asset_id: assetId,
    property_number: "PSU-CCS-LT-001",
    serial_number: null,
    name: "Laboratory Laptop",
    category_id: "8f4a8f90-9231-4ef0-b621-2c97af733003",
    category_name: "Laptop",
    location_id: "8f4a8f90-9231-4ef0-b621-2c97af733004",
    location_name: "Lab 1",
    condition: "good",
    status: "available",
    active_qr_code: "ASSET-LT-001-ABCD",
    qr_generated_at: "2026-05-22T01:00:00+00:00"
  }).success, true);

  assert.equal(instructorAssetLookupDtoSchema.safeParse({
    qr_code_id: qrId,
    asset_id: assetId,
    property_number: "PSU-CCS-LT-001",
    serial_number: null,
    name: "Laboratory Laptop",
    category_id: "8f4a8f90-9231-4ef0-b621-2c97af733003",
    category_name: "Laptop",
    location_id: "8f4a8f90-9231-4ef0-b621-2c97af733004",
    location_name: "Lab 1",
    condition: "good",
    status: "available",
    qr_code: "ASSET-LT-001-ABCD",
    qr_generated_at: "2026-05-22T01:00:00+00:00"
  }).success, false);
});

test("callRpc validates input, calls the centralized RPC name, and parses output", async () => {
  let captured = null;
  const client = {
    async rpc(name, args) {
      captured = { name, args };
      return {
        error: null,
        data: [{
          qr_code_id: qrId,
          asset_id: assetId,
          property_number: "PSU-CCS-LT-001",
          serial_number: null,
          name: "Laboratory Laptop",
          category_id: "8f4a8f90-9231-4ef0-b621-2c97af733003",
          category_name: "Laptop",
          location_id: "8f4a8f90-9231-4ef0-b621-2c97af733004",
          location_name: "Lab 1",
          condition: "good",
          status: "available",
          active_qr_code: "ASSET-LT-001-ABCD",
          qr_generated_at: "2026-05-22T01:00:00+00:00"
        }]
      };
    }
  };

  const output = await callRpc(client, "resolveAssetByQrCode", { p_qr_code: "  ASSET-LT-001-ABCD  " });

  assert.deepEqual(captured, {
    name: backendRpcNames.resolveAssetByQrCode,
    args: { p_qr_code: "ASSET-LT-001-ABCD" }
  });
  assert.equal(output[0].active_qr_code, "ASSET-LT-001-ABCD");
});

test("callRpc throws Supabase RPC errors as exceptions", async () => {
  await assert.rejects(
    () => callRpc({
      async rpc() {
        return { data: null, error: { message: "No access" } };
      }
    }, "cancelBooking", { p_booking_id: assetId }),
    /No access/
  );
});
