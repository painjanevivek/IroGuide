import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const dependencyNames = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
const billingPackages = /(^|[-_/])(stripe|paddle|adyen|braintree|chargebee|recurly|razorpay|paypal|lemonsqueezy)([-_/]|$)/i;
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean).map((path) => path.replaceAll("\\", "/"));
const billingRoutes = tracked.filter((path) => /^src\/app\/api\/(?:billing|checkout|subscriptions?|webhooks?)(?:\/|$)/i.test(path));
const pricing = readFileSync("src/app/pricing/page.tsx", "utf8");
const violations = [];

for (const name of dependencyNames.filter((name) => billingPackages.test(name))) violations.push(`billing dependency installed: ${name}`);
for (const path of billingRoutes) violations.push(`billing route tracked before approval: ${path}`);
for (const required of ["Pricing research only", "No checkout", "Billing is closed", "Payment can never bypass provider, privacy, or Community safety gates."]) {
  if (!pricing.includes(required)) violations.push(`pricing gate copy missing: ${required}`);
}
if (/<form\b|type=["']submit["']|href=["'][^"']*(?:checkout|subscribe|payment)/i.test(pricing)) violations.push("pricing contains a purchase-shaped form or link.");

if (violations.length > 0) {
  console.error("Billing gate violations:\n- " + violations.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("Billing gate closed: no SDK, route, checkout, subscription, webhook, or purchase control is present.");
}
