const productionSiteUrl = "https://www.iroguide.com";

function getCanonicalSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!configuredUrl || configuredUrl === "https://iroguide.com") return productionSiteUrl;
  return configuredUrl;
}

export const siteConfig = {
  name: "IroGuide",
  url: getCanonicalSiteUrl(),
  title: "IroGuide - Learn Evidence-Based Design Critique",
  description:
    "Learn how to turn visual evidence into clear design decisions with a free example critique. Personalized AI review remains invite-only.",
  shortDescription:
    "Structured design critique learning that explains what matters, why it matters, and what to fix first.",
  keywords: [
    "IroGuide",
    "IroGuide official",
    "design critique learning",
    "design feedback",
    "creative feedback",
    "portfolio review",
    "design review tool",
    "UI critique",
    "logo critique",
    "poster critique",
  ],
  logoPath: "/brand/iroguide-logo.png",
  creator: "IroGuide",
  repositoryUrl: "https://github.com/painjanevivek/IroGuide",
  contactUrl: "/contact",
  supportEmail: "support@iroguide.com",
  navigation: [
    { label: "Learn", href: "/learn" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Modes", href: "/#modes" },
    { label: "Example review", href: "/#example" },
  ],
  footerNavigation: [
    { label: "Free learning", href: "/learn" },
    { label: "About", href: "/about" },
    { label: "Docs", href: "/docs" },
    { label: "Contact", href: "/contact" },
    { label: "Bug report", href: "/contact#bug-report" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
