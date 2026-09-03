import "server-only";

import { deriveDashboardGuide } from "@/domain/dashboard-guide";
import { getServerLaunchCapabilities } from "./launch-capabilities";
import { getFirebaseAdminFirestore } from "./firebase-admin";
import { getAccountExperienceBundle, listDesignBriefs, listSelfReviews } from "./product-activation-storage";

export async function getDashboardGuide(userId: string) {
  const [bundle, selfReviews, briefs, operational] = await Promise.all([
    getAccountExperienceBundle(userId),
    listSelfReviews(userId),
    listDesignBriefs(userId),
    getOperationalSummary(userId),
  ]);
  const capabilities = getServerLaunchCapabilities();
  return deriveDashboardGuide({
    role: bundle.experience.primaryRole ?? "other",
    onboardingStatus: bundle.experience.onboardingStatus,
    sampleProgress: bundle.sampleProgress.map((record) => ({ checkedActionIds: record.checkedActionIds, reflectionChoice: record.reflectionChoice, revealedFindingIds: record.revealedFindingIds, updatedAt: record.updatedAt })),
    selfReviews: selfReviews.map((record) => ({ category: record.category, status: record.status, updatedAt: record.updatedAt })),
    briefs: briefs.map((record) => ({ category: record.category, status: record.status, updatedAt: record.updatedAt })),
    access: bundle.accessInterest ? { status: bundle.accessInterest.status, preferredCategory: bundle.accessInterest.preferredCategory, updatedAt: bundle.accessInterest.updatedAt } : null,
    ...operational,
    aiCritique: capabilities.aiCritique,
  });
}

async function getOperationalSummary(userId: string) {
  const db = await getFirebaseAdminFirestore();
  const activeStatuses = ["accepted", "running", "failed-retryable"];
  const [reviews, reviewDrafts, activeReviewJobs] = await Promise.all([
    db.collection("reviews").where("userId", "==", userId).count().get(),
    db.collection("reviewDrafts").where("userId", "==", userId).count().get(),
    db.collection("reviewJobs").where("userId", "==", userId).where("status", "in", activeStatuses).limit(1).get(),
  ]);
  return {
    reviewCount: reviews.data().count,
    reviewDraftCount: reviewDrafts.data().count,
    activeReviewJob: !activeReviewJobs.empty,
    comparisonDraft: false,
    caseStudyDraft: false,
  };
}
