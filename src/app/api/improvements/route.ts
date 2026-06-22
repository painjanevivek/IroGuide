import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createDemoImprovementPlan } from "@/domain/demo-review";
import { improvementRequestSchema } from "@/domain/improvement";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = improvementRequestSchema.parse(body);
    return NextResponse.json(createDemoImprovementPlan(parsed));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Improvement details are incomplete or invalid.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "The improvement plan is unavailable right now." }, { status: 500 });
  }
}
