import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const productionAuthHosts = new Set([
  "iroguide.com",
  "www.iroguide.com",
  getSiteHostname(process.env.NEXT_PUBLIC_SITE_URL),
].filter((host): host is string => Boolean(host)));

function assertFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing Firebase web configuration: ${missing.join(", ")}`);
  }
}

export function getFirebaseClientApp(): FirebaseApp {
  assertFirebaseConfig();
  return getApps().length > 0 ? getApp() : initializeApp({
    ...firebaseConfig,
    authDomain: resolveFirebaseAuthDomain(firebaseConfig.authDomain, getCurrentHost(), process.env.NEXT_PUBLIC_SITE_URL),
  });
}

export function resolveFirebaseAuthDomain(
  configuredAuthDomain: string | undefined,
  currentHost: string | null,
  siteUrl: string | undefined,
) {
  if (!configuredAuthDomain || !currentHost) return configuredAuthDomain;

  const currentHostname = getHostname(currentHost);
  if (!currentHostname || isLocalHost(currentHostname)) return configuredAuthDomain;

  const allowedHosts = new Set([
    ...productionAuthHosts,
    getSiteHostname(siteUrl),
  ].filter((host): host is string => Boolean(host)));

  return allowedHosts.has(currentHostname) ? currentHost.toLowerCase() : configuredAuthDomain;
}

function getCurrentHost() {
  return typeof window === "undefined" ? null : window.location.host;
}

function getSiteHostname(siteUrl: string | undefined) {
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return null;
  }
}

function getHostname(host: string) {
  return host.split(":")[0]?.toLowerCase() || null;
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
