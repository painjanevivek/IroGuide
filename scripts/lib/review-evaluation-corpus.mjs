export const corpusVersion = "2026-09-03.1";

export const categoryCatalog = {
  logo: {
    label: "Logo identity board",
    audience: "Independent founders selecting an identity for a new service",
    purpose: "Present a fictional identity mark, wordmark, palette, and small-size application",
    goal: "Judge distinctiveness, hierarchy, legibility, and system coherence from visible evidence",
    focus: ["mark-to-wordmark balance", "small-size legibility", "palette coherence", "distinctive silhouette"],
    names: ["Northloom", "Pollen House", "Kindred Arc", "Morrow Field", "Tandem Vale", "Luma Parcel", "Cedar Signal", "Orbit & Oak", "Quiet Current", "Vela Works"],
  },
  poster: {
    label: "Event poster",
    audience: "People deciding whether to attend a fictional local creative event",
    purpose: "Communicate event theme, date, venue, and one registration action",
    goal: "Judge hierarchy, scan order, logistics clarity, contrast, and action prominence",
    focus: ["headline hierarchy", "event logistics", "registration action", "expressive-type restraint"],
    names: ["Afterlight", "Common Form", "Field Notes", "New Grain", "Open Signal", "Parallel Practice", "Soft Geometry", "Type Assembly", "Visible Rhythm", "Work in Public"],
  },
  social: {
    label: "Social campaign tile",
    audience: "Mobile-first viewers discovering a fictional workshop or community program",
    purpose: "Stop the scroll, explain one offer, and make the next action understandable",
    goal: "Judge focal point, copy density, brand continuity, and conversion clarity",
    focus: ["mobile focal point", "copy density", "campaign continuity", "next-action clarity"],
    names: ["Make Room", "Studio Sprint", "One Good Hour", "Fresh Draft", "Build Together", "Small Wins Club", "Open Desk", "Sunday System", "Better Briefs", "Practice Loop"],
  },
  ui: {
    label: "Product interface screen",
    audience: "Knowledge workers completing a focused task in a fictional web application",
    purpose: "Expose a primary task, supporting status, and clear next action",
    goal: "Judge task clarity, information hierarchy, affordance, consistency, and visual accessibility risk",
    focus: ["primary-task clarity", "control affordance", "status hierarchy", "visible readability risk"],
    names: ["Project intake", "Review queue", "Content calendar", "Research notes", "Team pulse", "Asset library", "Client handoff", "Focus planner", "Feedback inbox", "Launch checklist"],
  },
  website: {
    label: "Website landing viewport",
    audience: "Prospective customers evaluating a fictional product or service",
    purpose: "Explain the offer, establish trust, and direct visitors to one primary action",
    goal: "Judge hero clarity, navigation, conversion path, visible trust, and visual accessibility risk",
    focus: ["offer clarity", "navigation priority", "conversion path", "visible trust support"],
    names: ["Northstar Studio", "Plainwork", "Relay Research", "Gather Grid", "Civic Bloom", "Lantern Labs", "Good Measure", "Woven Cloud", "Trace Garden", "Framehouse"],
  },
  "book-cover": {
    label: "Book cover",
    audience: "Readers browsing a fictional independent-publishing catalogue",
    purpose: "Signal genre, establish title hierarchy, and remain recognizable at thumbnail size",
    goal: "Judge title hierarchy, authorship clarity, mood, contrast, and compositional focus",
    focus: ["thumbnail recognition", "title hierarchy", "author distinction", "genre signaling"],
    names: ["The Quiet Index", "Borrowed Weather", "A Map of Almost", "Night Orchard", "Ways of Seeing Slowly", "The Fifth Window", "Ordinary Satellites", "Notes for Tomorrow", "The Shape of Waiting", "A Useful Distance"],
  },
  packaging: {
    label: "Product packaging concept",
    audience: "Retail shoppers comparing a fictional everyday product on shelf",
    purpose: "Communicate product type, variant, key detail, and recognizable brand",
    goal: "Judge shelf hierarchy, variant clarity, information density, contrast, and system consistency",
    focus: ["product-type clarity", "brand hierarchy", "variant distinction", "shelf readability"],
    names: ["Moss Tea", "Sunday Oats", "Good Grain", "Clear Spring", "Little Ember", "Common Salt", "Daymark Soap", "Field Cocoa", "Soft Citrus", "Still Coffee"],
  },
  other: {
    label: "Information graphic",
    audience: "Visitors using a fictional public program, exhibit, or service",
    purpose: "Organize mixed information and make one route or decision easy to follow",
    goal: "Judge information structure, labeling, visual order, contrast, and ambiguity",
    focus: ["route clarity", "step labeling", "scan order", "decision ambiguity"],
    names: ["Museum wayfinding", "Community timetable", "Festival map", "Workshop menu", "Library guide", "Transit explainer", "Exhibit index", "Public notice", "Service directory", "Learning pathway"],
  },
};

export const seedCases = [
  seedCase("seed-ui-form-together-001", "ui", "public/samples/form-together-friendly.webp", "strong", "Form Together", {
    audience: "People booking a collaborative design workshop",
    purpose: "Explain the workshop and lead visitors toward booking",
    style: "Warm editorial interface with rounded cards and strong display type",
    goal: "Assess task clarity, hierarchy, affordance, consistency, and visible readability",
    concern: "Keep all findings limited to what is visible in the static image",
  }),
  seedCase("seed-website-fieldnote-001", "website", "public/samples/fieldnote-mentor.webp", "mixed", "Fieldnote", {
    audience: "Independent creatives evaluating a fictional field workshop",
    purpose: "Explain the offer and support a registration decision",
    style: "Editorial landing page with natural colors and layered content",
    goal: "Assess hero clarity, navigation, conversion path, trust, and visible readability",
    concern: "Do not infer runtime behavior from the captured viewport",
  }),
  seedCase("seed-website-signal-noise-001", "website", "public/samples/signal-noise-direct.webp", "weak-ambiguous", "Signal / Noise", {
    audience: "Designers considering a fictional typography event",
    purpose: "Communicate the event and make registration understandable",
    style: "Dense experimental typography with high visual energy",
    goal: "Assess hierarchy, conversion path, trust, navigation, and visible readability",
    concern: "Separate deliberate expression from task-blocking ambiguity",
  }),
];

const qualityTargets = [
  ...Array(3).fill("strong"),
  ...Array(4).fill("mixed"),
  ...Array(3).fill("weak-ambiguous"),
];

const palettes = [
  ["#F6F0E5", "#1B2430", "#EF5B3F", "#5B8E7D"],
  ["#EEF4FF", "#17223B", "#5B5FEF", "#FFB84C"],
  ["#FFF7ED", "#312E2B", "#D14D72", "#78A083"],
  ["#F2F7F5", "#183A37", "#F4A261", "#4D7C8A"],
  ["#F7F3FF", "#2B2342", "#805AD5", "#E6A15C"],
  ["#F4F1EA", "#202020", "#1F7A8C", "#E76F51"],
  ["#FFF5F5", "#28262C", "#C44569", "#4C956C"],
  ["#EFF6F3", "#143642", "#0F8B8D", "#EC9A29"],
  ["#F8F5EF", "#283618", "#606C38", "#DDA15E"],
  ["#F3F4F6", "#111827", "#2563EB", "#F97316"],
];

export function buildMissingCasePlan() {
  const planned = [];
  for (const category of Object.keys(categoryCatalog)) {
    const existing = seedCases.filter((testCase) => testCase.category === category);
    const remainingQualities = [...qualityTargets];
    for (const testCase of existing) remainingQualities.splice(remainingQualities.indexOf(testCase.qualityLevel), 1);

    const generated = remainingQualities.map((qualityLevel, index) => {
      const ordinal = existing.length + index + 1;
      const catalog = categoryCatalog[category];
      const name = catalog.names[(ordinal - 1) % catalog.names.length];
      return {
        id: `owned-${category}-${String(ordinal).padStart(3, "0")}`,
        category,
        assetPath: `evals/reviews/assets/${category}/${String(ordinal).padStart(3, "0")}.webp`,
        ownership: "purpose-built",
        qualityLevel,
        modes: ["mentor"],
        status: "unlabeled",
        brief: {
          audience: catalog.audience,
          purpose: catalog.purpose,
          style: styleFor(qualityLevel, ordinal),
          goal: catalog.goal,
          concern: "Evaluate only visible evidence and the supplied brief; do not infer runtime behavior.",
        },
        artifactDescription: `${catalog.label}: ${name}. Original fictional content with no third-party visual inputs.`,
        qualityTargetRationale: qualityRationale(qualityLevel),
        evaluationFocus: rotateFocus(catalog.focus, ordinal),
        constructionNotes: constructionNotes(qualityLevel, ordinal),
        provenance: provenance(`${category}-${ordinal}`),
        generation: {
          generatorVersion: corpusVersion,
          visualSeed: `${category}-${ordinal}`,
          layoutVariant: ((ordinal - 1) % 5) + 1,
          palette: palettes[(ordinal + Object.keys(categoryCatalog).indexOf(category)) % palettes.length],
        },
        displayName: name,
      };
    });

    const targetStrata = 3;
    const existingStrata = existing.filter(isFriendlyDirectStratum);
    let needed = targetStrata - existingStrata.length;
    const coveredQualities = new Set(existingStrata.map((testCase) => testCase.qualityLevel));
    for (const quality of qualityTargets) {
      if (needed === 0 || coveredQualities.has(quality)) continue;
      const candidate = generated.find((testCase) => testCase.qualityLevel === quality && !isFriendlyDirectStratum(testCase));
      if (!candidate) continue;
      candidate.modes = ["mentor", "friendly", "direct"];
      coveredQualities.add(quality);
      needed -= 1;
    }
    for (const candidate of generated) {
      if (needed === 0) break;
      if (!isFriendlyDirectStratum(candidate)) {
        candidate.modes = ["mentor", "friendly", "direct"];
        needed -= 1;
      }
    }
    planned.push(...generated);
  }
  return planned;
}

export function buildManifestCases(assetDigests) {
  const cases = [...seedCases, ...buildMissingCasePlan()].map((testCase) => ({
    ...testCase,
    assetSha256: assetDigests.get(testCase.assetPath),
  }));
  return cases.sort((left, right) => left.category.localeCompare(right.category) || left.id.localeCompare(right.id));
}

export function renderCaseSvg(testCase) {
  const [background, ink, accent, support] = testCase.generation.palette;
  const quality = qualityStyle(testCase.qualityLevel, ink, background);
  const art = renderArtifact(testCase, { background, ink: quality.ink, accent, support, quality });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <rect width="1200" height="900" fill="${background}"/>
    <rect x="32" y="32" width="1136" height="836" rx="30" fill="none" stroke="${ink}" stroke-opacity="0.14" stroke-width="2"/>
    ${art}
  </svg>`;
}

export function planAsCsv(cases = buildMissingCasePlan()) {
  const rows = [["id", "category", "qualityLevel", "mentor", "friendlyDirectStratum", "assetPath", "visualSeed"]];
  for (const testCase of cases) rows.push([
    testCase.id,
    testCase.category,
    testCase.qualityLevel,
    String(testCase.modes.includes("mentor")),
    String(isFriendlyDirectStratum(testCase)),
    testCase.assetPath,
    testCase.generation.visualSeed,
  ]);
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function seedCase(id, category, assetPath, qualityLevel, displayName, brief) {
  return {
    id,
    category,
    assetPath,
    ownership: "purpose-built",
    qualityLevel,
    modes: ["mentor", "friendly", "direct"],
    status: "unlabeled",
    brief,
    artifactDescription: `${categoryCatalog[category].label}: ${displayName}. Existing original IroGuide sample.`,
    qualityTargetRationale: qualityRationale(qualityLevel),
    evaluationFocus: rotateFocus(categoryCatalog[category].focus, 1),
    constructionNotes: constructionNotes(qualityLevel, 1),
    provenance: provenance(`seed-${id}`),
  };
}

function provenance(sourceSeed) {
  return {
    rightsHolder: "IroGuide",
    rightsStatement: "Original IroGuide-created evaluation asset; no third-party visual inputs.",
    creationMethod: "Purpose-built locally from original IroGuide design specifications.",
    sourceSeed,
    thirdPartyAssets: false,
    externalProviderUsed: false,
  };
}

function styleFor(qualityLevel, ordinal) {
  const suffix = ["editorial", "geometric", "humanist", "modernist", "playful"][ordinal % 5];
  if (qualityLevel === "strong") return `Clear ${suffix} system with controlled contrast, spacing, and one dominant action`;
  if (qualityLevel === "mixed") return `${suffix} system with credible structure and a few intentional hierarchy or density conflicts`;
  return `Experimental ${suffix} system with intentionally competing hierarchy, dense grouping, or ambiguous emphasis`;
}

function qualityRationale(qualityLevel) {
  if (qualityLevel === "strong") return "Designed to target a strong case: clear hierarchy, high visible contrast, consistent alignment, and one dominant path.";
  if (qualityLevel === "mixed") return "Designed to target a mixed case: a usable core with bounded hierarchy, density, or consistency tensions.";
  return "Designed to target a weak/ambiguous case: multiple visible signals compete, while the artifact remains decodable enough for grounded critique.";
}

function rotateFocus(focus, ordinal) {
  const offset = (ordinal - 1) % focus.length;
  return [...focus.slice(offset), ...focus.slice(0, offset)];
}

function constructionNotes(qualityLevel, ordinal) {
  const traits = {
    strong: ["controlled hierarchy", "consistent alignment", "high visible contrast", "single dominant action"],
    mixed: ["usable primary structure", "secondary emphasis competition", "uneven spacing rhythm", "bounded density tension"],
    "weak-ambiguous": ["competing focal signals", "reduced visible contrast", "overlapping information groups", "ambiguous action priority"],
  }[qualityLevel];
  const offset = (ordinal - 1) % traits.length;
  return {
    intendedVisibleTraits: [...traits.slice(offset), ...traits.slice(0, offset)],
    notHumanGroundTruth: true,
  };
}

function qualityStyle(level, ink, background) {
  if (level === "strong") return { ink, mutedOpacity: 0.68, titleSize: 86, gap: 30, offset: 0, extra: 0 };
  if (level === "mixed") return { ink, mutedOpacity: 0.48, titleSize: 72, gap: 18, offset: 22, extra: 2 };
  return { ink: mixHex(ink, background, 0.38), mutedOpacity: 0.38, titleSize: 60, gap: 8, offset: 54, extra: 5 };
}

function renderArtifact(testCase, colors) {
  const renderers = { logo: renderLogo, poster: renderPoster, social: renderSocial, ui: renderUi, website: renderWebsite, "book-cover": renderBookCover, packaging: renderPackaging, other: renderOther };
  return renderers[testCase.category](testCase, colors);
}

function renderLogo(testCase, { ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName);
  const shift = quality.offset;
  return `
    <text x="90" y="110" fill="${ink}" font-family="Arial, sans-serif" font-size="18" letter-spacing="4">IDENTITY EXPLORATION / 0${testCase.generation.layoutVariant}</text>
    <g transform="translate(${120 + shift} 185)">
      <circle cx="165" cy="175" r="142" fill="${accent}"/>
      <path d="M80 210 L165 65 L250 210 Z" fill="none" stroke="${ink}" stroke-width="${quality.extra + 18}"/>
      <circle cx="165" cy="175" r="36" fill="${support}"/>
    </g>
    <text x="475" y="330" fill="${ink}" font-family="Arial, sans-serif" font-size="${quality.titleSize}" font-weight="700" letter-spacing="-3">${name}</text>
    <text x="480" y="380" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="23" letter-spacing="3">TOOLS FOR THOUGHTFUL WORK</text>
    <rect x="480" y="450" width="540" height="3" fill="${ink}" fill-opacity="0.18"/>
    ${swatches(480, 500, [accent, support, ink])}
    <rect x="90" y="650" width="1020" height="145" rx="24" fill="${ink}"/>
    <text x="140" y="738" fill="${quality.extra > 3 ? support : "#FFFFFF"}" font-family="Arial, sans-serif" font-size="42" font-weight="700">${name}</text>
    <circle cx="1020" cy="722" r="38" fill="${accent}"/>
    ${quality.extra ? `<text x="720" y="592" fill="${accent}" font-size="${24 + quality.extra * 2}" font-family="Arial, sans-serif">NEW / KIND / CLEAR / OPEN</text>` : ""}`;
}

function renderPoster(testCase, { ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName).toUpperCase();
  const y = 270 + quality.offset;
  return `
    <rect x="90" y="80" width="1020" height="740" rx="10" fill="${ink}"/>
    <circle cx="${880 - quality.offset}" cy="${260 + quality.offset}" r="190" fill="${accent}"/>
    <circle cx="930" cy="640" r="110" fill="none" stroke="${support}" stroke-width="26"/>
    <text x="150" y="145" fill="#FFFFFF" fill-opacity="0.76" font-family="Arial, sans-serif" font-size="18" letter-spacing="5">A FICTIONAL CREATIVE ASSEMBLY</text>
    <text x="${145 + quality.offset}" y="${y}" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="${quality.titleSize + 16}" font-weight="800" letter-spacing="-4">${name}</text>
    <text x="150" y="${y + 90}" fill="#FFFFFF" fill-opacity="${quality.mutedOpacity + 0.2}" font-family="Arial, sans-serif" font-size="28">Ideas, tools, and unfinished work.</text>
    <text x="150" y="680" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="36" font-weight="700">18 OCT / 10:00</text>
    <text x="150" y="728" fill="#FFFFFF" fill-opacity="0.7" font-family="Arial, sans-serif" font-size="24">COMMON HALL / EAST ROOM</text>
    <rect x="150" y="758" width="250" height="44" rx="22" fill="${accent}"/>
    <text x="180" y="787" fill="${ink}" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">RESERVE A SEAT</text>
    ${quality.extra ? `<text x="${500 + quality.offset}" y="${500 + quality.offset}" fill="${support}" font-family="Arial, sans-serif" font-size="${30 + quality.extra * 3}" transform="rotate(-8 600 500)">OPEN / MAKE / SHARE / LEARN</text>` : ""}`;
}

function renderSocial(testCase, { background, ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName);
  return `
    <rect x="210" y="70" width="780" height="760" rx="38" fill="#FFFFFF"/>
    <rect x="250" y="110" width="700" height="470" rx="28" fill="${accent}"/>
    <circle cx="${760 - quality.offset}" cy="${300 + quality.offset}" r="165" fill="${support}"/>
    <path d="M290 500 C430 260 600 250 910 430" fill="none" stroke="${ink}" stroke-width="${18 + quality.extra * 3}"/>
    <text x="300" y="220" fill="${ink}" font-family="Arial, sans-serif" font-size="${quality.titleSize}" font-weight="800" letter-spacing="-3">${name}</text>
    <text x="300" y="${290 + quality.offset}" fill="${ink}" fill-opacity="${quality.mutedOpacity + 0.2}" font-family="Arial, sans-serif" font-size="26">A practical session for better work.</text>
    <text x="270" y="645" fill="${ink}" font-family="Arial, sans-serif" font-size="30" font-weight="700">THURSDAY / 6 PM</text>
    <text x="270" y="695" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="22">Bring one draft. Leave with one clear next step.</text>
    <rect x="270" y="735" width="250" height="54" rx="27" fill="${ink}"/>
    <text x="310" y="769" fill="${background}" font-family="Arial, sans-serif" font-size="18" font-weight="700">SAVE YOUR PLACE</text>
    ${quality.extra ? `<rect x="585" y="720" width="310" height="72" rx="10" fill="${support}"/><text x="612" y="763" fill="${ink}" font-family="Arial, sans-serif" font-size="22">FREE / LIMITED / NEW</text>` : ""}`;
}

function renderUi(testCase, { background, ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName);
  return `
    <rect x="70" y="70" width="1060" height="760" rx="28" fill="#FFFFFF" stroke="${ink}" stroke-opacity="0.18" stroke-width="2"/>
    <rect x="70" y="70" width="1060" height="62" rx="28" fill="${ink}"/>
    <circle cx="112" cy="101" r="9" fill="${accent}"/><circle cx="140" cy="101" r="9" fill="${support}"/><circle cx="168" cy="101" r="9" fill="${background}"/>
    <rect x="70" y="132" width="230" height="698" fill="${background}"/>
    ${navRows(105, 190, ink, accent, quality)}
    <text x="355" y="210" fill="${ink}" font-family="Arial, sans-serif" font-size="${quality.titleSize - 26}" font-weight="700">${name}</text>
    <text x="355" y="250" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="20">12 items need a decision before Friday.</text>
    <rect x="${890 - quality.offset}" y="172" width="180" height="52" rx="14" fill="${accent}"/>
    <text x="925" y="205" fill="${ink}" font-family="Arial, sans-serif" font-size="17" font-weight="700">NEW ITEM</text>
    ${uiCards(350, 300 + quality.offset, ink, accent, support, quality)}
    ${quality.extra ? `<rect x="${720 - quality.offset}" y="${610 - quality.offset}" width="340" height="130" rx="12" fill="${support}"/><text x="750" y="662" fill="${ink}" font-family="Arial, sans-serif" font-size="23">SYNC PAUSED</text><text x="750" y="700" fill="${ink}" font-family="Arial, sans-serif" font-size="17">Resolve 3 updates to continue.</text>` : ""}`;
}

function renderWebsite(testCase, { background, ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName);
  return `
    <rect x="55" y="55" width="1090" height="790" rx="24" fill="#FFFFFF"/>
    <rect x="55" y="55" width="1090" height="58" rx="24" fill="${ink}"/>
    <circle cx="92" cy="84" r="8" fill="${accent}"/><circle cx="118" cy="84" r="8" fill="${support}"/>
    <text x="115" y="180" fill="${ink}" font-family="Arial, sans-serif" font-size="26" font-weight="800">${name}</text>
    <text x="680" y="180" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="17">WORK</text>
    <text x="780" y="180" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="17">METHOD</text>
    <text x="900" y="180" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="17">ABOUT</text>
    <rect x="100" y="225" width="1000" height="510" rx="24" fill="${background}"/>
    <text x="150" y="${355 + quality.offset}" fill="${ink}" font-family="Arial, sans-serif" font-size="${quality.titleSize}" font-weight="800" letter-spacing="-4">Make complex work</text>
    <text x="150" y="${445 + quality.offset}" fill="${accent}" font-family="Arial, sans-serif" font-size="${quality.titleSize}" font-weight="800" letter-spacing="-4">feel clear.</text>
    <text x="155" y="${515 + quality.offset}" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="24">A fictional studio for teams shaping useful services.</text>
    <rect x="155" y="${565 + quality.offset}" width="210" height="60" rx="30" fill="${ink}"/>
    <text x="190" y="${603 + quality.offset}" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="18" font-weight="700">START A PROJECT</text>
    <circle cx="890" cy="430" r="170" fill="${support}"/><rect x="810" y="345" width="170" height="170" rx="34" fill="${accent}" transform="rotate(${quality.extra * 4} 895 430)"/>
    <text x="155" y="790" fill="${ink}" fill-opacity="0.58" font-family="Arial, sans-serif" font-size="18">TRUSTED BY FICTIONAL TEAMS / 24 PROJECTS / 6 DISCIPLINES</text>
    ${quality.extra ? `<text x="${530 - quality.offset}" y="${650 - quality.offset}" fill="${accent}" font-family="Arial, sans-serif" font-size="${26 + quality.extra * 2}">SEE WORK / BOOK CALL / GET GUIDE</text>` : ""}`;
}

function renderBookCover(testCase, { ink, accent, support, quality }) {
  const title = escapeXml(testCase.displayName).toUpperCase();
  return `
    <rect x="300" y="60" width="600" height="780" rx="4" fill="${ink}"/>
    <rect x="335" y="95" width="530" height="710" fill="none" stroke="${accent}" stroke-width="3"/>
    <circle cx="600" cy="${480 + quality.offset}" r="${175 + quality.extra * 8}" fill="${support}"/>
    <circle cx="${570 - quality.offset}" cy="440" r="115" fill="${accent}" fill-opacity="0.82"/>
    <text x="380" y="${235 + quality.offset}" fill="#FFFFFF" font-family="Georgia, serif" font-size="${quality.titleSize - 10}" font-weight="700" letter-spacing="-2">${title}</text>
    <text x="385" y="${300 + quality.offset}" fill="#FFFFFF" fill-opacity="${quality.mutedOpacity + 0.2}" font-family="Arial, sans-serif" font-size="22" letter-spacing="4">A FICTIONAL NOVEL</text>
    <text x="385" y="750" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="27" font-weight="700">MARA VALE</text>
    ${quality.extra ? `<text x="${430 + quality.offset}" y="${620 - quality.offset}" fill="#FFFFFF" fill-opacity="0.55" font-family="Georgia, serif" font-size="${30 + quality.extra * 3}" transform="rotate(-11 560 620)">MEMORY / PLACE / RETURN</text>` : ""}`;
}

function renderPackaging(testCase, { ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName).toUpperCase();
  return `
    <ellipse cx="600" cy="790" rx="330" ry="40" fill="${ink}" fill-opacity="0.12"/>
    <path d="M330 170 L760 115 L900 230 L470 290 Z" fill="${support}"/>
    <path d="M330 170 L470 290 L470 750 L330 620 Z" fill="${accent}"/>
    <path d="M470 290 L900 230 L900 690 L470 750 Z" fill="#FFFFFF" stroke="${ink}" stroke-opacity="0.15"/>
    <circle cx="${690 + quality.offset}" cy="430" r="135" fill="${accent}"/>
    <text x="525" y="${365 + quality.offset}" fill="${ink}" font-family="Arial, sans-serif" font-size="${quality.titleSize - 18}" font-weight="800">${name}</text>
    <text x="530" y="${415 + quality.offset}" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="22">EVERYDAY / ORIGINAL</text>
    <text x="530" y="620" fill="${ink}" font-family="Arial, sans-serif" font-size="26" font-weight="700">NET 250 G</text>
    <text x="530" y="660" fill="${ink}" fill-opacity="0.58" font-family="Arial, sans-serif" font-size="18">MADE FOR SLOW MORNINGS</text>
    ${quality.extra ? `<text x="${585 - quality.offset}" y="${540 - quality.offset}" fill="${support}" font-family="Arial, sans-serif" font-size="${24 + quality.extra * 3}">NEW / PURE / DAILY / KIND</text>` : ""}`;
}

function renderOther(testCase, { background, ink, accent, support, quality }) {
  const name = escapeXml(testCase.displayName).toUpperCase();
  return `
    <text x="95" y="120" fill="${ink}" font-family="Arial, sans-serif" font-size="19" letter-spacing="4">PUBLIC INFORMATION / FICTIONAL SERVICE</text>
    <text x="95" y="${225 + quality.offset}" fill="${ink}" font-family="Arial, sans-serif" font-size="${quality.titleSize}" font-weight="800">${name}</text>
    <rect x="95" y="275" width="1010" height="2" fill="${ink}" fill-opacity="0.18"/>
    ${infoRow(95, 330 + quality.offset, "01", "ARRIVE", "Find the welcome desk and collect a day pass.", accent, ink, quality)}
    ${infoRow(95 + quality.offset, 465 + quality.offset, "02", "CHOOSE", "Pick one route based on time and access needs.", support, ink, quality)}
    ${infoRow(95 - quality.offset / 2, 600 + quality.offset, "03", "CONTINUE", "Follow the matching color and room number.", accent, ink, quality)}
    <rect x="820" y="720" width="285" height="72" rx="18" fill="${ink}"/>
    <text x="865" y="765" fill="${background}" font-family="Arial, sans-serif" font-size="19" font-weight="700">OPEN THE GUIDE</text>
    ${quality.extra ? `<text x="180" y="780" fill="${accent}" font-family="Arial, sans-serif" font-size="${24 + quality.extra * 3}">TODAY / EAST / LEVEL 2 / START HERE</text>` : ""}`;
}

function swatches(x, y, colors) {
  return colors.map((color, index) => `<rect x="${x + index * 105}" y="${y}" width="82" height="82" rx="18" fill="${color}"/>`).join("");
}

function navRows(x, y, ink, accent, quality) {
  return ["OVERVIEW", "INBOX", "PROJECTS", "ARCHIVE"].map((label, index) => `<rect x="${x}" y="${y + index * 72}" width="160" height="44" rx="12" fill="${index === quality.extra % 4 ? accent : ink}" fill-opacity="${index === quality.extra % 4 ? 1 : 0.07}"/><text x="${x + 20}" y="${y + 28 + index * 72}" fill="${ink}" font-family="Arial, sans-serif" font-size="15" font-weight="700">${label}</text>`).join("");
}

function uiCards(x, y, ink, accent, support, quality) {
  return [0, 1, 2].map((index) => `<g transform="translate(${x + index * (230 - quality.extra * 5)} ${y + (index % 2) * quality.offset})"><rect width="205" height="220" rx="18" fill="${index === 1 ? support : "#F7F7F7"}"/><circle cx="36" cy="38" r="15" fill="${index === 2 ? accent : ink}"/><text x="24" y="92" fill="${ink}" font-family="Arial, sans-serif" font-size="18" font-weight="700">ITEM ${String(index + 1).padStart(2, "0")}</text><rect x="24" y="118" width="150" height="10" rx="5" fill="${ink}" fill-opacity="0.18"/><rect x="24" y="145" width="115" height="10" rx="5" fill="${ink}" fill-opacity="0.11"/><rect x="24" y="180" width="74" height="24" rx="12" fill="${accent}"/></g>`).join("");
}

function infoRow(x, y, number, title, copy, color, ink, quality) {
  return `<g transform="translate(${x} ${y})"><circle cx="46" cy="46" r="46" fill="${color}"/><text x="25" y="56" fill="${ink}" font-family="Arial, sans-serif" font-size="28" font-weight="800">${number}</text><text x="125" y="36" fill="${ink}" font-family="Arial, sans-serif" font-size="30" font-weight="800">${title}</text><text x="125" y="72" fill="${ink}" fill-opacity="${quality.mutedOpacity}" font-family="Arial, sans-serif" font-size="20">${copy}</text></g>`;
}

function isFriendlyDirectStratum(testCase) {
  return testCase.modes.includes("friendly") && testCase.modes.includes("direct");
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function mixHex(foreground, background, ratio) {
  const parse = (hex) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const [fr, fg, fb] = parse(foreground);
  const [br, bg, bb] = parse(background);
  const channel = (front, back) => Math.round(front * (1 - ratio) + back * ratio).toString(16).padStart(2, "0");
  return `#${channel(fr, br)}${channel(fg, bg)}${channel(fb, bb)}`;
}
