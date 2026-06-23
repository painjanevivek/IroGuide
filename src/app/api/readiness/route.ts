import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/server/firebase-admin";
import { getReviewProviderStatus } from "@/server/review-provider";

export const runtime = "nodejs";

export function GET() {
  const reviewProvider = getReviewProviderStatus();
  const checks = {
    accountStorage: isFirebaseAdminConfigured(),
    liveVision: reviewProvider.liveReady,
  };
  const ready = checks.accountStorage && checks.liveVision;

  return NextResponse.json({
    ok: ready,
    checks,
    reviewProvider,
  }, { status: ready ? 200 : 503 });
}
