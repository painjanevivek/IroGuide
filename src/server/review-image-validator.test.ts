import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ReviewImageValidationError, validateReviewImage } from "./review-image-validator";

describe("review image validation", () => {
  it.each([
    ["png", "image/png"],
    ["jpeg", "image/jpeg"],
    ["webp", "image/webp"],
  ] as const)("decodes and fingerprints a bounded %s", async (format, contentType) => {
    const bytes = await sharp({ create: { width: 320, height: 180, channels: 3, background: "#6848e8" } })
      .toFormat(format)
      .toBuffer();
    await expect(validateReviewImage(bytes, contentType, new Date("2026-08-24T00:00:00.000Z"))).resolves.toMatchObject({
      bytes: bytes.length,
      detectedFormat: format,
      width: 320,
      height: 180,
      pixelCount: 57_600,
      contentDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("rejects spoofed and malformed image bytes", async () => {
    await expect(validateReviewImage(Buffer.from("not-an-image"), "image/png")).rejects.toBeInstanceOf(ReviewImageValidationError);
    const jpeg = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer();
    await expect(validateReviewImage(jpeg, "image/png")).rejects.toThrow(/signature/i);
  });
});
