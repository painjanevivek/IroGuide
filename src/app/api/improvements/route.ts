import { NextResponse } from "next/server";
import { improvementRequestSchema } from "@/domain/improvement";
import { createDemoImprovement } from "@/server/demo-improvement";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }
  const parsed = improvementRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "The review could not be converted into an improvement plan." }, { status: 422 });
  return NextResponse.json(createDemoImprovement(parsed.data), { headers: { "Cache-Control": "no-store" } });
}
