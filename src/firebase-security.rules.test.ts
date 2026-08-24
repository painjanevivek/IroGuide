import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const PROJECT_ID = "demo-iroguide-rules";
const REVIEW_ID = "review-alpha";
const COMMUNITY_POST_ID = "post-alpha";
const OWNER_UID = "user-a";
const OTHER_UID = "user-b";
const DRAFT_ID = `${OWNER_UID}_active`;

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
    storage: {
      rules: readFileSync(resolve("storage.rules"), "utf8"),
    },
  });
});

afterEach(async () => {
  await Promise.all([
    testEnv.clearFirestore(),
    testEnv.clearStorage(),
  ]);
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("Firebase security rules", () => {
  it("allows only the owner to read saved review documents", async () => {
    await seedFirestoreDocument(`reviews/${REVIEW_ID}`, {
      id: REVIEW_ID,
      userId: OWNER_UID,
      status: "complete",
      savedAt: "2026-06-24T00:00:00.000Z",
    });

    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviews/${REVIEW_ID}`).get());
    await assertFails(authenticatedFirestore(OTHER_UID).doc(`reviews/${REVIEW_ID}`).get());
    await assertFails(testEnv.unauthenticatedContext().firestore().doc(`reviews/${REVIEW_ID}`).get());
  });

  it("denies all direct client writes to trusted reviews", async () => {
    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviews/${REVIEW_ID}`).set({
      id: REVIEW_ID,
      userId: OWNER_UID,
      status: "complete",
    }));

    await assertFails(authenticatedFirestore(OTHER_UID).doc(`reviews/${REVIEW_ID}`).set({
      id: REVIEW_ID,
      userId: OWNER_UID,
      status: "complete",
    }));

    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviews/${REVIEW_ID}`).set({
      id: REVIEW_ID,
      userId: OTHER_UID,
      status: "complete",
    }));

    await seedFirestoreDocument(`reviews/${REVIEW_ID}`, {
      id: REVIEW_ID,
      userId: OWNER_UID,
      status: "complete",
    });
    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviews/${REVIEW_ID}`).update({ status: "complete" }));
    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviews/${REVIEW_ID}`).delete());
  });

  it("denies direct client access to review-finding feedback", async () => {
    const feedbackRef = authenticatedFirestore(OWNER_UID).doc("reviewFeedback/owner_review-alpha_issue-1");
    await assertFails(feedbackRef.set({
      id: "owner_review-alpha_issue-1",
      userId: OWNER_UID,
      reviewDocumentId: REVIEW_ID,
      issueId: "issue-1",
      verdict: "helpful",
    }));
    await assertFails(feedbackRef.get());
  });

  it("allows only the owner to read active review drafts", async () => {
    await seedFirestoreDocument(`reviewDrafts/${DRAFT_ID}`, {
      id: DRAFT_ID,
      userId: OWNER_UID,
      status: "draft",
      updatedAt: "2026-06-24T00:00:00.000Z",
    });

    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).get());
    await assertFails(authenticatedFirestore(OTHER_UID).doc(`reviewDrafts/${DRAFT_ID}`).get());
    await assertFails(testEnv.unauthenticatedContext().firestore().doc(`reviewDrafts/${DRAFT_ID}`).get());
  });

  it("allows only the exact UID-bound active draft path", async () => {
    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set(validDraftRecord()));
    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/import-alpha").set(validImportedRecord()));
    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/arbitrary").set(validDraftRecord()));
    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${OTHER_UID}_active`).set(validDraftRecord()));

    await assertFails(authenticatedFirestore(OTHER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set(validDraftRecord()));

    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set({
      ...validDraftRecord(),
      userId: OTHER_UID,
    }));

    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set({
      ...validDraftRecord(),
      step: 3,
    }, { merge: true }));
    await assertFails(authenticatedFirestore(OTHER_UID).doc(`reviewDrafts/${DRAFT_ID}`).delete());
    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).delete());
  });

  it("rejects trust claims and unexpected fields in draft storage", async () => {
    const imported = validImportedRecord();

    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/server-origin").set({
      ...imported,
      origin: "server",
    }));
    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/complete-status").set({
      ...imported,
      status: "complete",
    }));
    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/live-provider").set({
      ...imported,
      review: { ...imported.review, provider: "live" },
    }));
    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/provenance").set({
      ...imported,
      provenance: {
        origin: "server",
        schemaVersion: 1,
        generatedAt: "2026-08-11T09:30:00.000Z",
      },
    }));
    await assertFails(authenticatedFirestore(OWNER_UID).doc("reviewDrafts/unexpected").set({
      ...validDraftRecord(),
      trusted: true,
    }));
  });

  it("denies live community reads and writes while the capability is gated", async () => {
    await seedFirestoreDocument(`communityPosts/${COMMUNITY_POST_ID}`, {
      authorId: OWNER_UID,
      visibility: "public",
      stats: { comments: 0, likes: 0, saves: 0 },
    });
    await seedFirestoreDocument(`communityPosts/${COMMUNITY_POST_ID}/comments/comment-alpha`, {
      authorId: OWNER_UID,
      authorName: "Owner",
      body: "Useful feedback",
    });

    await assertFails(authenticatedFirestore(OTHER_UID).doc(`communityPosts/${COMMUNITY_POST_ID}`).get());
    await assertFails(authenticatedFirestore(OTHER_UID).doc(`communityPosts/${COMMUNITY_POST_ID}/comments/comment-alpha`).get());
    await assertFails(testEnv.unauthenticatedContext().firestore().doc(`communityPosts/${COMMUNITY_POST_ID}`).get());
    await assertFails(authenticatedFirestore(OWNER_UID).doc(`communityPosts/${COMMUNITY_POST_ID}`).update({ "stats.likes": 999 }));
    await assertFails(authenticatedFirestore(OTHER_UID).doc(`communityPosts/${COMMUNITY_POST_ID}/comments/comment-beta`).set({
      authorId: OTHER_UID,
      authorName: "Other",
      body: "Forged browser write",
    }));
  });

  it("denies community interaction reads and writes while gated", async () => {
    const interactionPath = `communityPosts/${COMMUNITY_POST_ID}/interactions/${OWNER_UID}`;
    await seedFirestoreDocument(`communityPosts/${COMMUNITY_POST_ID}`, {
      authorId: OWNER_UID,
      visibility: "public",
      stats: { comments: 0, likes: 0, saves: 0 },
    });
    await seedFirestoreDocument(interactionPath, { userId: OWNER_UID, liked: true });

    await assertFails(authenticatedFirestore(OWNER_UID).doc(interactionPath).get());
    await assertFails(authenticatedFirestore(OTHER_UID).doc(interactionPath).get());
    await assertFails(authenticatedFirestore(OWNER_UID).doc(interactionPath).set({ userId: OWNER_UID, liked: false }));
  });

  it.each([
    ["source.png", "image/png"],
    ["source.jpg", "image/jpeg"],
    ["source.webp", "image/webp"],
  ])("allows only the owner to read saved critique source image %s", async (fileName, contentType) => {
    const sourcePath = `users/${OWNER_UID}/reviews/${REVIEW_ID}/${fileName}`;
    await seedStorageObject(sourcePath, contentType);

    await assertSucceeds(authenticatedStorage(OWNER_UID).ref(sourcePath).getMetadata());
    await assertFails(authenticatedStorage(OTHER_UID).ref(sourcePath).getMetadata());
    await assertFails(testEnv.unauthenticatedContext().storage().ref(sourcePath).getMetadata());
  });

  it("does not expose other review files outside the source image path", async () => {
    const nonSourcePath = `users/${OWNER_UID}/reviews/${REVIEW_ID}/thumbnail.png`;
    await seedStorageObject(nonSourcePath, "image/png");

    await assertFails(authenticatedStorage(OWNER_UID).ref(nonSourcePath).getMetadata());
  });

  it.each(["productEvidenceEvents/event-a", "researchFeedback/response-a"])(
    "keeps server-owned evidence private at %s",
    async (path) => {
      await seedFirestoreDocument(path, { accountHash: "a".repeat(64), environment: "test" });
      await assertFails(authenticatedFirestore(OWNER_UID).doc(path).get());
      await assertFails(authenticatedFirestore(OWNER_UID).doc(path).set({ accountHash: "b".repeat(64) }));
      await assertFails(testEnv.unauthenticatedContext().firestore().doc(path).get());
    },
  );
});

async function seedFirestoreDocument(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(path).set(data);
  });
}

async function seedStorageObject(path: string, contentType: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.storage().ref(path).put(new Uint8Array([1, 2, 3]), { contentType });
  });
}

function authenticatedFirestore(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function authenticatedStorage(uid: string) {
  return testEnv.authenticatedContext(uid).storage();
}

function validDraftRecord() {
  return {
    userId: OWNER_UID,
    origin: "draft",
    status: "draft",
    step: 2,
    category: "logo",
    mode: "mentor",
    brief: {
      audience: "Independent designers",
      purpose: "Evaluate a brand mark",
      style: "Bold minimal identity",
      goal: "Improve first impression",
      concern: "",
    },
    createdAt: new Date("2026-08-11T09:30:00.000Z"),
    updatedAt: new Date("2026-08-11T09:30:00.000Z"),
  };
}

function validImportedRecord() {
  return {
    id: "user-a_imported",
    userId: OWNER_UID,
    origin: "imported",
    status: "imported",
    category: "logo",
    categoryLabel: "Logo",
    savedAt: "2026-08-11T09:30:00.000Z",
    updatedAt: "2026-08-11T09:30:00.000Z",
    syncState: "cloud",
    review: {
      id: "imported",
      createdAt: "2026-08-11T09:30:00.000Z",
      overallScore: 7,
      summary: "A private imported critique.",
      strengths: ["Clear hierarchy."],
      scores: [{ label: "Clarity", score: 7 }],
      rubricVersion: "legacy",
      issues: [{
        id: "issue-1",
        category: "Clarity",
        score: 7,
        priority: "medium",
        observation: "Spacing is uneven.",
        impact: "The mark feels less deliberate.",
        recommendation: "Normalize spacing.",
        actions: ["Use one spacing unit."],
      }],
      annotations: [],
      checklist: [{ label: "Normalize spacing.", priority: "medium" }],
      followUps: [],
      provider: "demo",
    },
  };
}
