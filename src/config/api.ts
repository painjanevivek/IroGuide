const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const apiBaseUrl = (configuredUrl || "http://localhost:4000").replace(/\/$/, "");
