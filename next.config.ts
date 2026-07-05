import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  "https://apis.google.com",
  "https://accounts.google.com",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://www.googletagmanager.com",
  "https://*.gstatic.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
].join(" ");

const connectSrc = [
  "'self'",
  "http://localhost:4000",
  "https://*.vercel.app",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://firestore.googleapis.com",
  "https://firebasestorage.googleapis.com",
  "https://*.googleapis.com",
  "https://*.firebaseio.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://region1.google-analytics.com",
].join(" ");

const frameSrc = [
  "'self'",
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://www.google.com",
  "https://recaptcha.google.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
].join(" ");

const formAction = [
  "'self'",
  "https://accounts.google.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
].join(" ");

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
      { key: "Content-Security-Policy", value: `default-src 'self'; img-src 'self' blob: data: https://lh3.googleusercontent.com https://www.google-analytics.com https://*.google-analytics.com; font-src 'self' https://fonts.gstatic.com; media-src 'self' https://d8j0ntlcm91z4.cloudfront.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src ${scriptSrc}; connect-src ${connectSrc}; frame-src ${frameSrc}; object-src 'none'; base-uri 'self'; form-action ${formAction}; frame-ancestors 'none'; upgrade-insecure-requests` },
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
