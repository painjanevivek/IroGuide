import { describe, expect, it } from "vitest";
import { getReadinessDiagnostics, toPublicReadiness } from "./readiness-diagnostics";

describe("public readiness response", () => {
  it("contains only the health result", () => {
    const publicResponse = toPublicReadiness({ ok: true } as ReturnType<typeof getReadinessDiagnostics>);

    expect(publicResponse).toEqual({ ok: true });
    expect(Object.keys(publicResponse)).toEqual(["ok"]);
  });
});
