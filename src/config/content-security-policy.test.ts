import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("uses a nonce and excludes unsafe script execution in production", () => {
    const policy = buildContentSecurityPolicy("production-nonce", false);

    expect(policy).toContain("script-src 'self' 'nonce-production-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-production-nonce'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("localhost");
  });

  it("keeps development-only runtime permissions out of production", () => {
    const policy = buildContentSecurityPolicy("development-nonce", true);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("http://localhost:*");
    expect(policy).toContain("ws://localhost:*");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
