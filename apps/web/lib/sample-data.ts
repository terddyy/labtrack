import { createQrPayload, type Asset, type Booking, type DefectReport, type Profile } from "@labtrack/shared";

export const profiles: Profile[] = [
  {
    id: "6b98b1a1-9028-4305-828c-286d4afaa001",
    email: "superadmin@gmail.com",
    fullName: "CCS Super Admin",
    role: "super_admin",
    department: "College of Computing Studies",
    isActive: true
  },
  {
    id: "6b98b1a1-9028-4305-828c-286d4afaa002",
    email: "admin@gmail.com",
    fullName: "Laboratory Administrator",
    role: "admin",
    department: "College of Computing Studies",
    isActive: true
  }
];

export const assets: Asset[] = [
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
  },
  {
    id: "8f4a8f90-9231-4ef0-b621-2c97af733003",
    propertyNumber: "PSU-CCS-RT-002",
    serialNumber: "RTR-AX88-1139",
    name: "ASUS Network Router",
    categoryName: "Networking",
    locationName: "Network Laboratory",
    condition: "defective",
    status: "under_review",
    activeQrCode: "ASSET-RT-002-M4P8"
  }
];

export const bookings: Booking[] = [
  {
    id: "0abdc48f-30c5-4098-ad58-cc6df30a1001",
    assetId: assets[1].id,
    instructorId: "9ec5dfd8-a2f7-4d3e-9eba-2a1a6d1bb001",
    requestedStartAt: "2026-05-20T08:00:00+08:00",
    requestedEndAt: "2026-05-20T11:00:00+08:00",
    purpose: "Database systems lecture demonstration",
    status: "pending"
  },
  {
    id: "0abdc48f-30c5-4098-ad58-cc6df30a1002",
    assetId: assets[0].id,
    instructorId: "9ec5dfd8-a2f7-4d3e-9eba-2a1a6d1bb002",
    requestedStartAt: "2026-05-21T13:00:00+08:00",
    requestedEndAt: "2026-05-21T17:00:00+08:00",
    purpose: "Capstone consultation and testing",
    status: "approved"
  }
];

export const defectReports: DefectReport[] = [
  {
    id: "4c4f2c67-8db2-4195-ae09-67cef39e7001",
    assetId: assets[2].id,
    instructorId: "9ec5dfd8-a2f7-4d3e-9eba-2a1a6d1bb001",
    title: "Router intermittently drops connection",
    description: "The router disconnects client devices during packet tracing exercises.",
    status: "under_review"
  }
];

export function getAssetQrPayload(asset: Asset) {
  return createQrPayload(asset.activeQrCode);
}
