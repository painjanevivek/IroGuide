import type { FollowUpOutput, FollowUpRequest } from "./follow-up";

export function createDemoFollowUp(request: FollowUpRequest): FollowUpOutput {
  const topIssue = request.review.issues.find((issue) => issue.priority === "high") ?? request.review.issues[0];
  const question = request.question.trim();

  return {
    message: {
      id: `follow-up-${stableHash(`${request.review.id}:${question}:${request.messages.length}`)}`,
      role: "assistant",
      createdAt: new Date().toISOString(),
      content: `For this review, I would connect your question back to ${topIssue?.category ?? "the highest-priority issue"}. ${topIssue?.recommendation ?? "Keep the next change focused on the clearest critique action."} A useful next move is: ${topIssue?.actions[0] ?? "make one focused revision and compare it against the original goal."}`,
    },
    suggestedQuestions: [
      "Explain the top issue more simply.",
      "Give me three alternate directions.",
      "What should I change first in Figma?",
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
