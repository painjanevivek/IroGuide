import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientKey } from "./observability";

describe("trusted rate-limit identities", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses Vercel's protected client-IP header instead of caller-controlled forwarding headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    const request = new Request("https://iroguide.com/api/bug-reports", {
      headers: {
        "x-forwarded-for": "203.0.113.80",
        "x-vercel-forwarded-for": "198.51.100.10",
      },
    });

    expect(getClientKey(request, "unknown")).toBe("198.51.100.10");
  });

  it("does not trust caller forwarding headers in a non-Vercel production runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    const request = new Request("https://iroguide.com/api/bug-reports", {
      headers: { "x-forwarded-for": "203.0.113.80" },
    });

    expect(getClientKey(request, "unknown")).toBe("unknown");
  });
});
