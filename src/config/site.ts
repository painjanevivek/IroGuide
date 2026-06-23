export const siteConfig = {
  name: "IroGuide",
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://iroguide.com",
  description:
    "Official website of IroGuide. AI design critique, creative feedback tools, portfolio workflows, pricing, and contact information.",
  shortDescription:
    "Professional, contextual AI critique that tells you what works, what does not, and what to fix next.",
  creator: "IroGuide",
  repositoryUrl: "https://github.com/painjanevivek/IroGuide-backend",
  contactUrl: "/contact",
  navigation: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Modes", href: "/#modes" },
    { label: "Example review", href: "/#example" },
    { label: "Projects", href: "/projects" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/#faq" },
  ],
} as const;
