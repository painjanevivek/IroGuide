import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { reviewDraftSchema, type ReviewDraft } from "@/domain/review-draft";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";

export async function loadActiveReviewDraft(userId: string): Promise<ReviewDraft | null> {
  if (isE2ELocalAuthEnabled()) return null;
  const snapshot = await getDoc(doc(getFirebaseClientFirestore(), "reviewDrafts", getActiveReviewDraftId(userId)));
  if (!snapshot.exists()) return null;
  const parsed = reviewDraftSchema.safeParse(snapshot.data());
  return parsed.success ? parsed.data : null;
}

export async function saveActiveReviewDraft(draft: ReviewDraft) {
  if (isE2ELocalAuthEnabled()) return;
  await setDoc(doc(getFirebaseClientFirestore(), "reviewDrafts", getActiveReviewDraftId(draft.userId)), {
    ...draft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteActiveReviewDraft(userId: string) {
  if (isE2ELocalAuthEnabled()) return;
  await deleteDoc(doc(getFirebaseClientFirestore(), "reviewDrafts", getActiveReviewDraftId(userId)));
}

export function getActiveReviewDraftId(userId: string) {
  return `${userId}_active`;
}
