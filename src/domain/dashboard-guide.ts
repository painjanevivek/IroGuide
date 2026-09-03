import { z } from "zod";
import { activationRoles } from "./product-activation";
import { reviewCategories } from "./review";

export const dashboardGuideActionIds = [
  "finish-onboarding", "start-sample", "continue-sample", "start-self-review", "continue-self-review",
  "start-brief", "continue-brief", "request-access", "view-access", "continue-review-job", "continue-review-draft",
  "continue-comparison", "continue-case-study", "open-review-history", "learning-complete",
] as const;

export const dashboardGuideStateIds = [
  "new-account", "onboarding-incomplete", "sample-in-progress", "sample-complete", "self-review-in-progress",
  "self-review-complete", "brief-in-progress", "brief-ready", "access-requested", "invited", "review-job-active",
  "review-draft-ready", "comparison-in-progress", "case-study-in-progress", "existing-reviews", "learning-complete",
] as const;

export const dashboardGuideSchema = z.strictObject({
  schemaVersion: z.literal(1),
  state: z.enum(dashboardGuideStateIds),
  cohort: z.enum(activationRoles),
  nextAction: z.strictObject({
    id: z.enum(dashboardGuideActionIds),
    eyebrow: z.string().min(1).max(80),
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(320),
    href: z.string().startsWith("/").max(240),
    label: z.string().min(1).max(80),
    artifact: z.string().min(1).max(120),
  }),
  checklist: z.array(z.strictObject({
    id: z.enum(["choose-path", "inspect-sample", "practice-rubric", "prepare-brief"]),
    label: z.string().min(1).max(100),
    outcome: z.string().min(1).max(180),
    completed: z.boolean(),
    href: z.string().startsWith("/").max(240),
  })).length(4),
  completionCount: z.number().int().min(0).max(4),
  reviewCount: z.number().int().min(0).max(10_000),
  recentActivity: z.array(z.strictObject({
    id: z.string().min(1).max(80),
    type: z.enum(["sample", "self-review", "brief", "access", "review"]),
    label: z.string().min(1).max(120),
    category: z.enum(reviewCategories).nullable(),
    at: z.iso.datetime(),
  })).max(5),
}).strict();

export type DashboardGuide = z.infer<typeof dashboardGuideSchema>;

export type GuideInput = {
  role: z.infer<typeof dashboardGuideSchema>["cohort"];
  onboardingStatus: "not-started" | "in-progress" | "completed" | "skipped";
  sampleProgress: Array<{ checkedActionIds: string[]; reflectionChoice: string | null; revealedFindingIds: string[]; updatedAt: string }>;
  selfReviews: Array<{ category: (typeof reviewCategories)[number]; status: "draft" | "completed" | "archived"; updatedAt: string }>;
  briefs: Array<{ category: (typeof reviewCategories)[number] | null; status: "draft" | "ready" | "consumed" | "archived"; updatedAt: string }>;
  access: { status: "interested" | "invited" | "declined" | "expired" | "revoked"; preferredCategory: (typeof reviewCategories)[number] | null; updatedAt: string } | null;
  reviewCount: number;
  reviewDraftCount: number;
  activeReviewJob: boolean;
  comparisonDraft: boolean;
  caseStudyDraft: boolean;
  aiCritique: boolean;
};

export function deriveDashboardGuide(input: GuideInput): DashboardGuide {
  const onboardingComplete = input.onboardingStatus === "completed";
  const sample = input.sampleProgress[0];
  const sampleComplete = Boolean(sample?.reflectionChoice && sample.checkedActionIds.length > 0);
  const sampleStarted = Boolean(sample && (sample.revealedFindingIds.length > 0 || sample.checkedActionIds.length > 0));
  const draftSelfReview = input.selfReviews.find((record) => record.status === "draft");
  const selfReviewComplete = input.selfReviews.some((record) => record.status === "completed");
  const draftBrief = input.briefs.find((record) => record.status === "draft");
  const readyBrief = input.briefs.find((record) => record.status === "ready");
  const checklist = [
    { id: "choose-path" as const, label: "Choose your learning path", outcome: "Role and critique preferences saved", completed: onboardingComplete, href: "/onboarding" },
    { id: "inspect-sample" as const, label: "Inspect visible evidence", outcome: "One first fix chosen from an owned sample", completed: sampleComplete, href: "/learn#practice" },
    { id: "practice-rubric" as const, label: "Run a self-review", outcome: "Up to three priorities derived from your answers", completed: selfReviewComplete, href: "/learn?tool=self-review#practice" },
    { id: "prepare-brief" as const, label: "Prepare critique context", outcome: "An image-free design brief marked ready", completed: Boolean(readyBrief), href: "/learn?tool=brief#practice" },
  ];
  const completionCount = checklist.filter((item) => item.completed).length;

  let state: DashboardGuide["state"];
  let nextAction: DashboardGuide["nextAction"];
  if (input.activeReviewJob && input.aiCritique) {
    state = "review-job-active";
    nextAction = action("continue-review-job", "Live critique", "Your private critique is still processing.", "Return to the job without submitting the design again.", "/review/new", "View critique status", "Processing critique");
  } else if (!onboardingComplete) {
    state = input.onboardingStatus === "not-started" ? "new-account" : "onboarding-incomplete";
    nextAction = action("finish-onboarding", "Step 1 of 4", roleTitle(input.role), "Choose three short preferences so the examples and explanations match your current work.", "/onboarding", input.onboardingStatus === "not-started" ? "Choose my path" : "Continue setup", "Saved learning path");
  } else if (!sampleComplete) {
    state = sampleStarted ? "sample-in-progress" : "new-account";
    nextAction = action(sampleStarted ? "continue-sample" : "start-sample", "Step 2 of 4", sampleStarted ? "Continue where you left off." : "Practice evidence before opinion.", sampleStarted ? "Return to the finding you revealed and choose one useful first fix." : "Predict a finding, reveal its evidence, and decide what to change first.", "/learn#practice", sampleStarted ? "Continue sample" : "Start sample exercise", "Completed sample reflection");
  } else if (!selfReviewComplete) {
    state = draftSelfReview ? "self-review-in-progress" : "sample-complete";
    nextAction = action(draftSelfReview ? "continue-self-review" : "start-self-review", "Step 3 of 4", draftSelfReview ? "Finish the rubric you started." : "Apply the same standard to your own work.", "Your answers—not visual analysis—produce at most three priorities to check next.", "/learn?tool=self-review#practice", draftSelfReview ? "Continue self-review" : "Start self-review", "Saved self-review priorities");
  } else if (!readyBrief) {
    state = draftBrief ? "brief-in-progress" : "self-review-complete";
    nextAction = action(draftBrief ? "continue-brief" : "start-brief", "Step 4 of 4", draftBrief ? "Finish the context you started." : "Prepare a useful critique brief.", "Describe the audience, purpose, goal, and concern without uploading an image.", "/learn?tool=brief#practice", draftBrief ? "Continue brief" : "Build my brief", "Ready image-free brief");
  } else if (input.reviewDraftCount > 0 && input.aiCritique) {
    state = "review-draft-ready";
    nextAction = action("continue-review-draft", "Saved work", "Continue your private critique draft.", "The context is saved; return to the protected review flow to complete the artifact.", "/review/new", "Continue review draft", "Submitted review job");
  } else if (input.comparisonDraft) {
    state = "comparison-in-progress";
    nextAction = action("continue-comparison", "Revision loop", "Continue the comparison you started.", "Return to the owned review and finish matching revision evidence.", "/dashboard#recent-reviews", "Continue comparison", "Saved comparison");
  } else if (input.caseStudyDraft) {
    state = "case-study-in-progress";
    nextAction = action("continue-case-study", "Private portfolio", "Continue the case study you started.", "Return to the private evidence-backed draft without publishing it.", "/portfolio", "Continue case study", "Private case study draft");
  } else if (input.access?.status === "invited") {
    state = "invited";
    nextAction = input.aiCritique
      ? action("view-access", "Access approved", "Your invite-only critique access is ready.", "Review the privacy, retention, quota, and processing terms before any upload.", "/review/new", "Review access terms", "Acknowledged review access")
      : action("view-access", "Access recorded", "Your entitlement is saved, but the provider remains paused.", "Continue free practice; payment or invitation state cannot override the provider gate.", "/learn?tool=access#practice", "View access status", "Saved access state");
  } else if (input.reviewCount > 0) {
    state = "existing-reviews";
    nextAction = action("open-review-history", "Owned history", "Continue from your latest saved critique.", "Review the evidence and first action already attached to your account.", "/dashboard#recent-reviews", "Open recent critique", "Reviewed saved critique");
  } else if (input.access?.status === "interested") {
    state = "access-requested";
    nextAction = action("view-access", "Free path complete", "Your review-access interest is recorded.", "No email or provider job is created. Keep practicing with another example while the gate remains closed.", "/learn?tool=access#practice", "View access status", "Revocable access interest");
  } else {
    state = "brief-ready";
    nextAction = action("request-access", "Free path complete", "You have a brief ready for a future critique.", "Record revocable interest if invite-only review would be useful. No upload, email, provider call, or charge follows.", "/learn?tool=access#practice", "Review access options", "Revocable access interest");
  }

  const activity = [
    ...input.sampleProgress.map((item) => ({ type: "sample" as const, label: "Sample critique practice", category: null, at: item.updatedAt })),
    ...input.selfReviews.map((item) => ({ type: "self-review" as const, label: item.status === "completed" ? "Self-review completed" : "Self-review draft", category: item.category, at: item.updatedAt })),
    ...input.briefs.map((item) => ({ type: "brief" as const, label: item.status === "ready" ? "Design brief ready" : "Design brief draft", category: item.category, at: item.updatedAt })),
    ...(input.access ? [{ type: "access" as const, label: `Review access ${input.access.status}`, category: input.access.preferredCategory, at: input.access.updatedAt }] : []),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at)).slice(0, 5).map((item, index) => ({ ...item, id: `${item.type}-${index + 1}` }));

  return dashboardGuideSchema.parse({ schemaVersion: 1, state, cohort: input.role, nextAction, checklist, completionCount, reviewCount: input.reviewCount, recentActivity: activity });
}

function action(id: DashboardGuide["nextAction"]["id"], eyebrow: string, title: string, description: string, href: string, label: string, artifact: string): DashboardGuide["nextAction"] {
  return { id, eyebrow, title, description, href, label, artifact };
}

function roleTitle(role: GuideInput["role"]) {
  if (role === "freelancer") return "Set up a client-ready learning path.";
  if (role === "ui-ux-designer") return "Set up a product-design learning path.";
  if (role === "beginner-designer") return "Set up a confidence-building learning path.";
  return "Choose the learning path that fits your work.";
}
