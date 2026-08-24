import { describe, expect, it } from "vitest";
import {
  getProductEvidenceEnvironment,
  getProductEvidenceStatus,
  getSampleRate,
  shouldSampleProductEvidence,
} from "./product-evidence";

describe("product evidence configuration", () => {
  it("defaults to a ready no-op adapter", () => {
    expect(getProductEvidenceStatus({} as NodeJS.ProcessEnv)).toEqual({
      mode: "noop",
      ready: true,
      secretConfigured: false,
    });
  });

  it("fails readiness when Firestore is selected without a strong hash secret", () => {
    expect(getProductEvidenceStatus({
      NODE_ENV: "test",
      IROGUIDE_PRODUCT_EVIDENCE_MODE: "firestore",
      IROGUIDE_PRODUCT_EVIDENCE_HMAC_SECRET: "short",
    } as NodeJS.ProcessEnv)).toMatchObject({ mode: "firestore", ready: false });
  });

  it("labels deployment environments without client input", () => {
    expect(getProductEvidenceEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" } as NodeJS.ProcessEnv)).toBe("production");
    expect(getProductEvidenceEnvironment({ NODE_ENV: "production", VERCEL_ENV: "preview" } as NodeJS.ProcessEnv)).toBe("preview");
    expect(getProductEvidenceEnvironment({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBe("test");
  });

  it("uses bounded, deterministic sampling", () => {
    const id = "018f1a80-7b5a-7c61-a9be-2f38de60ec98";
    expect(getSampleRate(undefined)).toBe(1);
    expect(getSampleRate("invalid")).toBe(1);
    expect(getSampleRate("0.25")).toBe(0.25);
    expect(shouldSampleProductEvidence(id, 0)).toBe(false);
    expect(shouldSampleProductEvidence(id, 1)).toBe(true);
    expect(shouldSampleProductEvidence(id, 0.5)).toBe(shouldSampleProductEvidence(id, 0.5));
  });
});
