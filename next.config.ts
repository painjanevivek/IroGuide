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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: `default-src 'self'; img-src 'self' blob: data: https://lh3.googleusercontent.com; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc}; connect-src ${connectSrc}; frame-src ${frameSrc}; object-src 'none'; base-uri 'self'; form-action ${formAction}; frame-ancestors 'none'; upgrade-insecure-requests` },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ] }];
  },
};

export default nextConfig;
