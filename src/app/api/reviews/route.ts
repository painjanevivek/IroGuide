import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createDemoReview } from "@/domain/demo-review";
import { reviewRequestSchema } from "@/domain/review";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in again before starting a critique." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = reviewRequestSchema.parse(body);
    return NextResponse.json(createDemoReview(parsed));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Review details are incomplete or invalid.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Review failed. Please try again." }, { status: 500 });
  }
}
