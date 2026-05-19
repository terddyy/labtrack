import type { AssetCondition, AssetStatus, BookingStatus, DefectStatus, UserRole } from "./statuses";

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  isActive: boolean;
};

export type Asset = {
  id: string;
  propertyNumber: string;
  serialNumber?: string | null;
  name: string;
  categoryName: string;
  locationName: string;
  condition: AssetCondition;
  status: AssetStatus;
  activeQrCode: string;
};

export type Booking = {
  id: string;
  assetId: string;
  instructorId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  purpose: string;
  status: BookingStatus;
};

export type DefectReport = {
  id: string;
  assetId: string;
  instructorId: string;
  title: string;
  description: string;
  status: DefectStatus;
};

export type TicketMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
};
