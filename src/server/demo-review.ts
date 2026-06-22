import type { ReviewOutput, ReviewRequest } from "@/domain/review";
import { categoryLabels } from "@/domain/review";

const modeLead = {
  friendly: "There is a clear idea worth developing here.",
  mentor: "The concept has a credible foundation, but its visual priorities need a more deliberate system.",
  direct: "The idea is visible, but the execution is not yet disciplined enough to feel finished.",
} as const;

export function createDemoReview(input: ReviewRequest): ReviewOutput {
  const category = categoryLabels[input.category];
  const seed = [...input.file.name].reduce((total, char) => total + char.charCodeAt(0), 0);
  const shift = (seed % 7) / 10;
  const overallScore = Number((6.4 + shift).toFixed(1));

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    overallScore,
    summary: `${modeLead[input.mode]} This ${category.toLowerCase()} review is a deterministic product preview based on the brief for ${input.brief.audience}; connect a vision provider before treating it as analysis of the uploaded pixels.`,
    strengths: [
      `The stated “${input.brief.style}” direction gives the concept a focused starting point.`,
      `The goal—${input.brief.goal}—is specific enough to evaluate design decisions against.`,
      "The composition has room for one clear focal point without requiring more decorative elements.",
    ],
    scores: [
      { label: "Composition", score: Number((6.7 + shift).toFixed(1)) },
      { label: "Typography", score: Number((6.1 + shift).toFixed(1)) },
      { label: "Color", score: Number((7.2 - shift / 2).toFixed(1)) },
      { label: "Hierarchy", score: Number((5.8 + shift).toFixed(1)) },
      { label: "Readability", score: Number((6.9 - shift / 3).toFixed(1)) },
      { label: "Audience fit", score: Number((6.4 + shift / 2).toFixed(1)) },
    ],
    issues: [
      {
        category: "Hierarchy",
        score: 5.8,
        priority: "high",
        observation: "The primary message and supporting elements are likely to compete rather than form a single reading path.",
        impact: `For ${input.brief.audience}, that delays comprehension and weakens the goal to ${input.brief.goal.toLowerCase()}.`,
        recommendation: "Choose one dominant message, reduce secondary contrast, and use spacing to create an unmistakable first-to-last sequence.",
        actions: ["Increase the primary headline scale by 20–25%.", "Reduce secondary element contrast.", "Add one spacing unit around the primary action."],
      },
      {
        category: "Typography",
        score: 6.1,
        priority: "medium",
        observation: "The type system needs a clearer distinction between display, supporting, and utility text.",
        impact: "Without deliberate contrast, the design reads as assembled rather than art-directed.",
        recommendation: "Use one family with a controlled scale and limit emphasis to two weights.",
        actions: ["Define display, body, and caption sizes.", "Use a consistent line-height rhythm.", "Remove redundant bold styling."],
      },
      {
        category: "Accessibility",
        score: 6.6,
        priority: "low",
        observation: "Secondary content should be checked for contrast and small-size legibility in its final context.",
        impact: "Weak contrast excludes users and makes the design fragile across displays and export sizes.",
        recommendation: "Test the final palette and smallest type at the actual output size.",
        actions: ["Run a contrast check.", "Review at 100% export size.", "Avoid color-only status meaning."],
      },
    ],
    checklist: [
      { label: "Create one unmistakable first reading point", priority: "high" },
      { label: "Reduce competing secondary contrast", priority: "high" },
      { label: "Formalize the type scale and weight system", priority: "medium" },
      { label: "Verify contrast at final output size", priority: "low" },
    ],
    followUps: ["What should I fix first?", "Suggest a stronger type direction", "How can I make this feel more premium?"],
    provider: "demo",
  };
}
