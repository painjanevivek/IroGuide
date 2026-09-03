import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const violations = [];
const forbiddenExtensions = /\.(?:pem|p12|pfx|key)$/i;
const forbiddenEnv = /(^|\/)\.env(?:\.|$)/i;
const textExtensions = /\.(?:cjs|css|env|html|js|json|jsx|md|mjs|mts|ts|tsx|txt|ya?ml)$/i;
const credentialPatterns = [
  { name: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----(?:\r?\n|\\n)[A-Za-z0-9+/=\\r\\n]{80,}-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub personal token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
];

for (const path of tracked) {
  const normalized = path.replaceAll("\\", "/");
  if (forbiddenExtensions.test(normalized)) violations.push(`${normalized}: credential-like file extension is tracked.`);
  if (forbiddenEnv.test(normalized) && normalized !== ".env.example") violations.push(`${normalized}: environment file is tracked.`);
  if (!textExtensions.test(normalized) || normalized === "package-lock.json") continue;
  const content = readFileSync(path, "utf8");
  for (const rule of credentialPatterns) if (rule.pattern.test(content)) violations.push(`${normalized}: ${rule.name} detected.`);
}

if (violations.length > 0) {
  console.error("Repository secret-hygiene violations:\n- " + violations.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(`Repository secret hygiene passed for ${tracked.length} tracked files.`);
}
