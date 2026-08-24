export const REQUEST_BODY_LIMITS = Object.freeze({
  bugReportJson: 32 * 1024,
  communityJson: 64 * 1024,
  productEvidenceJson: 4 * 1024,
  researchFeedbackJson: 4 * 1024,
  reviewExtensionJson: 4_450_000,
  reviewJson: 512 * 1024,
  reviewMultipart: 4_450_000,
  reviewSyncJson: 2 * 1024 * 1024,
  reviewSyncMultipart: 4_450_000,
});

export function getRequestBodyBudgetStatus() {
  const budgets = Object.values(REQUEST_BODY_LIMITS);
  return {
    configuredRoutes: budgets.length,
    ready: budgets.every((budget) => Number.isSafeInteger(budget) && budget > 0),
  } as const;
}

export class RequestBodyTooLargeError extends Error {
  readonly status = 413;

  constructor(readonly maxBytes: number) {
    super(`Request body exceeds the ${maxBytes}-byte limit.`);
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const bytes = await readBoundedBody(request, maxBytes);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}

export async function readFormDataBody(request: Request, maxBytes: number): Promise<FormData> {
  const bytes = await readBoundedBody(request, maxBytes);
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const boundedBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const boundedRequest = new Request(request.url, {
    body: boundedBody,
    headers,
    method: request.method,
  });
  return boundedRequest.formData();
}

export function getRequestBodyError(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) {
    return { message: "Request body is too large.", status: error.status } as const;
  }
  if (error instanceof TypeError && /encoded data was not valid|form data/i.test(error.message)) {
    return { message: "Request body is malformed.", status: 400 } as const;
  }
  return null;
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("maxBytes must be a positive safe integer.");
  }

  const declaredLength = parseContentLength(request.headers.get("content-length"));
  if (declaredLength !== null && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel("request body limit exceeded");
        throw new RequestBodyTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function parseContentLength(value: string | null) {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
