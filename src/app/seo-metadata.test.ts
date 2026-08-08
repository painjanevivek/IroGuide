import { describe, expect, it } from "vitest";
import { metadata as betaMetadata } from "./beta/page";
import sitemap from "./sitemap";

describe("public SEO metadata", () => {
  it("keeps deployment diagnostics out of the index and sitemap", () => {
    expect(betaMetadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(sitemap().some((route) => route.url.endsWith("/beta"))).toBe(false);
  });

  it("does not publish generated sitemap modification dates", () => {
    expect(sitemap().every((route) => route.lastModified === undefined)).toBe(true);
  });
});
