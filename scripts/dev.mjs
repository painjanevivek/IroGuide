import { spawn } from "node:child_process";

function spawnApp(directory) {
  if (process.platform === "win32") {
    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npm run dev --prefix ${directory}`], { stdio: "inherit", windowsHide: true });
  }
  return spawn("npm", ["run", "dev", "--prefix", directory], { stdio: "inherit" });
}

const apps = [spawnApp("backend"), spawnApp("frontend")];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const app of apps) app.kill("SIGTERM");
  process.exitCode = exitCode;
}

for (const app of apps) app.on("exit", (code, signal) => { if (!stopping && signal !== "SIGTERM") stop(code ?? 1); });
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
