import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workflowsDirectory = resolve(".github/workflows");
const workflowFiles = (await readdir(workflowsDirectory)).filter((file) => /\.ya?ml$/i.test(file));
const violations = [];

for (const file of workflowFiles) {
  const content = await readFile(resolve(workflowsDirectory, file), "utf8");
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)@([^\s#]+)/);
    if (!match) continue;

    const [, action, ref] = match;
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    if (!/^[a-f0-9]{40}$/i.test(ref)) {
      violations.push(`${file}:${index + 1} ${action}@${ref}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Every third-party GitHub Action must be pinned to a full 40-character commit SHA:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Verified immutable SHA pins in ${workflowFiles.length} workflow files.`);
}
