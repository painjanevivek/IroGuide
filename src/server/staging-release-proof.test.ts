import { afterEach, describe, expect, it } from "vitest";
import { isValidStagingProofSecret } from "./staging-release-proof";

const originalVercelEnvironment = process.env.VERCEL_ENV;
const originalSecret = process.env.IROGUIDE_STAGING_PROOF_SECRET;

afterEach(() => {
  if (originalVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnvironment;
  if (originalSecret === undefined) delete process.env.IROGUIDE_STAGING_PROOF_SECRET;
  else process.env.IROGUIDE_STAGING_PROOF_SECRET = originalSecret;
});

describe("staging release proof authorization", () => {
  it("accepts the complete temporary secret only in preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.IROGUIDE_STAGING_PROOF_SECRET = "temporary-staging-proof-secret";
    expect(isValidStagingProofSecret("temporary-staging-proof-secret")).toBe(true);
    expect(isValidStagingProofSecret("temporary-staging-proof-secrex")).toBe(false);
  });

  it("fails closed outside preview or without configuration", () => {
    process.env.VERCEL_ENV = "production";
    process.env.IROGUIDE_STAGING_PROOF_SECRET = "temporary-staging-proof-secret";
    expect(isValidStagingProofSecret("temporary-staging-proof-secret")).toBe(false);
    process.env.VERCEL_ENV = "preview";
    delete process.env.IROGUIDE_STAGING_PROOF_SECRET;
    expect(isValidStagingProofSecret("temporary-staging-proof-secret")).toBe(false);
  });
});
