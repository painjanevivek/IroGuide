import { describe, expect, it } from "vitest";
import { metadata as statusMetadata } from "./status/page";
import { metadata as portfolioMetadata } from "./portfolio/page";
import { metadata as pricingMetadata } from "./pricing/page";
import { metadata as projectsMetadata } from "./projects/page";
import sitemap from "./sitemap";

describe("public SEO metadata", () => {
  it("keeps deployment diagnostics out of the index and sitemap", () => {
    expect(sitemap().some((route) => route.url.endsWith("/beta"))).toBe(false);
    expect(statusMetadata.alternates).toEqual({ canonical: "/status" });
    expect(sitemap().some((route) => route.url.endsWith("/status"))).toBe(true);
  });

  it("does not publish generated sitemap modification dates", () => {
    expect(sitemap().every((route) => route.lastModified === undefined)).toBe(true);
  });

  it("keeps research and gated concepts out of search indexing", () => {
    const sitemapUrls = sitemap().map((route) => route.url);

    expect(projectsMetadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(portfolioMetadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(pricingMetadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(sitemapUrls.some((url) => /\/(projects|portfolio|pricing)$/.test(url))).toBe(false);
  });
});
