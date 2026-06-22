import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createDemoFollowUp } from "@/domain/demo-follow-up";
import { followUpRequestSchema } from "@/domain/follow-up";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in again before asking a follow-up." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = followUpRequestSchema.parse(body);
    return NextResponse.json(createDemoFollowUp(parsed));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Follow-up details are incomplete or invalid.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Follow-up failed. Please try again." }, { status: 500 });
  }
}
