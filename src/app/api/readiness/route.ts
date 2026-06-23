import { NextResponse } from "next/server";
import { getFirebaseAdminProjectId, isFirebaseAdminConfigured } from "@/server/firebase-admin";
import { getReviewProviderStatus } from "@/server/review-provider";

export const runtime = "nodejs";

export function GET() {
  const reviewProvider = getReviewProviderStatus();
  const accountStorageProjectId = getFirebaseAdminProjectId();
  const publicFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
  const checks = {
    accountStorage: isFirebaseAdminConfigured(),
    firebaseProjectMatch: Boolean(accountStorageProjectId && publicFirebaseProjectId && accountStorageProjectId === publicFirebaseProjectId),
    liveVision: reviewProvider.liveReady,
  };
  const ready = checks.accountStorage && checks.firebaseProjectMatch && checks.liveVision;

  return NextResponse.json({
    ok: ready,
    checks,
    firebase: {
      accountStorageProjectId,
      publicFirebaseProjectId,
    },
    reviewProvider,
  }, { status: ready ? 200 : 503 });
}
