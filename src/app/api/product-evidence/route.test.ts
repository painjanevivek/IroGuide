import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordProductEvidenceEvent: vi.fn(),
  requireVerifiedFirebaseUser: vi.fn(),
}));

vi.mock("@/server/api-security", () => ({
  enforceRateLimit: () => ({}),
  enforceSameOriginRequest: () => ({}),
  requireContentType: () => ({}),
  requireVerifiedFirebaseUser: mocks.requireVerifiedFirebaseUser,
}));

vi.mock("@/server/observability", () => ({
  createRequestContext: () => ({ requestId: "request-1", route: "api.product_evidence.create", startedAt: Date.now() }),
  jsonHeaders: () => ({ "x-request-id": "request-1" }),
  logRequestEvent: vi.fn(),
}));

vi.mock("@/server/product-evidence", () => ({
  recordProductEvidenceEvent: mocks.recordProductEvidenceEvent,
}));

import { POST } from "./route";

const eventId = "018f1a80-7b5a-7c61-a9be-2f38de60ec98";

describe("product evidence route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVerifiedFirebaseUser.mockResolvedValue({
      user: { uid: "user-a", sub: "user-a", iat: 1, email_verified: true },
      userLogId: "safe-user-a",
    });
    mocks.recordProductEvidenceEvent.mockResolvedValue("recorded");
  });

  it("accepts a minimized event and binds it to the verified server identity", async () => {
    const response = await POST(request({
      eventId,
      name: "review_history_opened",
      eligibleCount: 2,
      excludedCount: 1,
    }));

    expect(response.status).toBe(202);
    expect(mocks.recordProductEvidenceEvent).toHaveBeenCalledWith({
      event: { eventId, name: "review_history_opened", eligibleCount: 2, excludedCount: 1 },
      userId: "user-a",
    });
    await expect(response.json()).resolves.toEqual({ accepted: true });
  });

  it.each(["email", "userId", "documentId", "reviewText", "imageUrl"])(
    "rejects a client-supplied sensitive field %s",
    async (field) => {
      const response = await POST(request({
        eventId,
        name: "review_history_opened",
        eligibleCount: 2,
        excludedCount: 1,
        [field]: "private-value",
      }));

      expect(response.status).toBe(400);
      expect(mocks.recordProductEvidenceEvent).not.toHaveBeenCalled();
    },
  );

  it("rejects an event without an explicit consent attestation", async () => {
    const nextRequest = request({ eventId, name: "documentation_opened", section: "overview" });
    nextRequest.headers.delete("X-IroGuide-Analytics-Consent");

    const response = await POST(nextRequest);

    expect(response.status).toBe(403);
    expect(mocks.requireVerifiedFirebaseUser).not.toHaveBeenCalled();
    expect(mocks.recordProductEvidenceEvent).not.toHaveBeenCalled();
  });
});

function request(body: Record<string, unknown>) {
  return new Request("https://iroguide.com/api/product-evidence", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
      "X-IroGuide-Analytics-Consent": "v1",
    },
    body: JSON.stringify(body),
  });
}
