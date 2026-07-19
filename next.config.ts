import type { NextConfig } from "next";

const firebaseAuthHandlerDomain = (
  process.env.FIREBASE_AUTH_HANDLER_DOMAIN
  || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  || ""
).trim().toLowerCase();

const customFirebaseAuthDomains = new Set([
  "iroguide.com",
  "www.iroguide.com",
  process.env.NEXT_PUBLIC_SITE_URL ? safeHostname(process.env.NEXT_PUBLIC_SITE_URL) : null,
].filter((host): host is string => Boolean(host)));

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  typedRoutes: true,
  async rewrites() {
    if (!firebaseAuthHandlerDomain || customFirebaseAuthDomains.has(firebaseAuthHandlerDomain)) return [];

    return [{
      source: "/__/auth/:path*",
      destination: `https://${firebaseAuthHandlerDomain}/__/auth/:path*`,
    }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "X-Download-Options", value: "noopen" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    ] }];
  },
};

export default nextConfig;
