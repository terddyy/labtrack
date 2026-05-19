const QR_PREFIX = "LABTRACK";
const QR_VERSION = "v1";

export type LabtrackQrPayload = {
  version: typeof QR_VERSION;
  code: string;
};

export function createQrPayload(code: string): string {
  const normalized = code.trim();

  if (!normalized) {
    throw new Error("QR code value is required.");
  }

  return `${QR_PREFIX}:${QR_VERSION}:${encodeURIComponent(normalized)}`;
}

export function parseQrPayload(payload: string): LabtrackQrPayload | null {
  const [prefix, version, encodedCode] = payload.trim().split(":");

  if (prefix !== QR_PREFIX || version !== QR_VERSION || !encodedCode) {
    return null;
  }

  return {
    version,
    code: decodeURIComponent(encodedCode)
  };
}

export function isLabtrackQrPayload(payload: string): boolean {
  return parseQrPayload(payload) !== null;
}
