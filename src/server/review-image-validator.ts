import "server-only";

import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { reviewUploadValidationSchema, type ReviewUploadSession } from "@/domain/review-pipeline";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 8_192;
const MAX_PIXELS = 24_000_000;
const formatContentTypes = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export class ReviewImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewImageValidationError";
  }
}

export async function validateReviewImage(
  bytes: Buffer,
  expectedContentType: ReviewUploadSession["expectedContentType"],
  now = new Date(),
) {
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new ReviewImageValidationError("Review image bytes are outside the allowed size.");
  }
  const magicFormat = detectMagicFormat(bytes);
  if (!magicFormat || formatContentTypes[magicFormat] !== expectedContentType) {
    throw new ReviewImageValidationError("Review image signature does not match its authorized content type.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, { failOn: "warning", limitInputPixels: MAX_PIXELS, sequentialRead: true }).metadata();
  } catch {
    throw new ReviewImageValidationError("Review image could not be decoded safely.");
  }
  if (metadata.format !== magicFormat || !metadata.width || !metadata.height) {
    throw new ReviewImageValidationError("Review image decoded format or dimensions are invalid.");
  }
  if (metadata.pages && metadata.pages > 1) {
    throw new ReviewImageValidationError("Animated or multi-page review images are not supported.");
  }
  const pixelCount = metadata.width * metadata.height;
  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION || pixelCount > MAX_PIXELS) {
    throw new ReviewImageValidationError("Review image dimensions exceed the decompression budget.");
  }

  return reviewUploadValidationSchema.parse({
    bytes: bytes.length,
    contentDigest: createHash("sha256").update(bytes).digest("hex"),
    detectedFormat: magicFormat,
    height: metadata.height,
    pixelCount,
    validatedAt: now.toISOString(),
    validatorVersion: "sharp-v1",
    width: metadata.width,
  });
}

function detectMagicFormat(bytes: Buffer): keyof typeof formatContentTypes | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}
