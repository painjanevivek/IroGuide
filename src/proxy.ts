import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/config/content-security-policy";

const INFRASTRUCTURE_HEADERS = [
  "server",
  "x-matched-path",
  "x-nextjs-cache",
  "x-nextjs-prerender",
  "x-nextjs-stale-time",
  "x-powered-by",
  "x-vercel-cache",
  "x-vercel-id",
] as const;

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV !== "production",
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  for (const header of INFRASTRUCTURE_HEADERS) response.headers.delete(header);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
