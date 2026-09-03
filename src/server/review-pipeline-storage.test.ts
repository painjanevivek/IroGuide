import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReviewUploadSession, ReviewPipelineError } from "./review-pipeline-storage";

const mocks = vi.hoisted(() => {
  const create = vi.fn();
  const deletionLock = { exists: false };
  const generateSignedPostPolicyV4 = vi.fn(async (options: { fields?: Record<string, string> }) => [{
    fields: { ...options.fields, policy: "signed-policy", "x-goog-signature": "signature" },
    url: "https://storage.googleapis.com/upload-bucket",
  }]);
  const file = vi.fn(() => ({ generateSignedPostPolicyV4 }));
  const doc = vi.fn((id: string) => ({ id }));
  const collection = vi.fn(() => ({ doc }));
  const get = vi.fn(async () => deletionLock);
  const runTransaction = vi.fn(async (work: (transaction: { create: typeof create; get: typeof get }) => Promise<void>) => work({ create, get }));
  return { collection, create, deletionLock, doc, file, generateSignedPostPolicyV4, get, runTransaction };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({ collection: mocks.collection, runTransaction: mocks.runTransaction }),
  getFirebaseAdminStorageBucket: () => ({ file: mocks.file }),
}));

describe("review upload authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deletionLock.exists = false;
  });

  it("binds type, nonce, and the four MiB limit into the signed storage policy", async () => {
    const now = new Date("2026-08-28T10:00:00.000Z");

    const authorization = await createReviewUploadSession({ contentType: "image/png", userId: "user-a", now });

    expect(authorization.uploadMethod).toBe("POST");
    expect(authorization.uploadUrl).toBe("https://storage.googleapis.com/upload-bucket");
    expect(authorization.session.expiresAt).toBe("2026-08-28T10:02:00.000Z");
    expect(mocks.file).toHaveBeenCalledWith(`users/user-a/review-uploads/${authorization.session.id}/source`);
    expect(mocks.generateSignedPostPolicyV4).toHaveBeenCalledWith({
      conditions: [
        ["content-length-range", 1, 4 * 1024 * 1024],
        ["eq", "$Content-Type", "image/png"],
        ["eq", "$x-goog-meta-upload-nonce", authorization.session.nonce],
      ],
      expires: new Date("2026-08-28T10:02:00.000Z"),
      fields: {
        "Content-Type": "image/png",
        "x-goog-meta-upload-nonce": authorization.session.nonce,
      },
    });
    expect(authorization.uploadFields).toEqual(expect.objectContaining({
      "Content-Type": "image/png",
      "x-goog-meta-upload-nonce": authorization.session.nonce,
      policy: "signed-policy",
    }));
  });

  it("does not mint another upload capability after account deletion starts", async () => {
    mocks.deletionLock.exists = true;

    await expect(createReviewUploadSession({ contentType: "image/webp", userId: "user-a" }))
      .rejects.toEqual(expect.objectContaining<Partial<ReviewPipelineError>>({ status: 409 }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.generateSignedPostPolicyV4).not.toHaveBeenCalled();
  });
});
