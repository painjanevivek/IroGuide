import type { Metadata } from "next";
import { LandingPage } from "@/features/marketing/landing-page";
import { siteConfig } from "@/config/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  sameAs: [siteConfig.repositoryUrl],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
};

export const metadata: Metadata = {
  title: `${siteConfig.name} | Official Website`,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteConfig.name} | Official Website`,
    description: siteConfig.description,
    url: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd, websiteJsonLd]).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
