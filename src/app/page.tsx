import type { Metadata } from "next";
import { headers } from "next/headers";
import { LandingPage } from "@/features/marketing/landing-page";
import { siteConfig } from "@/config/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  legalName: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  logo: `${siteConfig.url}${siteConfig.logoPath}`,
  image: `${siteConfig.url}${siteConfig.logoPath}`,
  sameAs: [siteConfig.repositoryUrl],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  alternateName: ["Iro Guide", "IroGuide AI"],
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteConfig.name,
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: siteConfig.url,
  description: siteConfig.description,
  creator: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    ["What is IroGuide?", "IroGuide teaches a structured design critique method using owned examples and clear evidence-to-action explanations."],
    ["What can I use now?", "The free launch includes a public example critique. Personalized design analysis remains invite-only and unavailable in the free profile."],
    ["Does the free example upload my work?", "No. The example is illustrative and does not upload or analyze your design."],
    ["Does IroGuide replace a designer?", "No. IroGuide provides structured critique and practical next steps so designers, students, creators, and founders can make better decisions."],
  ].map(([question, answer]) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: "/",
  },
};

export default async function HomePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd, websiteJsonLd, webApplicationJsonLd, faqJsonLd]).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
