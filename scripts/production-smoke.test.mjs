import { describe, expect, it } from "vitest";
import {
  EXPECTED_SECURITY_HEADERS,
  evaluateSecurityHeaders,
  getServiceAccount,
  normalizeBaseUrl,
  parseServiceAccount,
} from "./production-smoke.mjs";

describe("production smoke helpers", () => {
  it("accepts the complete production security header set", () => {
    const headers = new Headers();
    for (const header of EXPECTED_SECURITY_HEADERS) {
      headers.set(header.name, header.value);
    }

    expect(evaluateSecurityHeaders(headers)).toEqual({
      ok: true,
      detail: `headers=${EXPECTED_SECURITY_HEADERS.length}`,
    });
  });

  it("reports missing or changed deployed security headers", () => {
    const headers = new Headers();
    for (const header of EXPECTED_SECURITY_HEADERS) {
      headers.set(header.name, header.value);
    }
    headers.delete("x-frame-options");
    headers.set("strict-transport-security", "max-age=300");

    const result = evaluateSecurityHeaders(headers);

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("x-frame-options=missing");
    expect(result.detail).toContain("strict-transport-security=unexpected");
  });

  it("parses JSON and split Firebase Admin credentials", () => {
    expect(parseServiceAccount(JSON.stringify({
      project_id: "project-a",
      client_email: "firebase-adminsdk@example.test",
      private_key: "line-one\\nline-two",
    }))).toEqual({
      projectId: "project-a",
      clientEmail: "firebase-adminsdk@example.test",
      privateKey: "line-one\nline-two",
    });

    expect(getServiceAccount({
      FIREBASE_ADMIN_PROJECT_ID: "project-b",
      FIREBASE_ADMIN_CLIENT_EMAIL: "firebase-adminsdk-b@example.test",
      FIREBASE_ADMIN_PRIVATE_KEY: "private\\nkey",
    })).toEqual({
      projectId: "project-b",
      clientEmail: "firebase-adminsdk-b@example.test",
      privateKey: "private\nkey",
    });

    expect(parseServiceAccount("not json")).toBeNull();
  });

  it("normalizes the smoke base URL without altering the origin", () => {
    expect(normalizeBaseUrl("https://preview.example.com///")).toBe("https://preview.example.com");
  });
});
