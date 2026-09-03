import { ownedSampleCatalog, rubricItemIdsByCategory, type ReviewCategory } from "./product-activation";
import { feedbackModes } from "./review";

type FeedbackMode = (typeof feedbackModes)[number];

export type LearningRole = "beginner-designer" | "freelancer" | "ui-ux-designer";
export type EvidenceRegion = { id: string; label: string; x: number; y: number; width: number; height: number };
export type LearningFinding = {
  id: string;
  actionId: string;
  regionId: string;
  priority: "high" | "medium" | "strength";
  what: string;
  evidence: string;
  why: string;
  how: string;
};
export type LearningSample = {
  id: keyof typeof ownedSampleCatalog;
  version: "v1";
  asset: string;
  width: 1536;
  height: 1024;
  title: string;
  role: LearningRole;
  category: ReviewCategory;
  mode: FeedbackMode;
  ownership: { owner: "IroGuide"; source: "repository-controlled original"; use: "product education" };
  brief: { audience: string; purpose: string; context: string; constraint: string };
  alt: string;
  educationalOutcome: string;
  regions: EvidenceRegion[];
  findings: LearningFinding[];
};

export const learningSamples: readonly LearningSample[] = [
  {
    id: "form-together-friendly",
    version: "v1",
    asset: "/samples/form-together-friendly.webp",
    width: 1536,
    height: 1024,
    title: "Form Together",
    role: "beginner-designer",
    category: "poster",
    mode: "friendly",
    ownership: { owner: "IroGuide", source: "repository-controlled original", use: "product education" },
    brief: {
      audience: "Local adults curious about a community ceramics weekend",
      purpose: "Make the event and booking action understandable in a quick scan",
      context: "Social announcement and studio display poster",
      constraint: "Keep the handmade, tactile character of the event",
    },
    alt: "Ceramics event poster with a large Form Together headline on the left, event details below, and warm pottery photography on the right.",
    educationalOutcome: "Separate a strong first read from the smaller details that still need distance-readability checks.",
    regions: [
      { id: "headline", label: "Large Form Together headline", x: 5, y: 12, width: 47, height: 39 },
      { id: "event-line", label: "Community Ceramics Weekend supporting line", x: 6, y: 52, width: 43, height: 8 },
      { id: "booking", label: "Book a Wheel call to action", x: 6, y: 79, width: 40, height: 13 },
    ],
    findings: [
      { id: "finding-1", actionId: "action-1", regionId: "event-line", priority: "high", what: "The event type becomes fragile at smaller sizes.", evidence: "The supporting line is narrow, widely tracked, and much smaller than the headline.", why: "A viewer may remember the theme but miss what the event actually is when the poster is seen on a phone or from a distance.", how: "Increase the supporting line size slightly and test it at the smallest intended crop before changing the headline." },
      { id: "finding-2", actionId: "action-2", regionId: "booking", priority: "medium", what: "The booking action reads strongly but lacks a destination cue.", evidence: "The blue painted shape looks actionable, yet the poster supplies no URL, QR code, or nearby instruction.", why: "A visually clear action still fails if the next physical step is ambiguous.", how: "Add one concise booking destination beside the call to action and preserve the handmade brush treatment." },
      { id: "finding-3", actionId: "action-3", regionId: "headline", priority: "strength", what: "The headline and photography create an immediate event mood.", evidence: "Oversized condensed type and tactile pottery divide the frame into a clear message-and-context pair.", why: "The viewer can understand the subject before reading the details.", how: "Protect this dominant relationship while improving only the supporting information." },
    ],
  },
  {
    id: "fieldnote-mentor",
    version: "v1",
    asset: "/samples/fieldnote-mentor.webp",
    width: 1536,
    height: 1024,
    title: "Fieldnote",
    role: "ui-ux-designer",
    category: "website",
    mode: "mentor",
    ownership: { owner: "IroGuide", source: "repository-controlled original", use: "product education" },
    brief: {
      audience: "Research leads evaluating a shared qualitative-research workspace",
      purpose: "Explain the promise and make product exploration feel credible",
      context: "Desktop SaaS landing page",
      constraint: "Balance calm editorial character with product specificity",
    },
    alt: "Fieldnote landing page with a large research-focused headline, green actions, a detailed product interface, and a testimonial section.",
    educationalOutcome: "Connect hero clarity, repeated actions, interface evidence, and readability into one conversion-path critique.",
    regions: [
      { id: "hero-copy", label: "Hero promise and supporting copy", x: 3, y: 27, width: 35, height: 31 },
      { id: "primary-actions", label: "Repeated Start a workspace actions", x: 3, y: 3, width: 93, height: 60 },
      { id: "product-ui", label: "Product interface preview", x: 40, y: 13, width: 57, height: 60 },
    ],
    findings: [
      { id: "finding-1", actionId: "action-1", regionId: "primary-actions", priority: "high", what: "Two primary actions compete before product intent is established.", evidence: "Start a workspace appears in both the header and hero with equal green emphasis.", why: "Repeating the same high-commitment action can add noise when a new visitor still needs proof and orientation.", how: "Keep one dominant start action and make the second path an explicit low-commitment product tour." },
      { id: "finding-2", actionId: "action-2", regionId: "product-ui", priority: "medium", what: "The interface proves depth, but its smallest details cannot carry meaning alone.", evidence: "Labels, note metadata, and tags are reduced inside a large screenshot.", why: "Visitors may perceive realism without understanding the most valuable workflow.", how: "Pair the preview with two or three readable callouts tied to the core research tasks." },
      { id: "finding-3", actionId: "action-3", regionId: "hero-copy", priority: "strength", what: "The promise and product view reinforce one another.", evidence: "Research stays connected sits beside a concrete shared-notes interface rather than abstract decoration.", why: "The first viewport links an outcome to believable product evidence.", how: "Retain this outcome-to-interface pairing while simplifying the action hierarchy." },
    ],
  },
  {
    id: "signal-noise-direct",
    version: "v1",
    asset: "/samples/signal-noise-direct.webp",
    width: 1536,
    height: 1024,
    title: "Signal / Noise",
    role: "freelancer",
    category: "poster",
    mode: "direct",
    ownership: { owner: "IroGuide", source: "repository-controlled original", use: "product education" },
    brief: {
      audience: "Electronic music listeners scanning a busy venue listing",
      purpose: "Create recognition first, then make date, venue, and ticket details usable",
      context: "Event poster and social crop",
      constraint: "Keep the abrasive print texture and high-energy visual voice",
    },
    alt: "Black, cream, red, and yellow music event poster with an enormous Signal Noise title and event logistics arranged in a right-hand grid.",
    educationalOutcome: "Pressure-test whether expressive typography still leaves event logistics findable under a fast client-handoff scan.",
    regions: [
      { id: "display-title", label: "Oversized Signal Noise display title", x: 2, y: 2, width: 59, height: 96 },
      { id: "date", label: "Friday 08 November date row", x: 61, y: 47, width: 36, height: 18 },
      { id: "logistics", label: "Doors, venue, and tickets rows", x: 61, y: 65, width: 36, height: 33 },
    ],
    findings: [
      { id: "finding-1", actionId: "action-1", regionId: "logistics", priority: "high", what: "The venue is loud, but the event identity is missing.", evidence: "The poster names the visual theme, date, doors, venue, and ticket price without a performer or program label.", why: "A polished event poster cannot convert if viewers cannot identify what they are being invited to.", how: "Add the performer or series name as the first supporting line before refining any decorative texture." },
      { id: "finding-2", actionId: "action-2", regionId: "date", priority: "medium", what: "The date is legible but splits into too many competing color accents.", evidence: "Friday and November are cream while 08 is yellow, beside red and yellow texture above.", why: "Multiple accents slow the logistics scan and weaken the distinction between date and decoration.", how: "Use one accent for the date group and reserve the other accent for a single conversion detail." },
      { id: "finding-3", actionId: "action-3", regionId: "display-title", priority: "strength", what: "The title owns the composition immediately.", evidence: "The compressed cream and red letterforms fill the left field and remain recognizable at thumbnail size.", why: "The design has a memorable visual asset suitable for a campaign system.", how: "Keep the title scale; repair missing identity and logistics hierarchy around it." },
    ],
  },
] as const;

export type SelfReviewAnswer = "yes" | "no" | "unsure" | "not-applicable";
export type LearningRubricItem = { id: string; label: string; explanation: string; example: string; verify: string };

const rubricLanguage: Record<ReviewCategory, readonly [string, string, string, string][]> = {
  logo: [
    ["Distinctiveness", "The mark should have a form people can distinguish from common category symbols.", "A leaf logo needs a specific silhouette or relationship, not only a generic leaf.", "Hide the name for five seconds and ask what visual detail remains memorable."],
    ["Legibility", "Letters and shapes should remain understandable without visual strain.", "A narrow wordmark can open its spacing before increasing every element.", "View it at the smallest real use and in one color."],
    ["Scalability", "The core idea should survive from favicon to signage.", "Fine interior lines may disappear even when the outer silhouette still works.", "Export at 16, 32, and 128 pixels and compare the same identifying detail."],
    ["Consistency", "Symbol, type, spacing, and tone should feel like one system.", "A soft symbol paired with aggressive type needs a deliberate reason.", "List the repeated shape, spacing, and stroke decisions across lockups."],
  ],
  poster: [
    ["Hierarchy", "A fast glance should reveal what to read first, second, and third.", "The event name leads, followed by date and location.", "Blur or shrink the poster and write down the first three elements you notice."],
    ["Legibility", "Important text should hold up at the intended viewing distance.", "A thin subtitle may need more size or contrast than the display headline.", "Test a phone thumbnail and a print-distance view."],
    ["Contrast", "Text and essential details need enough separation from their background.", "Yellow type over a light photograph can lose its edge.", "Check grayscale and a contrast tool for text-like elements."],
    ["Spacing", "Groups should use space to show which details belong together.", "Date and venue can sit closer to each other than to decorative copy.", "Outline each information group and check whether gaps match meaning."],
  ],
  social: [
    ["Hook", "The first quick scan should reveal one clear reason to stop.", "A single outcome often works better than three equal headlines.", "Show the post for two seconds and ask what message was retained."],
    ["Mobile legibility", "Text and focal details must survive a small feed view.", "A caption embedded in the image may need fewer words and a larger size.", "Preview at the platform's actual mobile width."],
    ["Brand consistency", "The post should belong to the same visual family as nearby content.", "Repeat a stable type, color, or framing rule without cloning every layout.", "Place it beside three existing posts and identify the shared rules."],
    ["Action clarity", "The viewer should know what to do or remember next.", "Save the date is clearer than an unlabeled arrow.", "Cover the caption and see whether the visual still communicates the next step."],
  ],
  ui: [
    ["Hierarchy", "Content and controls should be ordered around the user's current task.", "A destructive secondary action should not compete with Continue.", "Tab and visually scan the screen; record the first action each method suggests."],
    ["Clarity", "Labels and states should explain what will happen before interaction.", "Save draft is clearer than Continue when the next state is not immediate.", "Ask someone to predict each primary control's outcome without clicking."],
    ["Consistency", "Repeated components should behave and look predictably.", "Two cards with the same visual treatment should not have different click areas.", "Compare repeated labels, spacing, states, and keyboard behavior."],
    ["Accessibility", "The interface should work without relying on color, hover, precise pointer use, or small text.", "An error needs text and focus treatment in addition to a red border.", "Use keyboard, 200% zoom, reduced motion, and contrast checks."],
  ],
  website: [
    ["Hierarchy", "The first viewport should make the offer and priority action easy to find.", "One clear headline and one dominant action usually beat several equal promises.", "List what appears first at desktop and mobile widths."],
    ["Navigation", "People should understand where they are and where key paths lead.", "Learning and account actions need stable, descriptive labels.", "Navigate using only the keyboard and verify focus, destination, and return."],
    ["Readability", "Long-form and supporting copy should remain comfortable across widths.", "A narrow measure and clear subheads can improve dense product explanation.", "Inspect at 320 pixels and 200% zoom without horizontal scrolling."],
    ["Action", "Calls to action should match availability and the commitment they require.", "Explore a free example should not be labeled Get my design reviewed.", "Predict each action's destination and compare it with the resulting page."],
  ],
  "book-cover": [
    ["Title", "The title should be readable in both full view and thumbnail.", "A detailed texture may need to quiet behind a narrow title.", "Test the cover at store-thumbnail size and in grayscale."],
    ["Genre", "Visual cues should set an honest expectation for the reader.", "Typography, image, and palette can signal thriller differently from memoir.", "Compare against current titles for the intended shelf without copying them."],
    ["Thumbnail", "One core image-and-title relationship should survive reduction.", "Small endorsements should not carry the main concept.", "View at 80 pixels wide and state what remains recognizable."],
    ["Contrast", "The title and author need stable separation from changing imagery.", "A gradient or quiet field can protect type without flattening the art.", "Sample the lightest and darkest background areas behind essential text."],
  ],
  packaging: [
    ["Hierarchy", "Product, variant, and key benefit should have a deliberate reading order.", "Flavor should not overpower the brand when range recognition matters.", "Simulate a three-second shelf scan and record the first three reads."],
    ["Legibility", "Essential information should survive print size, curve, and distance.", "Condensed copy near a fold may need a wider measure.", "Print at actual size and wrap it around a rough form."],
    ["Shelf impact", "The pack should be noticeable for a reason connected to the product.", "A bold color block can distinguish a variant without hiding product type.", "Place it among five category competitors and compare recognition."],
    ["Trust", "Claims and cues should make the product feel credible and understandable.", "A benefit needs a clear qualifier rather than an unsupported superlative.", "Separate mandatory, factual, and promotional statements and check each source."],
  ],
  other: [
    ["Hierarchy", "The most important message or action should be easiest to find.", "A title should not compete equally with supporting decoration.", "Shrink or blur the work and record the first three visible elements."],
    ["Clarity", "A viewer should understand the purpose without private project context.", "A label can explain whether an object is an invitation, report, or control.", "Show it without explanation and ask what it is for."],
    ["Consistency", "Repeated visual decisions should form a coherent system.", "Similar spacing and type roles can connect otherwise varied sections.", "List the rules that repeat and flag one-off exceptions."],
    ["Purpose", "Every prominent decision should support the audience and intended outcome.", "Decoration can create tone, but should not hide the required message.", "For each prominent element, name the user or business need it supports."],
  ],
};

export function getLearningSample(id: LearningSample["id"]) {
  const sample = learningSamples.find((candidate) => candidate.id === id);
  if (!sample) throw new Error("Unknown learning sample.");
  return sample;
}

export function getSampleForRole(role: string | null | undefined) {
  if (role === "freelancer") return getLearningSample("signal-noise-direct");
  if (role === "ui-ux-designer") return getLearningSample("fieldnote-mentor");
  return getLearningSample("form-together-friendly");
}

export function getLearningRubric(category: ReviewCategory): LearningRubricItem[] {
  return rubricItemIdsByCategory[category].map((id, index) => {
    const [label, explanation, example, verify] = rubricLanguage[category][index];
    return { id, label, explanation, example, verify };
  });
}

export function deriveLearningPriorities(category: ReviewCategory, responses: Array<{ itemId: string; answer: SelfReviewAnswer }>) {
  const byItem = new Map(responses.map((response) => [response.itemId, response.answer]));
  return getLearningRubric(category)
    .filter((item) => byItem.get(item.id) === "no" || byItem.get(item.id) === "unsure")
    .sort((left, right) => Number(byItem.get(left.id) === "unsure") - Number(byItem.get(right.id) === "unsure"))
    .slice(0, 3);
}
