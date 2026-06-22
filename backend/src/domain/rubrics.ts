import type { ReviewRequest } from "./review";

export type ReviewDimension = "composition" | "typography" | "color" | "spacing" | "hierarchy" | "readability" | "creativity" | "audienceFit" | "accessibility" | "categoryFit";

export const scoringAnchors = [
  { range: [1, 3], meaning: "Major principle failures prevent the design from meeting its basic purpose." },
  { range: [4, 5], meaning: "The intent is understandable, but weak execution creates substantial friction." },
  { range: [6, 7], meaning: "A credible foundation with noticeable issues that can be corrected deliberately." },
  { range: [8, 9], meaning: "Strong professional work with focused refinements remaining." },
  { range: [10, 10], meaning: "Exceptional execution for the stated brief, with evidence for the score." },
] as const;

const universalDimensions: ReviewDimension[] = ["composition", "typography", "color", "spacing", "hierarchy", "readability", "creativity", "audienceFit", "accessibility", "categoryFit"];

export const categoryRubrics: Record<ReviewRequest["category"], { focus: string; checks: string[]; dimensions: ReviewDimension[] }> = {
  logo: { focus: "A distinctive, scalable identity mark that fits the brand and remains clear across contexts.", checks: ["silhouette and memorability", "small-size legibility", "single-color behavior", "wordmark relationship", "category distinctiveness"], dimensions: universalDimensions },
  poster: { focus: "A distance-readable communication piece with one strong entry point and a reliable information sequence.", checks: ["headline impact", "event-detail scan order", "distance readability", "focal image relationship", "call-to-action clarity"], dimensions: universalDimensions },
  social: { focus: "A mobile-first asset that earns attention quickly without sacrificing message or brand recognition.", checks: ["first-second comprehension", "small-screen type", "safe-zone placement", "platform context", "call-to-action visibility"], dimensions: universalDimensions },
  ui: { focus: "A usable interface whose visual system supports task completion, state clarity, and accessibility.", checks: ["task hierarchy", "interaction affordance", "state communication", "touch targets", "keyboard and contrast accessibility"], dimensions: universalDimensions },
  website: { focus: "A responsive experience with clear navigation, message hierarchy, trust, and conversion path.", checks: ["first-viewport clarity", "navigation model", "responsive composition", "CTA sequence", "content scanability"], dimensions: universalDimensions },
  "book-cover": { focus: "A genre-appropriate, emotionally resonant cover that survives thumbnail display and retail context.", checks: ["title hierarchy", "author placement", "genre signal", "thumbnail readability", "visual hook"], dimensions: universalDimensions },
  packaging: { focus: "A shelf-distinct package that communicates product, brand, hierarchy, and mandatory information.", checks: ["shelf impact", "product identification", "brand recognition", "information hierarchy", "material and print constraints"], dimensions: universalDimensions },
  other: { focus: "A purposeful visual system evaluated against the supplied audience, medium, and intended outcome.", checks: ["purpose clarity", "audience fit", "content hierarchy", "medium constraints", "actionability"], dimensions: universalDimensions },
};

export const modePolicies: Record<ReviewRequest["mode"], { voice: string; depth: string; must: string[]; mustNot: string[] }> = {
  friendly: { voice: "Patient, encouraging, and plain-spoken.", depth: "Explain one principle at a time and define technical language.", must: ["acknowledge evidence-based strengths", "make the first action approachable"], mustNot: ["hide important problems", "use patronizing praise"] },
  mentor: { voice: "Professional, balanced, and precise.", depth: "Explain principles, tradeoffs, and production-ready corrections.", must: ["connect observations to the brief", "prioritize corrections"], mustNot: ["offer generic praise", "overstate subjective preference"] },
  direct: { voice: "Concise, candid, and respectful.", depth: "State unresolved decisions clearly and prescribe the order of repair.", must: ["focus criticism on the work", "retain evidence and reasoning"], mustNot: ["insult the maker", "use humiliation or performative harshness"] },
};

export function getRubricContext(request: ReviewRequest) {
  return { scoringAnchors, category: categoryRubrics[request.category], mode: modePolicies[request.mode] };
}
