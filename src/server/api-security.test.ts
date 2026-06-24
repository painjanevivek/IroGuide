import { describe, expect, it, vi } from "vitest";
import { enforceSameOriginRequest, requireContentType } from "./api-security";
import { createRequestContext, logRequestEvent, toLogSafeUserId } from "./observability";

describe("api security logging", () => {
  it("redacts secret-shaped log fields before writing", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const context = createRequestContext(new Request("https://iroguide.test/api"), "api.test");

    logRequestEvent("info", "test.event", context, {
      apiKey: "sk-test-secret",
      authorization: "Bearer token",
      count: 1,
    });

    const logged = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(logged.apiKey).toBe("[redacted]");
    expect(logged.authorization).toBe("[redacted]");
    expect(logged.count).toBe(1);

    info.mockRestore();
  });

  it("hashes user ids before they are placed in operational logs", () => {
    const hashed = toLogSafeUserId("firebase-user-123");

    expect(hashed).toHaveLength(16);
    expect(hashed).not.toContain("firebase-user-123");
    expect(toLogSafeUserId("firebase-user-123")).toBe(hashed);
  });

  it("blocks cross-site mutating API requests before route logic runs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = new Request("https://iroguide.com/api/reviews", {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    });
    const context = createRequestContext(request, "api.test");

    const result = enforceSameOriginRequest(request, context, "test");

    expect("response" in result ? result.response.status : 200).toBe(403);
    expect("response" in result ? await result.response.json() : null).toEqual({
      error: "Request origin is not allowed.",
    });
    warn.mockRestore();
  });

  it("allows same-origin mutating API requests", () => {
    const request = new Request("https://iroguide.com/api/reviews", {
      method: "POST",
      headers: { Origin: "https://iroguide.com" },
    });
    const context = createRequestContext(request, "api.test");

    expect(enforceSameOriginRequest(request, context, "test")).toEqual({ allowed: true });
  });

  it("rejects unsupported API request content types", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = new Request("https://iroguide.com/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
    });
    const context = createRequestContext(request, "api.test");

    const result = requireContentType(request, context, "test");

    expect("response" in result ? result.response.status : 200).toBe(415);
    expect("response" in result ? result.response.headers.get("Cache-Control") : null).toBe("no-store, max-age=0");
    warn.mockRestore();
  });
});
