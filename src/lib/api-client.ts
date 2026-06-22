import { apiBaseUrl, localApiBaseUrl } from "@/config/api";
import { getErrorMessage, readJsonResponse } from "./http";

type JsonRequestOptions = {
  path: `/${string}`;
  init: RequestInit;
  unavailableMessage: string;
  failureMessage: string;
  primaryBase?: string;
};

export async function postJsonWithFallback({ path, init, unavailableMessage, failureMessage, primaryBase = apiBaseUrl }: JsonRequestOptions) {
  const urls = getApiRequestUrls(path, primaryBase);
  let unavailableError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, init);
      const payload = await readJsonResponse(response, unavailableMessage);

      if (!response.ok) {
        const message = getErrorMessage(payload, failureMessage);
        if (shouldTryFallback(response.status, urls, url)) {
          unavailableError = new Error(message);
          continue;
        }
        throw new Error(message);
      }

      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : unavailableMessage;
      if (isLastUrl(urls, url)) throw new Error(message || unavailableMessage);
      unavailableError = error instanceof Error ? error : new Error(unavailableMessage);
    }
  }

  throw unavailableError ?? new Error(unavailableMessage);
}

export function getApiRequestUrls(path: string, primaryBase = apiBaseUrl) {
  const bases = [primaryBase, localApiBaseUrl];
  return [...new Set(bases.map((base) => `${base}${path}`))];
}

function shouldTryFallback(status: number, urls: string[], currentUrl: string) {
  return !isLastUrl(urls, currentUrl) && (status === 404 || status === 405 || status >= 500);
}

function isLastUrl(urls: string[], currentUrl: string) {
  return urls[urls.length - 1] === currentUrl;
}
