import { categoryLabels, type ReviewCategory } from "./review";

export const rubricVersion = "2026-06-iroguide-v1";

export type RubricDimension = {
  label: string;
  guidance: string;
};

export type ReviewRubric = {
  category: ReviewCategory;
  label: string;
  version: typeof rubricVersion;
  dimensions: readonly RubricDimension[];
};

export const reviewRubrics: Record<ReviewCategory, ReviewRubric> = {
  logo: rubric("logo", [
    ["Memorability", "The mark should be recognizable after a short glance."],
    ["Scalability", "The idea should remain clear at favicon, mobile, and large display sizes."],
    ["Distinctiveness", "The form should avoid generic category cues and create an ownable impression."],
    ["Simplicity", "The mark should use only the detail needed to carry the concept."],
    ["Brand fit", "The symbol, type, and tone should align with the intended audience and promise."],
  ]),
  poster: rubric("poster", [
    ["Visual impact", "The poster should create a strong first impression from a distance."],
    ["Composition", "The layout should guide attention through a deliberate visual path."],
    ["Typography", "The type choices should support tone, hierarchy, and readability."],
    ["Distance readability", "The core message should remain legible when viewed quickly or far away."],
    ["Message hierarchy", "Primary, secondary, and supporting information should be clearly ordered."],
  ]),
  social: rubric("social", [
    ["Thumb-stopping clarity", "The post should communicate its hook in the first quick scan."],
    ["Platform fit", "The format, crop, and density should suit the intended social surface."],
    ["Brand consistency", "The post should feel connected to the broader visual identity."],
    ["Call-to-action clarity", "The next action or takeaway should be obvious."],
    ["Mobile readability", "Text and focal elements should hold up on small screens."],
  ]),
  ui: rubric("ui", [
    ["Task clarity", "The screen should make the user's next useful action apparent."],
    ["Information hierarchy", "Content, controls, and states should be ordered by user need."],
    ["Interaction affordance", "Controls should look clickable, selectable, editable, or static as appropriate."],
    ["Consistency", "Spacing, type, color, and component behavior should follow a coherent system."],
    ["Accessibility", "The interface should support contrast, focus, readable sizing, and non-color cues."],
  ]),
  website: rubric("website", [
    ["Hero clarity", "The first viewport should explain the offer and its relevance quickly."],
    ["Navigation", "Users should understand where they are and how to move to key areas."],
    ["Conversion path", "Primary actions should be visible, credible, and easy to continue."],
    ["Trust signals", "Proof, product detail, and tone should reduce uncertainty."],
    ["Responsiveness/accessibility", "The page should remain usable across viewport sizes and assistive needs."],
  ]),
  "book-cover": rubric("book-cover", [
    ["Genre signal", "The cover should quickly communicate the expected shelf or reader category."],
    ["Title readability", "The title should remain legible in thumbnail and full-size contexts."],
    ["Author hierarchy", "Author treatment should match recognition level and market expectations."],
    ["Imagery concept", "The image or visual metaphor should support the book's promise."],
    ["Market fit", "The cover should feel competitive for its intended audience and format."],
  ]),
  packaging: rubric("packaging", [
    ["Shelf impact", "The package should stand out while remaining clear in a retail lineup."],
    ["Product clarity", "The product type, benefit, and usage context should be easy to understand."],
    ["Information hierarchy", "Mandatory and persuasive information should be ordered clearly."],
    ["Material realism", "The design should respect print, surface, and production constraints."],
    ["Brand system", "The package should feel like part of a scalable product family."],
  ]),
  other: rubric("other", [
    ["Purpose clarity", "The design should make its intended role and audience clear."],
    ["Visual hierarchy", "The most important idea should be the easiest to find."],
    ["Craft consistency", "Spacing, alignment, color, and type should feel intentional."],
    ["Audience fit", "The tone should match the people and context described in the brief."],
    ["Practical usability", "The design should work in the real context where it will be used."],
  ]),
};

export function getReviewRubric(category: ReviewCategory): ReviewRubric {
  return reviewRubrics[category];
}

function rubric(category: ReviewCategory, dimensions: readonly [string, string][]): ReviewRubric {
  return {
    category,
    label: categoryLabels[category],
    version: rubricVersion,
    dimensions: dimensions.map(([label, guidance]) => ({ label, guidance })),
  };
}
