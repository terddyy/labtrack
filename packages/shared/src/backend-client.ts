import { z } from "zod";
import { backendRpcNames, type BackendRpcKey } from "./backend.js";
import {
  assetQrCodeRowDtoSchema,
  adminAssetRowDtoSchema,
  bookingRowDtoSchema,
  bookingRpcResultDtoSchema,
  cancelBookingInputSchema,
  checkoutBookingInputSchema,
  createBookingInputSchema,
  createDefectReportInputSchema,
  decideBookingInputSchema,
  defectReportRpcResultDtoSchema,
  ensureTicketThreadInputSchema,
  instructorAssetLookupDtoSchema,
  listAdminAssetsInputSchema,
  markNotificationReadInputSchema,
  notificationRowDtoSchema,
  regenerateAssetQrInputSchema,
  resolveAssetByQrCodeInputSchema,
  returnBookingInputSchema,
  sendTicketMessageInputSchema,
  ticketMessageRowDtoSchema,
  ticketThreadRowDtoSchema,
  triageDefectReportInputSchema
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
