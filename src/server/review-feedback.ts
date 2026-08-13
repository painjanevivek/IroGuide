import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import {
  getReviewFindingFeedbackId,
  type ReviewFindingFeedback,
} from "@/domain/review-feedback";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const REVIEWS_COLLECTION = "reviews";
const REVIEW_FEEDBACK_COLLECTION = "reviewFeedback";
const FEEDBACK_RETENTION_DAYS = 180;

export class ReviewFeedbackAuthorizationError extends Error {
  constructor(message = "This critique finding cannot be rated.") {
    super(message);
    this.name = "ReviewFeedbackAuthorizationError";
  }
}

export async function saveReviewFindingFeedback(userId: string, feedback: ReviewFindingFeedback) {
  const db = await getFirebaseAdminFirestore();
  const reviewSnapshot = await db.collection(REVIEWS_COLLECTION).doc(feedback.reviewDocumentId).get();
  const review = reviewSnapshot.data();
  if (!isOwnedTrustedReview(review, userId) || !hasIssue(review.review, feedback.issueId)) {
    throw new ReviewFeedbackAuthorizationError();
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const feedbackId = getReviewFindingFeedbackId(userId, feedback);
  await db.collection(REVIEW_FEEDBACK_COLLECTION).doc(feedbackId).set({
    ...feedback,
    id: feedbackId,
    userId,
    reviewId: review.review.id,
    rubricId: getIssueRubricId(review.review, feedback.issueId),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromDate(new Date(Date.now() + FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000)),
  }, { merge: true });

  return { id: feedbackId };
}

function isOwnedTrustedReview(value: unknown, userId: string): value is { userId: string; review: { id: string; issues: unknown[] } } {
  if (!isRecord(value) || value.userId !== userId || value.status !== "complete") return false;
  if (!isRecord(value.provenance) || value.provenance.origin !== "server" || value.provenance.schemaVersion !== 1) return false;
  return isRecord(value.review) && typeof value.review.id === "string" && Array.isArray(value.review.issues);
}

function hasIssue(review: { issues: unknown[] }, issueId: string) {
  return review.issues.some((issue) => isRecord(issue) && issue.id === issueId);
}

function getIssueRubricId(review: { issues: unknown[] }, issueId: string) {
  const issue = review.issues.find((candidate) => isRecord(candidate) && candidate.id === issueId);
  return isRecord(issue) && typeof issue.rubricId === "string" ? issue.rubricId : "legacy-unmapped";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
