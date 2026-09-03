import { NextResponse } from "next/server";
import { enforceSameOriginRequest, requireTrustedClientKey } from "@/server/api-security";
import { deleteFirebaseUser, FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyRecentFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, jsonHeaders, logRequestEvent, toLogSafeUserId } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";
import { deleteReviewDataForUser, ReviewDeletionIncompleteError } from "@/server/review-storage";
import { deleteActivationDataForUser, ActivationDeletionIncompleteError } from "@/server/product-activation-storage";
import { CommunityDeletionIncompleteError, deleteCommunityDataForUser } from "@/server/community-storage";
import { deleteProjectDataForUser } from "@/server/project-storage";

const ACCOUNT_DELETE_RATE_LIMIT = { limit: 4, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const context = createRequestContext(request, "api.account.delete");
  const originCheck = enforceSameOriginRequest(request, context, "account_delete");
  if ("response" in originCheck) return originCheck.response;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    logRequestEvent("warn", "account_delete.auth_missing", context);
    return NextResponse.json({ error: "Sign in again before deleting your account." }, { status: 401, headers: jsonHeaders(context) });
  }

  try {
    const decodedToken = await verifyRecentFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const identity = requireTrustedClientKey(request, context, "account_delete");
    if ("response" in identity) return identity.response;
    const rateLimit = await checkRateLimit({
      key: `account-delete:${decodedToken.uid}:${identity.key}`,
      ...ACCOUNT_DELETE_RATE_LIMIT,
    });
    if (!rateLimit.allowed) {
      logRequestEvent("warn", "account_delete.rate_limited", context, { user: toLogSafeUserId(decodedToken.uid) });
      return NextResponse.json(
        { error: "Too many account deletion requests. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) },
      );
    }

    const [reviewOutcome, communityOutcome, activationOutcome, projectOutcome] = await Promise.allSettled([
      deleteReviewDataForUser(decodedToken.uid, { retainDeletionLock: true }),
      deleteCommunityDataForUser(decodedToken.uid),
      deleteActivationDataForUser(decodedToken.uid),
      deleteProjectDataForUser(decodedToken.uid),
    ]);
    if (reviewOutcome.status === "rejected") throw reviewOutcome.reason;
    if (communityOutcome.status === "rejected") throw communityOutcome.reason;
    if (activationOutcome.status === "rejected") throw activationOutcome.reason;
    if (projectOutcome.status === "rejected") throw projectOutcome.reason;
    const result = reviewOutcome.value;
    const community = communityOutcome.value;
    const activation = activationOutcome.value;
    const projects = projectOutcome.value;
    await deleteFirebaseUser(decodedToken.uid);
    logRequestEvent("info", "account_delete.completed", context, {
      draftsDeleted: result.draftsDeleted,
      feedbackDeleted: result.feedbackDeleted,
      pipelineDocumentsDeleted: result.pipelineDocumentsDeleted,
      reviewsDeleted: result.reviewsDeleted,
      sourceImagesDeleted: result.sourceImagesDeleted,
      stagingImagesDeleted: result.stagingImagesDeleted,
      communityCommentsDeleted: community.commentsDeleted,
      communityInteractionsDeleted: community.interactionsDeleted,
      communityPostsDeleted: community.postsDeleted,
      activationBriefsDeleted: activation.briefsDeleted,
      activationDecisionAuditDeleted: activation.decisionAuditDeleted,
      activationInterestsDeleted: activation.interestsDeleted,
      activationSampleProgressDeleted: activation.sampleProgressDeleted,
      activationSelfReviewsDeleted: activation.selfReviewsDeleted,
      projectMutationReceiptsDeleted: projects.projectMutationReceiptsDeleted,
      projectsDeleted: projects.projectsDeleted,
      user: toLogSafeUserId(decodedToken.uid),
    });

    return NextResponse.json({ deleted: true, ...result, activation, projects }, { headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) });
  } catch (error) {
    if (error instanceof ActivationDeletionIncompleteError) {
      logRequestEvent("error", "account_delete.activation_cleanup_incomplete", context, {
        failedOperations: error.result.failures.length,
      });
      return NextResponse.json(
        { deleted: false, activation: error.result, retryRequired: true },
        { status: 503, headers: jsonHeaders(context) },
      );
    }
    if (error instanceof CommunityDeletionIncompleteError) {
      logRequestEvent("error", "account_delete.community_cleanup_incomplete", context, {
        failedOperations: error.failures.length,
      });
      return NextResponse.json(
        { deleted: false, community: error.result, retryRequired: true },
        { status: 503, headers: jsonHeaders(context) },
      );
    }
    if (error instanceof ReviewDeletionIncompleteError) {
      logRequestEvent("error", "account_delete.cleanup_incomplete", context, {
        failedOperations: error.result.failures.length,
      });
      return NextResponse.json(
        { deleted: false, ...error.result },
        { status: 503, headers: jsonHeaders(context) },
      );
    }
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", "account_delete.admin_unavailable", context);
      return NextResponse.json({ error: error.message }, { status: 503, headers: jsonHeaders(context) });
    }
    if (error instanceof FirebaseTokenVerificationError) {
      logRequestEvent("warn", "account_delete.auth_invalid", context);
      return NextResponse.json({ error: error.message }, { status: 401, headers: jsonHeaders(context, getAuthDiagnosticHeaders(error)) });
    }

    logRequestEvent("error", "account_delete.failed", context);
    return NextResponse.json({ error: "Account deletion failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return {
    ...(error.code ? { "x-iroguide-auth-error": error.code } : {}),
  };
}
