import { describe, expect, it } from "vitest";
import { sanitizeExportValue } from "./account-export";

describe("account export sanitizer", () => {
  it("removes credentials, ownership internals, signed access, and provider payloads recursively", () => {
    const value = sanitizeExportValue({
      userId: "owner", summary: "Owned critique text", sourceImage: { storagePath: "private/path" },
      nested: { refreshToken: "secret", sourceImageUrl: "https://signed.example", providerPayload: { raw: true }, recommendation: "Increase contrast" },
      updatedAt: { toDate: () => new Date("2026-08-28T10:00:00.000Z") },
    });
    expect(value).toEqual({ summary: "Owned critique text", nested: { recommendation: "Increase contrast" }, updatedAt: "2026-08-28T10:00:00.000Z" });
    expect(JSON.stringify(value)).not.toContain("private/path");
    expect(JSON.stringify(value)).not.toContain("secret");
  });
});
