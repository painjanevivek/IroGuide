import { afterEach, describe, expect, it, vi } from "vitest";
import { isBugReportInboxAdmin } from "./admin-authorization";

describe("admin authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when no bug report inbox admins are configured", () => {
    expect(isBugReportInboxAdmin({ uid: "user-1", email: "admin@example.com" })).toBe(false);
  });

  it("allows configured admin emails case-insensitively", () => {
    vi.stubEnv("IROGUIDE_ADMIN_EMAILS", "owner@example.com, admin@example.com");

    expect(isBugReportInboxAdmin({ uid: "user-1", email: "Admin@Example.com" })).toBe(true);
  });

  it("allows configured admin uids", () => {
    vi.stubEnv("IROGUIDE_ADMIN_UIDS", "admin-uid");

    expect(isBugReportInboxAdmin({ uid: "admin-uid" })).toBe(true);
  });
});
