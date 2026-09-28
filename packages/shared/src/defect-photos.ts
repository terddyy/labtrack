export const DEFECT_PHOTO_MAX_COUNT = 3;
export const DEFECT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DEFECT_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type DefectPhotoContentType = (typeof DEFECT_PHOTO_CONTENT_TYPES)[number];

export type DefectPhotoCandidate = {
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
};

const extensions: Record<DefectPhotoContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function resolveDefectPhotoContentType(candidate: Pick<DefectPhotoCandidate, "fileName" | "mimeType">): DefectPhotoContentType | null {
  const normalized = candidate.mimeType?.trim().toLowerCase();

  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  if (normalized && DEFECT_PHOTO_CONTENT_TYPES.includes(normalized as DefectPhotoContentType)) {
    return normalized as DefectPhotoContentType;
  }

  const extension = candidate.fileName?.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";

  return null;
}

export function getDefectPhotoExtension(contentType: DefectPhotoContentType) {
  return extensions[contentType];
}

export function validateDefectPhotoCandidates(candidates: readonly DefectPhotoCandidate[], existingCount = 0): string | null {
  if (existingCount + candidates.length > DEFECT_PHOTO_MAX_COUNT) {
    return `Attach up to ${DEFECT_PHOTO_MAX_COUNT} defect photos.`;
  }

  for (const candidate of candidates) {
    if (!resolveDefectPhotoContentType(candidate)) {
      return "Defect photos must be JPEG, PNG, or WebP images.";
    }

    if (candidate.fileSize != null && candidate.fileSize > DEFECT_PHOTO_MAX_BYTES) {
      return "Each defect photo must be 5 MB or smaller.";
    }
  }

  return null;
}
