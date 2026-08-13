import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { BoneyardSiteShell } from "@/components/boneyard-site-shell";
import { CookieConsent } from "@/components/cookie-consent";
import { DeferredTargetCursor } from "@/components/motion/deferred-target-cursor";
import { SkipLink } from "@/components/skip-link";
import { AuthProvider } from "@/features/auth/auth-provider";
import { LaunchCapabilitiesProvider } from "@/features/capabilities/launch-capabilities-provider";
import { getServerLaunchCapabilities } from "@/server/launch-capabilities";
import "./globals.css";
import "./target-cursor.css";

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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${siteConfig.name} design critique workspace` }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.webmanifest",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#09090f",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const launchCapabilities = getServerLaunchCapabilities();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <SkipLink />
        <LaunchCapabilitiesProvider capabilities={launchCapabilities}>
          <AuthProvider>
            <div id="app-content" tabIndex={-1}>
              <BoneyardSiteShell>{children}</BoneyardSiteShell>
            </div>
            <AnalyticsTracker nonce={nonce} />
            <CookieConsent />
            <DeferredTargetCursor />
          </AuthProvider>
        </LaunchCapabilitiesProvider>
      </body>
    </html>
  );
}
