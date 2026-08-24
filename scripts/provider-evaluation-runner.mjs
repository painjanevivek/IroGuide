import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildProviderEvaluationArtifacts } from "./lib/provider-evaluation-runner.mjs";

const inputPath = getArgument("--input");
const outputPrefix = getArgument("--output-prefix");
if (!inputPath || !outputPrefix) {
  console.error("Usage: node scripts/provider-evaluation-runner.mjs --input <results.json> --output-prefix <path>");
  process.exit(1);
}

const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
const artifacts = buildProviderEvaluationArtifacts(input);
const resolvedPrefix = resolve(outputPrefix);
mkdirSync(dirname(resolvedPrefix), { recursive: true });
writeJson(`${resolvedPrefix}.blind.json`, artifacts.blindReviewSheet);
writeJson(`${resolvedPrefix}.summary.json`, artifacts.summary);
console.log(`Provider evaluation artifacts written with result hash ${artifacts.summary.resultHash}.`);

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
