import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const allowedDemoRoots = [
  path.normalize("src/app/api/internal/review-lab/"),
  path.normalize("src/app/internal/review-lab/"),
  path.normalize("src/domain/demo-"),
];
const violations = [];

for (const file of await walk(sourceRoot)) {
  const relative = path.relative(process.cwd(), file);
  if (!/\.[cm]?[jt]sx?$/.test(relative) || /\.test\.[jt]sx?$/.test(relative)) continue;
  const source = await readFile(file, "utf8");
  if (/\baiCritique\b/.test(source)) violations.push(`${relative}: obsolete aiCritique capability alias`);
  if (/from\s+["']@\/domain\/demo-|import\(["']@\/domain\/demo-/.test(source)
    && !allowedDemoRoots.some((root) => path.normalize(relative).startsWith(root))) {
    violations.push(`${relative}: production-path demo import`);
  }
}

if (violations.length > 0) throw new Error(`Capability isolation failed:\n${violations.join("\n")}`);
console.log("Verified independent capabilities and development-only demo imports.");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return files.flat();
}
