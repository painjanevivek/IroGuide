import { NextResponse } from "next/server";
import { reviewRequestSchema } from "@/domain/review";
import { createDemoReview } from "@/server/demo-review";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the design details and try again.", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "demo") {
    return NextResponse.json(
      { error: "The configured AI provider adapter is not available in this build." },
      { status: 503 },
    );
  }

  return NextResponse.json(createDemoReview(parsed.data), {
    headers: { "Cache-Control": "no-store" },
  });
}
