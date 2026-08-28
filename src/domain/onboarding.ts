import type { AccountExperience } from "./product-activation";

export type OnboardingRole = NonNullable<AccountExperience["primaryRole"]>;
export type OnboardingGoal = NonNullable<AccountExperience["primaryGoal"]>;

export const roleOptions = [
  { id: "beginner-designer", label: "Beginner designer", description: "Build a repeatable critique habit without jargon." },
  { id: "freelancer", label: "Freelancer", description: "Check work clearly before a client handoff." },
  { id: "ui-ux-designer", label: "UI/UX designer", description: "Strengthen hierarchy, clarity, consistency, and accessibility." },
  { id: "other", label: "Something else", description: "Use the same standards with a flexible learning path." },
] as const satisfies ReadonlyArray<{ id: OnboardingRole; label: string; description: string }>;

export const goalOptions = [
  { id: "learn-principles", label: "Learn critique principles" },
  { id: "pre-client-check", label: "Check work before handoff" },
  { id: "improve-ui", label: "Improve UI and UX decisions" },
  { id: "build-portfolio", label: "Explain work in a portfolio" },
  { id: "other", label: "Another goal" },
] as const satisfies ReadonlyArray<{ id: OnboardingGoal; label: string }>;

export const categoryOptions = [
  ["logo", "Logo"], ["poster", "Poster"], ["social", "Social"], ["ui", "UI"],
  ["website", "Website"], ["book-cover", "Book cover"], ["packaging", "Packaging"], ["other", "Other"],
] as const;

export const critiqueStyleOptions = [
  { id: "friendly", label: "Friendly", description: "Encouraging language with a gentle first step." },
  { id: "mentor", label: "Mentor", description: "Balanced teaching with evidence and practical direction." },
  { id: "direct", label: "Direct", description: "Concise priorities with minimal framing." },
] as const;

export function getRecommendedCritiqueStyle(role: OnboardingRole | null) {
  if (role === "beginner-designer") return "friendly" as const;
  if (role === "freelancer") return "direct" as const;
  return "mentor" as const;
}

export function getRecommendedSample(role: OnboardingRole | null) {
  if (role === "freelancer") return "signal-noise-direct" as const;
  if (role === "ui-ux-designer") return "fieldnote-mentor" as const;
  return "form-together-friendly" as const;
}

export function getCohortWelcome(role: OnboardingRole | null) {
  if (role === "freelancer") return "Build a clear pre-handoff critique habit.";
  if (role === "ui-ux-designer") return "Practice evidence-based interface critique.";
  if (role === "beginner-designer") return "Learn what to inspect and why it matters.";
  return "Build a critique habit around the work you want to improve.";
}
