import type { ReviewCategory, ReviewOutput } from "./review";

type ReviewIssue = ReviewOutput["issues"][number];

const accessibilityCategories = new Set<ReviewCategory>(["ui", "website"]);

export function getAccessibilityIssue(category: ReviewCategory): ReviewIssue | null {
  if (!accessibilityCategories.has(category)) {
    return null;
  }

  return {
    id: "accessibility-risk",
    category: "Accessibility",
    score: 6.8,
    priority: "medium",
    observation: "Some text, contrast, and touch-target decisions may become difficult to use in real conditions.",
    impact: "People scanning on small screens or using assistive needs may miss the intended next step even if the visual style feels polished.",
    recommendation: "Check contrast, minimum text size, touch targets, and non-color cues before refining decoration.",
    actions: [
      "Verify key text meets practical contrast against its background.",
      "Keep primary tap targets at least 44 by 44 CSS pixels where possible.",
      "Do not rely on color alone to communicate state or priority.",
    ],
  };
}
