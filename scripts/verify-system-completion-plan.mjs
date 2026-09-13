import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const sourcePath = "docs/plans/iroguide-system-completion-remediation-plan.md";
const mirrorPath = "specs/002-product-completion/plan.md";
const tasksPath = "specs/002-product-completion/tasks.md";

const [source, mirror, tasks] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(mirrorPath, "utf8"),
  readFile(tasksPath, "utf8"),
]);

const expected = mirror.match(/Canonical SHA-256:\*\* `([a-f0-9]{64})`/)?.[1];
const actual = createHash("sha256").update(source).digest("hex");
if (!expected || expected !== actual) {
  throw new Error(`Canonical plan diverged from its Spec Kit mirror: expected ${expected ?? "missing"}, received ${actual}.`);
}

const canonicalPhases = [...source.matchAll(/^## Phase (\d+)\b/gm)].map((match) => Number(match[1]));
const mirroredPhases = [...tasks.matchAll(/^## Phase (\d+)\b/gm)].map((match) => Number(match[1]));
const expectedPhases = Array.from({ length: 13 }, (_, index) => index);
if (JSON.stringify(canonicalPhases) !== JSON.stringify(expectedPhases)
  || JSON.stringify(mirroredPhases) !== JSON.stringify(expectedPhases)) {
  throw new Error(`Phase mirror mismatch. Canonical=${canonicalPhases.join(",")} mirror=${mirroredPhases.join(",")}.`);
}

console.log(`Verified system completion plan mirror (${actual.slice(0, 12)}, phases 0-12).`);
