import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { BoneyardSiteShell } from "@/components/boneyard-site-shell";
import { CookieConsent } from "@/components/cookie-consent";
import { AuthProvider } from "@/features/auth/auth-provider";
import "./globals.css";

const display = Geist({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.creator, url: siteConfig.url }],
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  category: "Design software",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.logoPath, width: 512, height: 512, alt: `${siteConfig.name} logo` }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.logoPath],
  },
  icons: {
    icon: [{ url: siteConfig.logoPath, type: "image/png" }],
    shortcut: [siteConfig.logoPath],
    apple: [{ url: siteConfig.logoPath, type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <a className="skip-link" href="#app-content">Skip to main content</a>
        <AuthProvider>
          <div id="app-content">
            <BoneyardSiteShell>{children}</BoneyardSiteShell>
          </div>
          <AnalyticsTracker />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
