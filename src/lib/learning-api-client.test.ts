import type { User } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSelfReviews, listSelfReviews } from "./learning-api-client";

describe("learning API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads a strict owner-redacted self-review list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [validSelfReview()] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listSelfReviews(fakeUser())).resolves.toMatchObject([{ id: "session-a", category: "ui", revision: 0 }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/self-reviews", expect.objectContaining({
      cache: "no-store",
      headers: { Authorization: "Bearer owner-token" },
      method: "GET",
    }));
  });

  it("rejects a response that leaks internal ownership fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ records: [{ ...validSelfReview(), userId: "owner" }] })));
    await expect(listSelfReviews(fakeUser())).rejects.toMatchObject({ name: "LearningRequestError", status: 503 });
  });

  it("sends an explicit bounded clear-history command", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ deleted: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    await clearSelfReviews(fakeUser());
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({ schemaVersion: 1, scope: "all" });
  });
});

function fakeUser() { return { getIdToken: vi.fn().mockResolvedValue("owner-token") } as unknown as User; }
function jsonResponse(value: unknown) { return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } }); }
function validSelfReview() {
  return {
    id: "session-a", schemaVersion: 1, revision: 0, rubricVersion: "rubric-v1", category: "ui", goalLabel: "",
    responses: [], priorityItemIds: [], status: "draft", createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z",
  };
}
