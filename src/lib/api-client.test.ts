import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiRequestUrls, postJsonWithFallback } from "./api-client";

describe("api client fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates same-origin requests when no remote API is configured", () => {
    expect(getApiRequestUrls("/api/reviews", "")).toEqual(["/api/reviews"]);
  });

  it("tries the configured API before the same-origin fallback", () => {
    expect(getApiRequestUrls("/api/reviews", "https://backend.example")).toEqual([
      "https://backend.example/api/reviews",
      "/api/reviews",
    ]);
  });

  it("falls back when the first API returns a non-json response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("<!DOCTYPE html>", { status: 404, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const payload = await postJsonWithFallback({
      path: "/api/reviews",
      unavailableMessage: "Unavailable",
      failureMessage: "Failed",
      init: { method: "POST" },
      primaryBase: "https://backend.example",
    });

    expect(payload).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
