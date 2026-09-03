import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { buildManifestCases, buildMissingCasePlan, corpusVersion, planAsCsv, renderCaseSvg, seedCases } from "./lib/review-evaluation-corpus.mjs";

const root = resolve(import.meta.dirname, "..");
const missingCases = buildMissingCasePlan();

if (missingCases.length !== 77) throw new Error(`Expected 77 missing cases, received ${missingCases.length}.`);

for (const testCase of missingCases) {
  const outputPath = resolve(root, testCase.assetPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(renderCaseSvg(testCase)), { failOn: "warning", limitInputPixels: 24_000_000 })
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath);
}

const assetDigests = new Map([...seedCases, ...missingCases].map((testCase) => {
  const bytes = readFileSync(resolve(root, testCase.assetPath));
  return [testCase.assetPath, createHash("sha256").update(bytes).digest("hex")];
}));

const manifest = {
  schemaVersion: 1,
  corpusId: "iroguide-owned-provider-evaluation-v1",
  corpusVersion,
  targetCaseCount: 80,
  addedAssetCount: 77,
  adjudication: "two-reviewers-plus-adjudicator",
  executionPolicy: {
    providerCalls: "disabled",
    externalAssetSources: "forbidden",
    rendering: "local-deterministic-sharp",
  },
  cases: buildManifestCases(assetDigests),
};

writeFileSync(resolve(root, "evals/reviews/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(resolve(root, "evals/reviews/corpus-plan.csv"), planAsCsv(missingCases), "utf8");
console.log(`Generated ${missingCases.length} original local assets for corpus ${corpusVersion}; provider calls remain disabled.`);
