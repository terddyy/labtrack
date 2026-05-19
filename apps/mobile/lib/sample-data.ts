import { createQrPayload, type Asset, type Booking, type DefectReport } from "@labtrack/shared";

export const mobileAssets: Asset[] = [
  {
    id: "8f4a8f90-9231-4ef0-b621-2c97af733001",
    propertyNumber: "PSU-CCS-LT-001",
    serialNumber: "LT-23-A9X2",
    name: "Lenovo ThinkPad Laboratory Laptop",
    categoryName: "Laptop",
    locationName: "CCS Laboratory 1",
    condition: "good",
    status: "available",
    activeQrCode: "ASSET-LT-001-7JQ2"
  },
  {
    id: "8f4a8f90-9231-4ef0-b621-2c97af733002",
    propertyNumber: "PSU-CCS-PR-004",
    serialNumber: "EPSON-X49-2042",
    name: "Epson Projector",
    categoryName: "Projector",
    locationName: "Multimedia Room",
    condition: "fair",
    status: "reserved",
    activeQrCode: "ASSET-PR-004-H9K1"
  }
];

export const mobileBookings: Booking[] = [
  {
    id: "0abdc48f-30c5-4098-ad58-cc6df30a1001",
    assetId: mobileAssets[1].id,
    instructorId: "9ec5dfd8-a2f7-4d3e-9eba-2a1a6d1bb001",
    requestedStartAt: "2026-05-20T08:00:00+08:00",
    requestedEndAt: "2026-05-20T11:00:00+08:00",
    purpose: "Database systems lecture demonstration",
    status: "pending"
  }
];

export const mobileReports: DefectReport[] = [
  {
    id: "4c4f2c67-8db2-4195-ae09-67cef39e7001",
    assetId: mobileAssets[0].id,
    instructorId: "9ec5dfd8-a2f7-4d3e-9eba-2a1a6d1bb001",
    title: "Keyboard has unresponsive key",
    description: "The enter key does not consistently register during classroom use.",
    status: "pending"
  }
];

export const demoQrPayload = createQrPayload(mobileAssets[0].activeQrCode);
