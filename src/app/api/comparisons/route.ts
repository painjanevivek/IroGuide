import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { comparisonRequestSchema } from "@/domain/comparison";
import { createDemoComparison } from "@/domain/demo-comparison";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in again before comparing a revision." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = comparisonRequestSchema.parse(body);
    return NextResponse.json(createDemoComparison(parsed));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Comparison details are incomplete or invalid.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Comparison failed. Please try again." }, { status: 500 });
  }
}
