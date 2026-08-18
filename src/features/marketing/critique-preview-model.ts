export type CritiqueBeat = {
  id: "capture" | "focus" | "refine";
  label: string;
  title: string;
  copy: string;
  outcome: string;
  x: number;
  y: number;
  glyph: string;
};

export const critiqueBeats = [
  {
    id: "capture",
    label: "Read the context",
    title: "Start with the evidence",
    copy: "This illustrative example begins with the layout, type, contrast, and stated goal before assigning a judgment.",
    outcome: "Outcome: identify the first visual decision worth discussing.",
    x: 145,
    y: 160,
    glyph: "M0 -34 12 -8 40 -6 18 12 24 40 0 24 -24 40 -18 12 -40 -6 -12 -8Z",
  },
  {
    id: "focus",
    label: "Locate friction",
    title: "Find what slows the read",
    copy: "This illustrative example isolates the choice competing for attention, then connects it to hierarchy and audience fit.",
    outcome: "Outcome: turn a vague reaction into one clear priority.",
    x: 330,
    y: 255,
    glyph: "M-40 -8 H-8 V-40 H8 V-8 H40 V8 H8 V40 H-8 V8 H-40Z",
  },
  {
    id: "refine",
    label: "Plan the revision",
    title: "Make the next move",
    copy: "This illustrative example converts the observation into a short revision direction while keeping the designer in control.",
    outcome: "Outcome: leave with a practical change to test next.",
    x: 545,
    y: 145,
    glyph: "M0 -40 C22 -40 40 -22 40 0 S22 40 0 40 -40 22 -40 0 -22 -40 0 -40Z M-14 -3 0 13 20 -15",
  },
] as const satisfies readonly CritiqueBeat[];

export function clampCritiqueBeatIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(critiqueBeats.length - 1, Math.round(index)));
}

export function getCritiqueBeat(index: number): CritiqueBeat {
  return critiqueBeats[clampCritiqueBeatIndex(index)];
}
