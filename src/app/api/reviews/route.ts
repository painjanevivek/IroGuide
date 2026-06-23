import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { reviewRequestSchema } from "@/domain/review";
import { createReview, ReviewProviderUnavailableError } from "@/server/review-provider";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in again before starting a critique." }, { status: 401 });
  }

  try {
    const parsed = await parseReviewRequest(request);
    return NextResponse.json(await createReview(parsed));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof ReviewRequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: getReviewValidationMessage(error), details: error.flatten() }, { status: 400 });
    }
    if (error instanceof ReviewProviderUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Review failed. Please try again." }, { status: 500 });
  }
}

async function parseReviewRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return parseMultipartReviewRequest(request);
  }

  const body: unknown = await request.json();
  return reviewRequestSchema.parse(body);
}

async function parseMultipartReviewRequest(request: Request) {
  const formData = await request.formData();
  const category = getRequiredString(formData, "category");
  const mode = getRequiredString(formData, "mode");
  const brief = parseBrief(getRequiredString(formData, "brief"));
  const image = formData.get("image");

  if (!(image instanceof File)) {
    throw new ReviewRequestValidationError("Choose a PNG, JPEG, or WebP image before starting a critique.");
  }
  if (!ACCEPTED_IMAGE_TYPES.has(image.type)) {
    throw new ReviewRequestValidationError("Choose a PNG, JPEG, or WebP image.");
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
    throw new ReviewRequestValidationError("Use an image between 1 byte and 10 MB.");
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!hasMatchingImageSignature(bytes, image.type)) {
    throw new ReviewRequestValidationError("The uploaded file does not match its image type.");
  }

  return reviewRequestSchema.parse({
    category,
    mode,
    file: { name: image.name, type: image.type, size: image.size },
    brief,
    image: {
      mimeType: image.type,
      dataBase64: Buffer.from(bytes).toString("base64"),
    },
  });
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ReviewRequestValidationError("Review details are incomplete or invalid.");
  }

  return value;
}

function parseBrief(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ReviewRequestValidationError("Review brief must be valid JSON.");
  }
}

function hasMatchingImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mimeType === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }

  return false;
}

class ReviewRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRequestValidationError";
  }
}

function getReviewValidationMessage(error: ZodError) {
  const firstIssue = error.issues[0];
  const field = firstIssue?.path.join(".");

  if (field === "brief.audience") return "Target audience must be at least 3 characters.";
  if (field === "brief.purpose") return "Purpose must be at least 3 characters.";
  if (field === "brief.style") return "Style direction must be at least 2 characters.";
  if (field === "brief.goal") return "Primary goal must be at least 3 characters.";
  if (field === "brief.concern") return "Specific concern is too long.";
  if (field === "category") return "Choose a valid design category.";
  if (field === "mode") return "Choose a valid feedback mode.";
  if (field?.startsWith("file")) return "Choose a valid PNG, JPEG, or WebP image before starting a critique.";

  return "Review details are incomplete or invalid.";
}
