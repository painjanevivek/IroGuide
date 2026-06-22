import type { ImprovementOutput, ImprovementRequest } from "@/domain/improvement";

const targetDirection = {
  "human-designer": "Write this as a precise implementation brief for a professional designer.",
  "image-tool": "Preserve the core subject and content while generating a visually improved alternative.",
  "ui-tool": "Preserve product meaning and interactions while improving the interface system and responsive hierarchy.",
} as const;

export function createDemoImprovement(input: ImprovementRequest): ImprovementOutput {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  const ordered = [...input.review.issues].sort((a, b) => rank[a.priority] - rank[b.priority]);
  return {
    title: "A focused route to the next version",
    steps: ordered.map((issue, index) => ({ order: index + 1, title: `Resolve ${issue.category.toLowerCase()}`, rationale: issue.impact, actions: issue.actions })),
    prompt: `${targetDirection[input.target]} Create a revised design with one unmistakable visual entry point, a disciplined type scale, deliberate negative space, and accessible contrast. Address these critique findings: ${ordered.map((issue) => `${issue.category}: ${issue.recommendation}`).join(" ")} Keep decisions that already work, avoid decoration without purpose, and make every change support the intended audience and primary goal. Return a polished direction plus a concise explanation of each material change.`,
    solvedIssues: ordered.map((issue) => issue.category),
    manualChecks: ["Verify all copy and factual details.", "Check contrast and legibility at final output size.", "Confirm the revision still fits the original audience and goal.", "Review brand, copyright, and production constraints before delivery."],
    provider: "demo",
  };
}
