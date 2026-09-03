import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { evaluationModes, evaluationQualityLevels, supportedReviewCategories, summarizeCoverage, validateCompletedDistribution } from "./lib/review-evaluation-manifest.mjs";

const manifestPath = resolve("evals/reviews/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const allowedCategories = new Set(supportedReviewCategories);
const allowedStatuses = new Set(["unlabeled", "in-review", "adjudicated", "retired"]);
const allowedOwnership = new Set(["purpose-built"]);
const allowedQualityLevels = new Set(evaluationQualityLevels);
const allowedModes = new Set(evaluationModes);
const ids = new Set();
const errors = [];

if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
if (manifest.corpusId !== "iroguide-owned-provider-evaluation-v1") errors.push("corpusId must identify the owned IroGuide evaluation corpus.");
if (typeof manifest.corpusVersion !== "string" || !manifest.corpusVersion) errors.push("corpusVersion is required.");
if (!Number.isInteger(manifest.targetCaseCount) || manifest.targetCaseCount < 80) errors.push("targetCaseCount must be at least 80.");
if (manifest.addedAssetCount !== 77) errors.push("addedAssetCount must record the 77-case owned supplement.");
if (manifest.adjudication !== "two-reviewers-plus-adjudicator") errors.push("adjudication must use two reviewers plus an adjudicator.");
if (manifest.executionPolicy?.providerCalls !== "disabled") errors.push("executionPolicy.providerCalls must remain disabled.");
if (manifest.executionPolicy?.externalAssetSources !== "forbidden") errors.push("executionPolicy.externalAssetSources must remain forbidden.");
if (manifest.executionPolicy?.rendering !== "local-deterministic-sharp") errors.push("executionPolicy.rendering must identify the local renderer.");
if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) errors.push("cases must contain at least one owned seed asset.");

for (const testCase of manifest.cases ?? []) {
  if (typeof testCase.id !== "string" || !testCase.id) errors.push("Every case needs a non-empty id.");
  else if (ids.has(testCase.id)) errors.push(`Duplicate case id: ${testCase.id}.`);
  else ids.add(testCase.id);
  if (!allowedCategories.has(testCase.category)) errors.push(`${testCase.id}: category is not a supported review category.`);
  if (!allowedQualityLevels.has(testCase.qualityLevel)) errors.push(`${testCase.id}: qualityLevel must be strong, mixed, or weak-ambiguous.`);
  if (!Array.isArray(testCase.modes) || !testCase.modes.includes("mentor") || new Set(testCase.modes).size !== testCase.modes.length || testCase.modes.some((mode) => !allowedModes.has(mode))) {
    errors.push(`${testCase.id}: modes must be unique, supported, and always include mentor.`);
  }
  if (!allowedStatuses.has(testCase.status)) errors.push(`${testCase.id}: invalid status.`);
  if (!allowedOwnership.has(testCase.ownership)) errors.push(`${testCase.id}: ownership must be purpose-built for this owned corpus.`);
  if (!testCase.brief || ["audience", "purpose", "style", "goal", "concern"].some((key) => typeof testCase.brief[key] !== "string" || !testCase.brief[key].trim())) {
    errors.push(`${testCase.id}: a complete evaluation brief is required.`);
  }
  if (typeof testCase.artifactDescription !== "string" || !testCase.artifactDescription.trim()) errors.push(`${testCase.id}: artifactDescription is required.`);
  if (typeof testCase.qualityTargetRationale !== "string" || !testCase.qualityTargetRationale.trim()) errors.push(`${testCase.id}: qualityTargetRationale is required.`);
  if (!Array.isArray(testCase.evaluationFocus) || testCase.evaluationFocus.length < 2 || testCase.evaluationFocus.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${testCase.id}: evaluationFocus requires at least two bounded focus areas.`);
  }
  if (!Array.isArray(testCase.constructionNotes?.intendedVisibleTraits) || testCase.constructionNotes.intendedVisibleTraits.length < 2 || testCase.constructionNotes?.notHumanGroundTruth !== true) {
    errors.push(`${testCase.id}: constructionNotes must remain explicitly separate from human ground truth.`);
  }
  const provenance = testCase.provenance;
  if (!provenance || provenance.rightsHolder !== "IroGuide" || provenance.thirdPartyAssets !== false || provenance.externalProviderUsed !== false) {
    errors.push(`${testCase.id}: provenance must truthfully record IroGuide ownership, no third-party assets, and no external provider use.`);
  }
  if (typeof provenance?.rightsStatement !== "string" || !provenance.rightsStatement.trim() || typeof provenance?.creationMethod !== "string" || !provenance.creationMethod.trim() || typeof provenance?.sourceSeed !== "string" || !provenance.sourceSeed.trim()) {
    errors.push(`${testCase.id}: provenance requires rights, creation, and reproducibility details.`);
  }
  if (typeof testCase.assetPath !== "string" || (!testCase.assetPath.startsWith("public/samples/") && !testCase.assetPath.startsWith("evals/reviews/assets/"))) {
    errors.push(`${testCase.id}: assetPath must be an owned seed or evaluation holdout asset.`);
  }
  else if (!existsSync(resolve(testCase.assetPath))) errors.push(`${testCase.id}: asset does not exist at ${testCase.assetPath}.`);
  else {
    const bytes = readFileSync(resolve(testCase.assetPath));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (!/^[a-f0-9]{64}$/.test(testCase.assetSha256 ?? "")) errors.push(`${testCase.id}: assetSha256 must be a lowercase SHA-256 digest.`);
    else if (digest !== testCase.assetSha256) errors.push(`${testCase.id}: asset digest does not match the manifest.`);
    try {
      const metadata = await sharp(bytes, { failOn: "warning", limitInputPixels: 24_000_000 }).metadata();
      if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
        errors.push(`${testCase.id}: asset must decode as a supported bounded image.`);
      }
    } catch {
      errors.push(`${testCase.id}: asset failed safe image decoding.`);
    }
  }
  if (testCase.status === "adjudicated") {
    if (!Array.isArray(testCase.expectedCriteria) || testCase.expectedCriteria.length === 0) errors.push(`${testCase.id}: adjudicated cases require expectedCriteria.`);
    for (const criterion of testCase.expectedCriteria ?? []) {
      if (typeof criterion.rubricId !== "string" || !criterion.rubricId) errors.push(`${testCase.id}: expected criterion needs a rubricId.`);
      if (typeof criterion.evidenceDescription !== "string" || !criterion.evidenceDescription.trim()) errors.push(`${testCase.id}: expected criterion needs visible evidence.`);
      const region = criterion.evidenceRegion;
      if (!region || [region.x, region.y, region.width, region.height].some((value) => typeof value !== "number" || value < 0 || value > 1)) {
        errors.push(`${testCase.id}: expected evidence region must use normalized 0..1 coordinates.`);
      } else if (region.x + region.width > 1 || region.y + region.height > 1 || region.width === 0 || region.height === 0) {
        errors.push(`${testCase.id}: expected evidence region must be non-empty and stay inside the asset.`);
      }
    }
    if (!Array.isArray(testCase.reviewerPseudonyms) || new Set(testCase.reviewerPseudonyms).size < 2) errors.push(`${testCase.id}: adjudication requires two distinct reviewer pseudonyms.`);
    if (typeof testCase.adjudicatorPseudonym !== "string" || !testCase.adjudicatorPseudonym) errors.push(`${testCase.id}: adjudication requires an adjudicator pseudonym.`);
  } else if (testCase.expectedCriteria || testCase.reviewerPseudonyms || testCase.adjudicatorPseudonym) {
    errors.push(`${testCase.id}: non-adjudicated cases cannot claim human labels.`);
  }
}

errors.push(...validateCompletedDistribution(manifest));

if (errors.length) {
  console.error("Review evaluation manifest is invalid:\n- " + errors.join("\n- "));
  process.exit(1);
}

const adjudicatedCount = manifest.cases.filter((testCase) => testCase.status === "adjudicated").length;
console.log(`Review evaluation manifest valid: ${manifest.cases.length}/${manifest.targetCaseCount} owned cases registered; ${adjudicatedCount} ready to score.`);
console.log(`Coverage: ${JSON.stringify(summarizeCoverage(manifest))}`);
