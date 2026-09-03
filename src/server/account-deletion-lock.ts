import "server-only";

import type { Firestore, Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "./firebase-admin";

export const ACCOUNT_DELETION_LOCKS_COLLECTION = "reviewDeletionLocks";

export class AccountDeletionInProgressError extends Error {
  readonly status = 409;

  constructor() {
    super("Account deletion is already in progress.");
    this.name = "AccountDeletionInProgressError";
  }
}

export async function assertAccountDeletionUnlocked(userId: string) {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection(ACCOUNT_DELETION_LOCKS_COLLECTION).doc(userId).get();
  if (snapshot.exists) throw new AccountDeletionInProgressError();
}

export async function assertAccountDeletionUnlockedInTransaction({
  db,
  transaction,
  userId,
}: {
  db: Firestore;
  transaction: Transaction;
  userId: string;
}) {
  const lock = await transaction.get(db.collection(ACCOUNT_DELETION_LOCKS_COLLECTION).doc(userId));
  if (lock.exists) throw new AccountDeletionInProgressError();
}
