const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const apiBaseUrl = normalizeApiBaseUrl(configuredUrl);
export const localApiBaseUrl = "";

export function normalizeApiBaseUrl(url: string | undefined) {
  if (!url) return "";
  const withoutTrailingSlash = url.replace(/\/$/, "");
  return /^https?:\/\//i.test(withoutTrailingSlash) ? withoutTrailingSlash : `https://${withoutTrailingSlash}`;
}
