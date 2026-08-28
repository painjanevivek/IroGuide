import type { Route } from "next";

const FALLBACK_ROUTE = "/dashboard" as Route;

export function getSafeAuthReturnPath(value: string | null | undefined, fallback: Route = FALLBACK_ROUTE): Route {
  if (!value || value.length > 500 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://iroguide.local");
    if (parsed.origin !== "https://iroguide.local") return fallback;
    if (parsed.pathname.startsWith("/auth")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` as Route;
  } catch {
    return fallback;
  }
}

export function withAuthReturn(path: "/auth" | "/auth/sign-in" | "/auth/sign-up", nextPath: Route, mode?: "sign-in" | "sign-up") {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  params.set("next", nextPath);
  return `${path}?${params.toString()}` as Route;
}
