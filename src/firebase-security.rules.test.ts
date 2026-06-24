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
const DRAFT_ID = "draft-alpha";
const OWNER_UID = "user-a";
const OTHER_UID = "user-b";

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

  it("requires review writes to keep userId owned by the signed-in account", async () => {
    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviews/${REVIEW_ID}`).set({
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

  it("requires draft writes to keep userId owned by the signed-in account", async () => {
    await assertSucceeds(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set({
      id: DRAFT_ID,
      userId: OWNER_UID,
      status: "draft",
    }));

    await assertFails(authenticatedFirestore(OTHER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set({
      id: DRAFT_ID,
      userId: OWNER_UID,
      status: "draft",
    }));

    await assertFails(authenticatedFirestore(OWNER_UID).doc(`reviewDrafts/${DRAFT_ID}`).set({
      id: DRAFT_ID,
      userId: OTHER_UID,
      status: "draft",
    }));
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
