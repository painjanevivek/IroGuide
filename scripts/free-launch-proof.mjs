import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const mode = process.argv.includes("--local") ? "local" : "preflight";
const checkedAt = new Date().toISOString();
const runId = checkedAt.replace(/[:.]/g, "-");
const evidenceRoot = resolve(process.env.FREE_LAUNCH_EVIDENCE_DIR ?? "artifacts/free-launch-proof", `${mode}-${runId}`);

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const sourceState = await readSourceState();
  const preflight = buildPreflight(sourceState);
  await writeJson(resolve(evidenceRoot, "preflight.json"), preflight);
  await writeFile(resolve(evidenceRoot, "manual-device-evidence.md"), manualDeviceTemplate(sourceState), "utf8");

  if (mode === "preflight") {
    printPreflight(preflight);
    console.log(`Preflight evidence: ${resolve(evidenceRoot, "preflight.json")}`);
    console.log(`Physical-device evidence template: ${resolve(evidenceRoot, "manual-device-evidence.md")}`);
    return;
  }

  const commands = [
    {
      name: "security-and-release-contracts",
      args: ["run", "test", "--", "scripts/release-smoke.test.mjs", "src/server/firebase-admin.test.ts", "src/server/staging-release-proof.test.ts"],
    },
    {
      name: "accessibility-and-device-emulation",
      args: ["run", "test:e2e:proof"],
      env: { FREE_LAUNCH_PLAYWRIGHT_REPORT: resolve(evidenceRoot, "accessibility-device.json") },
    },
  ];
  const results = [];
  for (const command of commands) results.push(await runCommand(command));

  const report = {
    checkedAt,
    evidenceRoot,
    mode,
    ok: results.every((result) => result.ok),
    results,
    ...sourceState,
  };
  await writeJson(resolve(evidenceRoot, "local-proof.json"), report);
  console.log(`Local free-launch proof: ${report.ok ? "PASS" : "FAIL"}`);
  console.log(`Local evidence: ${resolve(evidenceRoot, "local-proof.json")}`);
  if (!report.ok) process.exitCode = 1;
}

function buildPreflight(sourceState) {
  const deploymentVariables = [
    "IROGUIDE_STAGING_PROOF_SECRET",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "IROGUIDE_ADMIN_UIDS",
    "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 or equivalent Admin credentials",
    "FIREBASE_ADMIN_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  ];
  const localVariables = ["SMOKE_BASE_URL", "IROGUIDE_STAGING_PROOF_SECRET"];
  return {
    checkedAt,
    evidenceRoot,
    groups: [
      { drill: "local security contracts", execution: "automated-local", ready: true, requiredInputs: [] },
      { drill: "accessibility/device emulation", execution: "automated-local", ready: true, requiredInputs: [] },
      {
        drill: "privileged readiness + verified account + Storage + token revocation",
        execution: "credentialed-preview",
        ready: localVariables.every(hasEnv),
        requiredInputs: localVariables.map(envState),
        deploymentInputs: deploymentVariables,
      },
      {
        drill: "real iOS/Android + assistive technology",
        execution: "operator-physical-device",
        ready: false,
        requiredInputs: ["physical iOS Safari device", "physical Android Chrome device", "VoiceOver or TalkBack operator"],
      },
    ],
    mode,
    note: "Presence is recorded by variable name only; values are never captured.",
    ...sourceState,
  };
}

async function runCommand(command) {
  const startedAt = new Date().toISOString();
  const npmCli = process.env.npm_execpath?.trim();
  const executable = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = npmCli ? [npmCli, ...command.args] : command.args;
  const child = spawn(executable, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...command.env },
    shell: false,
  });
  let output = "";
  child.stdout.on("data", (chunk) => { const text = chunk.toString(); output += text; process.stdout.write(text); });
  child.stderr.on("data", (chunk) => { const text = chunk.toString(); output += text; process.stderr.write(text); });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.on("error", reject);
    child.on("close", resolveExit);
  });
  const logPath = resolve(evidenceRoot, `${command.name}.log`);
  await writeFile(logPath, redact(output), "utf8");
  return {
    exitCode,
    finishedAt: new Date().toISOString(),
    logPath,
    name: command.name,
    ok: exitCode === 0,
    startedAt,
  };
}

async function readGit(args) {
  const child = spawn("git", args, { cwd: process.cwd(), shell: false });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  const exitCode = await new Promise((resolveExit) => child.on("close", resolveExit));
  return exitCode === 0 ? output.trim() : "";
}

async function readSourceState() {
  const [sourceRevision, workingTree] = await Promise.all([
    readGit(["rev-parse", "HEAD"]),
    readGit(["status", "--porcelain"]),
  ]);
  const workingTreeChangeCount = workingTree ? workingTree.split(/\r?\n/).filter(Boolean).length : 0;
  return {
    sourceRevision: sourceRevision || "unknown",
    sourceIdentity: `${sourceRevision || "unknown"}${workingTreeChangeCount > 0 ? "+dirty" : ""}`,
    workingTreeChangeCount,
    workingTreeDirty: workingTreeChangeCount > 0,
  };
}

function envState(name) {
  return { name, present: hasEnv(name) };
}

function hasEnv(name) {
  return Boolean(process.env[name]?.trim());
}

function printPreflight(preflight) {
  for (const group of preflight.groups) {
    const state = group.execution === "operator-physical-device" ? "OPERATOR" : group.ready ? "READY" : "NEEDS INPUT";
    console.log(`${state} ${group.drill}`);
  }
}

function redact(value) {
  return value.replace(/((?:authorization|password|private[_ -]?key|secret|token)\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]");
}

function manualDeviceTemplate(sourceState) {
  return `# Physical device evidence\n\n- Source identity: \`${sourceState.sourceIdentity}\`\n- Exact staging URL/deployment: \n- Operator: \n- Checked at (UTC): \n\n| Device/browser | Portrait + landscape | 200% zoom/text size | Keyboard/screen reader | No clipped content or blocked action | Evidence reference | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n| Physical iPhone / Safari / VoiceOver |  |  |  |  |  | NOT RUN |\n| Physical Android / Chrome / TalkBack |  |  |  |  |  | NOT RUN |\n\nRoutes: \`/\`, \`/learn\`, \`/auth/sign-in\`, \`/dashboard\`, \`/projects\`, \`/review/new\`, \`/portfolio\`, \`/status\`, \`/community\`, and \`/pricing\`. Record only the device model, OS/browser versions, pass/fail notes, and privacy-safe screenshot/video references. Do not capture passwords, tokens, email addresses, or private account content. A \`+dirty\` source identity is preparation evidence only; rerun against the committed release candidate.\n`;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

await main();
