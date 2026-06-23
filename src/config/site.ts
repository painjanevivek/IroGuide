export const siteConfig = {
  name: "IroGuide",
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://iroguide.com",
  description:
    "Official website of IroGuide. AI design critique, creative feedback tools, portfolio workflows, pricing, and contact information.",
  shortDescription:
    "Professional, contextual AI critique that tells you what works, what does not, and what to fix next.",
  logoPath: "/brand/iroguide-logo.png",
  creator: "IroGuide",
  repositoryUrl: "https://github.com/painjanevivek/IroGuide-backend",
  contactUrl: "/contact",
  navigation: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Modes", href: "/#modes" },
    { label: "Example review", href: "/#example" },
    { label: "Community", href: "/community" },
    { label: "Projects", href: "/projects" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/#faq" },
  ],
  footerNavigation: [
    { label: "About", href: "/about" },
    { label: "Projects", href: "/projects" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
    { label: "Community", href: "/community" },
    { label: "Beta", href: "/beta" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
