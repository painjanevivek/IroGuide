import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve("evals/reviews/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const allowedCategories = new Set(["ui", "website"]);
const allowedStatuses = new Set(["unlabeled", "in-review", "adjudicated", "retired"]);
const ids = new Set();
const errors = [];

if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
if (!Number.isInteger(manifest.targetCaseCount) || manifest.targetCaseCount < 80) errors.push("targetCaseCount must be at least 80.");
if (manifest.adjudication !== "two-reviewers-plus-adjudicator") errors.push("adjudication must use two reviewers plus an adjudicator.");
if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) errors.push("cases must contain at least one owned seed asset.");

for (const testCase of manifest.cases ?? []) {
  if (typeof testCase.id !== "string" || !testCase.id) errors.push("Every case needs a non-empty id.");
  else if (ids.has(testCase.id)) errors.push(`Duplicate case id: ${testCase.id}.`);
  else ids.add(testCase.id);
  if (!allowedCategories.has(testCase.category)) errors.push(`${testCase.id}: category must be ui or website.`);
  if (!allowedStatuses.has(testCase.status)) errors.push(`${testCase.id}: invalid status.`);
  if (typeof testCase.assetPath !== "string" || !testCase.assetPath.startsWith("public/")) errors.push(`${testCase.id}: assetPath must be an owned public asset.`);
  else if (!existsSync(resolve(testCase.assetPath))) errors.push(`${testCase.id}: asset does not exist at ${testCase.assetPath}.`);
}

if (errors.length) {
  console.error("Review evaluation manifest is invalid:\n- " + errors.join("\n- "));
  process.exit(1);
}

const adjudicatedCount = manifest.cases.filter((testCase) => testCase.status === "adjudicated").length;
console.log(`Review evaluation manifest valid: ${manifest.cases.length}/${manifest.targetCaseCount} owned cases registered; ${adjudicatedCount} ready to score.`);
