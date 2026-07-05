import type { Metadata } from "next";
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
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${siteConfig.url}/pricing`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    ["What is IroGuide?", "IroGuide is an AI design critique workspace for creative feedback, project reviews, portfolio refinement, and clearer next steps."],
    ["What kinds of design can IroGuide review?", "IroGuide supports logos, posters, social posts, UI screens, websites, book covers, packaging, and other visual design work."],
    ["Is IroGuide private?", "IroGuide is private by default. Uploaded work and saved critiques stay in the signed-in workspace unless a user explicitly chooses to share."],
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

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd, websiteJsonLd, webApplicationJsonLd, faqJsonLd]).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
