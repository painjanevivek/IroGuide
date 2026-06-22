import { categoryLabels, type ReviewOutput, type ReviewRequest } from "./review";
import { getReviewRubric } from "./rubrics";
import type { ImprovementOutput, ImprovementRequest } from "./improvement";

const demoScorePattern = [6.4, 7.1, 7.5, 7.8, 7.2] as const;

export function createDemoReview(request: ReviewRequest): ReviewOutput {
  const category = categoryLabels[request.category];
  const rubric = getReviewRubric(request.category);
  const audience = request.brief.audience.trim();
  const goal = request.brief.goal.trim();
  const style = request.brief.style.trim();
  const primaryConcern = request.brief.concern?.trim();
  const modePrefix = request.mode === "friendly" ? "Clear next step" : request.mode === "direct" ? "Priority fix" : "Mentor note";
  const issueIds = ["primary-read", "purpose-fit", "polish-rhythm"] as const;
  const scoreDimensions = rubric.dimensions.map((dimension, index) => ({
    label: dimension.label,
    score: demoScorePattern[index] ?? 7,
  }));

  return {
    id: `demo-${stableHash(`${request.file.name}:${audience}:${goal}`)}`,
    createdAt: new Date().toISOString(),
    overallScore: 7.2,
    summary: `The ${category.toLowerCase()} has a workable foundation for ${audience}, but ${rubric.dimensions[0].label.toLowerCase()} needs a clearer first read before it can fully support ${goal}.`,
    strengths: [
      `The ${style.toLowerCase()} direction gives the work a recognizable starting point.`,
      `The brief is specific enough to judge the design against audience and purpose.`,
      "The core asset is simple enough to refine without rebuilding the whole concept.",
    ],
    scores: scoreDimensions,
    rubricVersion: rubric.version,
    issues: [
      {
        id: issueIds[0],
        category: rubric.dimensions[0].label,
        score: 6.4,
        priority: "high",
        observation: primaryConcern || "The main idea and supporting details compete for attention.",
        impact: `For ${audience}, the design should communicate the primary promise quickly before style details take over.`,
        recommendation: "Create one dominant entry point, then reduce or simplify the elements around it.",
        actions: [
          "Choose the single element viewers should notice first.",
          "Reduce nearby competing contrast, scale, or spacing by about 20 percent.",
          "Check the design at a small size before adding more detail.",
        ],
      },
      {
        id: issueIds[1],
        category: rubric.dimensions[1].label,
        score: 7,
        priority: "medium",
        observation: `The design direction is promising, but it does not yet make "${goal}" unmistakable.`,
        impact: "A viewer may understand the style before they understand what action or impression the work is meant to create.",
        recommendation: "Tie the strongest visual choice more directly to the intended outcome.",
        actions: [
          "Rewrite the primary message as a short outcome statement.",
          "Remove visual choices that do not support that statement.",
        ],
      },
      {
        id: issueIds[2],
        category: rubric.dimensions[2].label,
        score: 8,
        priority: "low",
        observation: "The composition has enough restraint to be refined through spacing and alignment.",
        impact: "Small consistency fixes can make the work feel more intentional without changing the concept.",
        recommendation: "Use one spacing rhythm and align the most important edges.",
        actions: [
          "Audit margins and internal padding for consistency.",
          "Export one small preview and one full-size preview to compare legibility.",
        ],
      },
    ],
    annotations: [
      {
        id: "annotation-primary-read",
        issueId: issueIds[0],
        label: "First read",
        description: "This area should carry the strongest immediate visual signal.",
        x: 0.24,
        y: 0.22,
        width: 0.42,
        height: 0.24,
        confidence: 0.78,
      },
      {
        id: "annotation-purpose-fit",
        issueId: issueIds[1],
        label: "Goal signal",
        description: "Connect this supporting area more directly to the intended outcome.",
        x: 0.58,
        y: 0.46,
        width: 0.28,
        height: 0.18,
        confidence: 0.68,
      },
      {
        id: "annotation-polish-rhythm",
        issueId: issueIds[2],
        label: "Spacing rhythm",
        description: "Use this region to check edge alignment and spacing consistency.",
        x: 0.14,
        y: 0.66,
        width: 0.48,
        height: 0.2,
        confidence: 0.62,
      },
    ],
    checklist: [
      { label: `${modePrefix}: define the first-read element.`, priority: "high" },
      { label: "Reduce secondary contrast around the focal point.", priority: "high" },
      { label: "Connect the visual hook more directly to the stated goal.", priority: "medium" },
      { label: "Run a small-size legibility check before final export.", priority: "low" },
    ],
    followUps: [
      "What should I simplify first?",
      "How can this better fit the audience?",
      "What would make this feel more polished?",
    ],
    provider: "demo",
  };
}

export function createDemoImprovementPlan(request: ImprovementRequest): ImprovementOutput {
  const highPriorityIssue = request.review.issues.find((issue) => issue.priority === "high") ?? request.review.issues[0];

  return {
    title: "Focused refinement plan",
    steps: [
      {
        order: 1,
        title: "Clarify the first read",
        rationale: highPriorityIssue.impact,
        actions: highPriorityIssue.actions,
      },
      {
        order: 2,
        title: "Rebuild the supporting hierarchy",
        rationale: "Secondary elements should support the main message without creating a second focal point.",
        actions: [
          "Group related supporting details together.",
          "Use one consistent spacing rhythm between groups.",
          "Reduce any decorative element that draws attention before the main idea.",
        ],
      },
      {
        order: 3,
        title: "Validate the final state",
        rationale: "A critique becomes useful only when the next version is checked against the original purpose.",
        actions: [
          "Preview the design at the smallest realistic size.",
          "Ask whether the audience and goal are understandable within five seconds.",
        ],
      },
    ],
    prompt: `Refine this design without changing its core concept. Prioritize the first-read hierarchy, reduce competing secondary elements, preserve the strongest existing visual direction, and make the result clearly support this critique summary: ${request.review.summary}`,
    solvedIssues: request.review.issues.slice(0, 2).map((issue) => issue.category),
    manualChecks: [
      "The primary message is visible first.",
      "The audience and goal are still reflected in the final version.",
      "No new decorative element competes with the focal point.",
    ],
    provider: "demo",
  };
}

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
