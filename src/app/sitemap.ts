import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const routes = [
  "",
  "/about",
  "/contact",
  "/projects",
  "/pricing",
  "/community",
  "/portfolio",
  "/review/new",
  "/beta",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
