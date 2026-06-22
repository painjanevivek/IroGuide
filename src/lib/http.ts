export async function readJsonResponse(response: Response, fallbackMessage: string): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }
  return response.json() as Promise<unknown>;
}

export function getErrorMessage(payload: unknown, fallback: string) {
  return typeof payload === "object" && payload !== null && "error" in payload
    ? String(payload.error)
    : fallback;
}
