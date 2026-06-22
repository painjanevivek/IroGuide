export type PlanId = "free" | "pro" | "freelancer" | "studio";
export type Plan = { id: PlanId; name: string; audience: string; monthlyPrice: number | null; reviews: number | null; followUpsPerReview: number | null; historyDays: number | null; features: string[]; highlighted?: boolean };

export const plans: Plan[] = [
  { id: "free", name: "Free", audience: "Explore the critique workflow", monthlyPrice: 0, reviews: 3, followUpsPerReview: 0, historyDays: 30, features: ["3 structured reviews / month", "Friendly and Mentor modes", "30-day review history", "Improvement checklist"] },
  { id: "pro", name: "Pro", audience: "Build a consistent design practice", monthlyPrice: 19, reviews: 30, followUpsPerReview: 5, historyDays: null, highlighted: true, features: ["30 reviews / month", "All feedback modes", "5 follow-ups per review", "Full review history", "Improvement plans and prompts", "Progress insights"] },
  { id: "freelancer", name: "Freelancer", audience: "Pressure-test work before delivery", monthlyPrice: 39, reviews: 80, followUpsPerReview: 10, historyDays: null, features: ["80 reviews / month", "10 follow-ups per review", "Client-ready critique export", "Portfolio case-study tools", "Priority review queue", "Commercial workspaces"] },
  { id: "studio", name: "Studio", audience: "Create a shared critique system", monthlyPrice: null, reviews: null, followUpsPerReview: null, historyDays: null, features: ["Flexible review volume", "Shared team projects", "Brand guideline context", "Roles and administration", "Centralized billing", "Security review and support"] },
];

export function canUse(plan: Plan, usage: { reviews: number; followUps: number }, feature: "review" | "follow-up") {
  if (feature === "review") return plan.reviews === null || usage.reviews < plan.reviews;
  return plan.followUpsPerReview === null || usage.followUps < plan.followUpsPerReview;
}
