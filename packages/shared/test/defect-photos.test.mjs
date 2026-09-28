import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFECT_PHOTO_MAX_BYTES,
  getDefectPhotoExtension,
  resolveDefectPhotoContentType,
  validateDefectPhotoCandidates
} from "../dist/index.js";

test("defect photo validation accepts supported images and infers common extensions", () => {
  assert.equal(resolveDefectPhotoContentType({ fileName: "damage.JPG", mimeType: null }), "image/jpeg");
  assert.equal(resolveDefectPhotoContentType({ fileName: "damage.bin", mimeType: "image/png" }), "image/png");
  assert.equal(getDefectPhotoExtension("image/webp"), "webp");
  assert.equal(validateDefectPhotoCandidates([
    { fileName: "one.jpg", fileSize: 1000, mimeType: "image/jpeg" },
    { fileName: "two.png", fileSize: 2000, mimeType: "image/png" }
  ]), null);
});

test("defect photo validation rejects unsupported, oversized, and excess images", () => {
  assert.match(validateDefectPhotoCandidates([{ fileName: "damage.heic", mimeType: "image/heic" }]) ?? "", /JPEG, PNG, or WebP/);
  assert.match(validateDefectPhotoCandidates([{ fileName: "damage.jpg", fileSize: DEFECT_PHOTO_MAX_BYTES + 1, mimeType: "image/jpeg" }]) ?? "", /5 MB/);
  assert.match(validateDefectPhotoCandidates([
    { fileName: "one.jpg", mimeType: "image/jpeg" },
    { fileName: "two.jpg", mimeType: "image/jpeg" },
    { fileName: "three.jpg", mimeType: "image/jpeg" }
  ], 1) ?? "", /up to 3/);
});
