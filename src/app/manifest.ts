import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#09090f",
    icons: [
      {
        src: siteConfig.logoPath,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
