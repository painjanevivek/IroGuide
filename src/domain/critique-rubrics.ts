import type { ReviewCategory } from "./review";

export const critiqueRubricVersion = "2026-08-critique-pilot-v1";

export type EvidenceScope = "visible" | "brief" | "visual-risk" | "requires-runtime";

export type GroundedReviewFinding = {
  rubricId: string;
  score: number;
  priority: "high" | "medium" | "low";
  observation: string;
  evidenceKind: Exclude<EvidenceScope, "requires-runtime">;
  evidenceDescription: string;
  impact: string;
  recommendation: string;
  actions: string[];
  confidence: number;
};

export type RubricCriterion = {
  id: string;
  label: string;
  definition: string;
  evidenceScope: EvidenceScope;
  weight: number;
  scoreAnchors: Record<0 | 3 | 5 | 8 | 10, string>;
  severityRules: Record<GroundedReviewFinding["priority"], string>;
  requiredEvidence: readonly string[];
  disallowedClaims: readonly string[];
  sourceReferences: readonly string[];
};

export type CritiqueRubric = {
  category: "ui" | "website";
  version: typeof critiqueRubricVersion;
  criteria: readonly RubricCriterion[];
};

const scoreAnchors = (zero: string, three: string, five: string, eight: string, ten: string) => ({
  0: zero,
  3: three,
  5: five,
  8: eight,
  10: ten,
});

const severityRules = {
  high: "Blocks or seriously misdirects the primary user task.",
  medium: "Materially slows comprehension, confidence, or completion.",
  low: "Refines clarity or polish without materially blocking the task.",
} as const;

const visualRiskDisallowedClaims = [
  "wcag compliant", "wcag conformance", "keyboard", "screen reader", "semantic html", "aria", "focus fails", "responsive behavior",
];

const uiCriteria = [
  criterion("UI-TASK-CLARITY-001", "Task clarity", "The primary task and next useful action are immediately understandable.", "visible", 0.2,
    scoreAnchors("No apparent task or action.", "Task is difficult to infer.", "Task is present but competes with secondary content.", "Task and next action are easy to find.", "Task purpose and next action are unmistakable.")),
  criterion("UI-INFORMATION-HIERARCHY-001", "Information hierarchy", "Content and controls are ordered by the user’s likely need.", "visible", 0.2,
    scoreAnchors("Important information is indistinguishable from supporting content.", "Hierarchy repeatedly competes.", "A usable hierarchy exists but has notable conflicts.", "Priority is clear with minor conflicts.", "Priority is effortless to scan.")),
  criterion("UI-INTERACTION-AFFORDANCE-001", "Interaction affordance", "Visible controls communicate whether they can be clicked, selected, edited, or are static.", "visible", 0.2,
    scoreAnchors("Controls are visually indistinguishable from static content.", "Many controls are ambiguous.", "Some controls require interpretation.", "Controls are consistently recognizable.", "Every important control clearly communicates its purpose.")),
  criterion("UI-SYSTEM-CONSISTENCY-001", "System consistency", "Spacing, typography, color, and component treatment follow a coherent visual system.", "visible", 0.2,
    scoreAnchors("The screen has no visible system.", "Patterns frequently conflict.", "A system exists but has notable exceptions.", "Patterns are coherent with small inconsistencies.", "The system is consistent and supports rapid comprehension.")),
  criterion("UI-VISUAL-ACCESSIBILITY-001", "Visual accessibility risk", "Visible color, text sizing, and non-color cues do not create obvious readability risks.", "visual-risk", 0.2,
    scoreAnchors("Multiple obvious readability risks.", "Important information is difficult to distinguish.", "Some supporting content may be difficult to read.", "Visible readability is strong with minor risks.", "Visible information is highly distinguishable."), visualRiskDisallowedClaims),
] as const;

const websiteCriteria = [
  criterion("WEB-HERO-CLARITY-001", "Hero clarity", "The first viewport explains the offer and its relevance quickly.", "visible", 0.25,
    scoreAnchors("The offer is not apparent.", "The offer requires significant interpretation.", "The offer is present but diluted.", "The offer is clear with minor ambiguity.", "The offer and relevance are immediately clear.")),
  criterion("WEB-NAVIGATION-001", "Navigation", "Visible navigation makes key areas and current orientation understandable.", "visible", 0.15,
    scoreAnchors("Key destinations are not apparent.", "Navigation is difficult to interpret.", "Navigation works visually but lacks prioritization.", "Navigation is clear with minor ambiguity.", "Navigation is clear, focused, and easy to scan.")),
  criterion("WEB-CONVERSION-PATH-001", "Conversion path", "The primary action is visible, credible, and easy to continue.", "visible", 0.25,
    scoreAnchors("No visible primary action.", "Primary action is difficult to find or understand.", "Action is present but competes with secondary actions.", "Primary action is clear with minor friction.", "The next step is clear and well supported.")),
  criterion("WEB-TRUST-001", "Trust signals", "Visible proof, product detail, and tone reduce uncertainty before an important action.", "visible", 0.15,
    scoreAnchors("The page provides no visible basis for trust.", "Trust is weak or contradictory.", "Some proof exists but leaves material uncertainty.", "Trust is credible with minor gaps.", "Proof and detail make the decision feel well supported.")),
  criterion("WEB-VISUAL-ACCESSIBILITY-001", "Visual accessibility risk", "Visible color, text sizing, and non-color cues do not create obvious readability risks.", "visual-risk", 0.2,
    scoreAnchors("Multiple obvious readability risks.", "Important information is difficult to distinguish.", "Some supporting content may be difficult to read.", "Visible readability is strong with minor risks.", "Visible information is highly distinguishable."), visualRiskDisallowedClaims),
] as const;

const rubrics: Record<CritiqueRubric["category"], CritiqueRubric> = {
  ui: { category: "ui", version: critiqueRubricVersion, criteria: uiCriteria },
  website: { category: "website", version: critiqueRubricVersion, criteria: websiteCriteria },
};

const criteriaById = new Map(Object.values(rubrics).flatMap((rubric) => rubric.criteria.map((item) => [item.id, item])));

export function getCritiqueRubric(category: "ui" | "website"): CritiqueRubric;
export function getCritiqueRubric(category: ReviewCategory): CritiqueRubric | undefined;
export function getCritiqueRubric(category: ReviewCategory): CritiqueRubric | undefined {
  return category === "ui" || category === "website" ? rubrics[category] : undefined;
}

export function getRubricCriterion(id: string) {
  return criteriaById.get(id);
}

export function calculateRubricScore(category: ReviewCategory, scores: Record<string, number>) {
  const rubric = getCritiqueRubric(category);
  if (!rubric) return undefined;
  const total = rubric.criteria.reduce((sum, criterion) => sum + (clampScore(scores[criterion.id] ?? 0) * criterion.weight), 0);
  return Math.round(total);
}

export function validateGroundedFindings(category: ReviewCategory, findings: GroundedReviewFinding[]) {
  const rubric = getCritiqueRubric(category);
  if (!rubric) return ["This category is not part of the measurable critique pilot."];

  return findings.flatMap((finding) => validateFinding(rubric, finding));
}

function validateFinding(rubric: CritiqueRubric, finding: GroundedReviewFinding) {
  const criterion = getRubricCriterion(finding.rubricId);
  if (!criterion || !rubric.criteria.some((item) => item.id === finding.rubricId)) {
    return [`Unknown rubric criterion: ${finding.rubricId}.`];
  }
  if (!finding.evidenceDescription.trim()) return [`${finding.rubricId} requires visible or brief evidence.`];

  const allText = [finding.observation, finding.impact, finding.recommendation, ...finding.actions].join(" ").toLowerCase();
  const prohibited = criterion.disallowedClaims.find((claim) => allText.includes(claim));
  if (prohibited) return [`${finding.rubricId} cannot claim ${prohibited}; it requires runtime testing.`];
  if (criterion.evidenceScope === "visual-risk" && finding.evidenceKind !== "visual-risk") {
    return [`${finding.rubricId} must be presented as a visual risk, not a conformance result.`];
  }
  return [];
}

function criterion(
  id: string,
  label: string,
  definition: string,
  evidenceScope: EvidenceScope,
  weight: number,
  anchors: RubricCriterion["scoreAnchors"],
  disallowedClaims: readonly string[] = [],
): RubricCriterion {
  return {
    id,
    label,
    definition,
    evidenceScope,
    weight,
    scoreAnchors: anchors,
    severityRules,
    requiredEvidence: ["Describe a visible region or a stated brief constraint."],
    disallowedClaims,
    sourceReferences: evidenceScope === "visual-risk" ? ["WCAG 2.2 visual guidance; requires runtime verification."] : [],
  };
}

function clampScore(value: number) {
  return Number.isFinite(value) ? Math.min(10, Math.max(0, value)) : 0;
}
