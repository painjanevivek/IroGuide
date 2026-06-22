import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl } from "./api";

describe("api config", () => {
  it("uses same-origin API routes when no remote URL is configured", () => {
    expect(normalizeApiBaseUrl(undefined)).toBe("");
  });

  it("adds https to protocol-less remote API URLs", () => {
    expect(normalizeApiBaseUrl("iroguide-backend.vercel.app")).toBe("https://iroguide-backend.vercel.app");
  });

  it("removes trailing slashes from configured API URLs", () => {
    expect(normalizeApiBaseUrl("https://iroguide-backend.vercel.app/")).toBe("https://iroguide-backend.vercel.app");
  });
});
