import { z } from "zod";
import { backendRpcNames, type BackendRpcKey } from "./backend.js";
import {
  assetQrCodeRowDtoSchema,
  activityLogRowDtoSchema,
  adminAssetRowDtoSchema,
  borrowingIdInputSchema,
  borrowingLifecycleInputSchema,
  borrowingMonitorInputSchema,
  borrowingResourceRowDtoSchema,
  borrowingRowDtoSchema,
  borrowerQrPickupRowDtoSchema,
  bookingRowDtoSchema,
  bookingRpcResultDtoSchema,
  checkoutBorrowingByQrInputSchema,
  cancelBookingInputSchema,
  checkoutBookingInputSchema,
  createBorrowingInputSchema,
  createBookingInputSchema,
  createDefectReportInputSchema,
  decideBorrowingInputSchema,
  decideBookingInputSchema,
  defectReportRpcResultDtoSchema,
  ensureTicketThreadInputSchema,
  getBorrowerQrPickupInputSchema,
  listActivityLogsInputSchema,
  instructorAssetLookupDtoSchema,
  listBorrowableResourcesInputSchema,
  listAdminAssetsInputSchema,
  listResourceScheduleInputSchema,
  markNotificationReadInputSchema,
  notificationRowDtoSchema,
  printableReportInputSchema,
  printableReportRowDtoSchema,
  regenerateAssetQrInputSchema,
  resolveAssetByQrCodeInputSchema,
  resourceScheduleEntryRowDtoSchema,
  returnBookingInputSchema,
  sendTicketMessageInputSchema,
  ticketMessageRowDtoSchema,
  ticketThreadRowDtoSchema,
  triageDefectReportInputSchema,
  usageAnalyticsInputSchema,
  usageAnalyticsRowDtoSchema
} from "./schemas.js";

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type BackendRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export const backendRpcInputSchemas = {
  listAdminAssets: listAdminAssetsInputSchema,
  resolveAssetByQrCode: resolveAssetByQrCodeInputSchema,
  regenerateAssetQr: regenerateAssetQrInputSchema,
  createBooking: createBookingInputSchema,
  cancelBooking: cancelBookingInputSchema,
  decideBooking: decideBookingInputSchema,
  checkoutBooking: checkoutBookingInputSchema,
  returnBooking: returnBookingInputSchema,
  listBorrowableResources: listBorrowableResourcesInputSchema,
  listResourceSchedule: listResourceScheduleInputSchema,
  createBorrowing: createBorrowingInputSchema,
  cancelBorrowing: borrowingIdInputSchema,
  decideBorrowing: decideBorrowingInputSchema,
  checkoutBorrowing: borrowingLifecycleInputSchema,
  getBorrowerQrPickup: getBorrowerQrPickupInputSchema,
  checkoutBorrowingByQr: checkoutBorrowingByQrInputSchema,
  returnBorrowing: borrowingLifecycleInputSchema,
  getBorrowingMonitor: borrowingMonitorInputSchema,
  getUsageAnalytics: usageAnalyticsInputSchema,
  listActivityLogs: listActivityLogsInputSchema,
  getPrintableReportData: printableReportInputSchema,
  createDefectReport: createDefectReportInputSchema,
  triageDefectReport: triageDefectReportInputSchema,
  ensureTicketThread: ensureTicketThreadInputSchema,
  sendTicketMessage: sendTicketMessageInputSchema,
  markNotificationRead: markNotificationReadInputSchema
} as const satisfies Record<BackendRpcKey, z.ZodType>;

export const backendRpcReturnSchemas = {
  listAdminAssets: z.array(adminAssetRowDtoSchema),
  resolveAssetByQrCode: z.array(instructorAssetLookupDtoSchema),
  regenerateAssetQr: assetQrCodeRowDtoSchema,
  createBooking: z.array(bookingRpcResultDtoSchema),
  cancelBooking: bookingRowDtoSchema,
  decideBooking: bookingRowDtoSchema,
  checkoutBooking: bookingRowDtoSchema,
  returnBooking: bookingRowDtoSchema,
  listBorrowableResources: z.array(borrowingResourceRowDtoSchema),
  listResourceSchedule: z.array(resourceScheduleEntryRowDtoSchema),
  createBorrowing: z.array(borrowingRowDtoSchema),
  cancelBorrowing: z.array(borrowingRowDtoSchema),
  decideBorrowing: z.array(borrowingRowDtoSchema),
  checkoutBorrowing: z.array(borrowingRowDtoSchema),
  getBorrowerQrPickup: z.array(borrowerQrPickupRowDtoSchema),
  checkoutBorrowingByQr: z.array(borrowingRowDtoSchema),
  returnBorrowing: z.array(borrowingRowDtoSchema),
  getBorrowingMonitor: z.array(borrowingRowDtoSchema),
  getUsageAnalytics: z.array(usageAnalyticsRowDtoSchema),
  listActivityLogs: z.array(activityLogRowDtoSchema),
  getPrintableReportData: z.array(printableReportRowDtoSchema),
  createDefectReport: z.array(defectReportRpcResultDtoSchema),
  triageDefectReport: z.array(defectReportRpcResultDtoSchema),
  ensureTicketThread: ticketThreadRowDtoSchema,
  sendTicketMessage: ticketMessageRowDtoSchema,
  markNotificationRead: notificationRowDtoSchema
} as const satisfies Record<BackendRpcKey, z.ZodType>;

export type BackendRpcInput<K extends BackendRpcKey> = z.input<(typeof backendRpcInputSchemas)[K]>;
export type BackendRpcOutput<K extends BackendRpcKey> = z.output<(typeof backendRpcReturnSchemas)[K]>;

export async function callRpc<K extends BackendRpcKey>(
  client: BackendRpcClient,
  key: K,
  input: BackendRpcInput<K>
): Promise<BackendRpcOutput<K>> {
  const parsedInput = backendRpcInputSchemas[key].parse(input) as Record<string, unknown>;
  const { data, error } = await client.rpc(backendRpcNames[key], parsedInput);

  if (error) {
    throw new Error(error.message);
  }

  return backendRpcReturnSchemas[key].parse(data) as BackendRpcOutput<K>;
}
