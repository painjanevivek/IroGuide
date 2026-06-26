"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  accountReviewQueryConstraints,
  DEFAULT_ACCOUNT_REVIEW_LIMIT,
  hasCachedOnlyAccountReviews,
  mapAccountReviewSnapshot,
  mergeAccountReviews,
  readCachedAccountReviews,
  type AccountStoredReview,
} from "@/lib/account-reviews";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";
import { syncPendingAccountReviews } from "@/lib/review-sync";

type UseAccountReviewsOptions = {
  maxReviews?: number;
  user: User | null;
};

export function useAccountReviews({
  maxReviews = DEFAULT_ACCOUNT_REVIEW_LIMIT,
  user,
}: UseAccountReviewsOptions) {
  const [cloudReviews, setCloudReviews] = useState<AccountStoredReview[]>([]);
  const [cachedReviews, setCachedReviews] = useState<AccountStoredReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setCloudReviews([]);
        setCachedReviews([]);
        setLoadError("");
        setLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;

    function refreshCachedReviews() {
      if (!active) return;
      setCachedReviews(readCachedAccountReviews(currentUser.uid));
    }

    async function syncPendingReviews() {
      try {
        await syncPendingAccountReviews({
          getIdToken: () => currentUser.getIdToken(),
          userId: currentUser.uid,
        });
      } catch {
        // Cached reviews remain private and available locally; online/revisit retries sync.
      } finally {
        refreshCachedReviews();
      }
    }

    const refreshTimer = window.setTimeout(() => {
      refreshCachedReviews();
      void syncPendingReviews();
    }, 0);
    window.addEventListener("online", syncPendingReviews);

    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("online", syncPendingReviews);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    queueMicrotask(() => {
      setLoadError("");
      setLoading(true);
    });

    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => {
        setCloudReviews([]);
        setLoadError("");
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseClientFirestore();
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("userId", "==", currentUser.uid),
      ...accountReviewQueryConstraints(),
    );

    return onSnapshot(
      reviewsQuery,
      (snapshot) => {
        setCloudReviews(mapAccountReviewSnapshot(snapshot.docs, maxReviews));
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        setCloudReviews([]);
        setLoadError(error.message);
        setLoading(false);
      },
    );
  }, [maxReviews, user]);

  const reviews = useMemo(
    () => mergeAccountReviews(cloudReviews, cachedReviews, maxReviews),
    [cachedReviews, cloudReviews, maxReviews],
  );
  const hasCachedOnlyReviews = useMemo(
    () => hasCachedOnlyAccountReviews(cloudReviews, cachedReviews),
    [cachedReviews, cloudReviews],
  );

  return {
    cachedReviews,
    cloudReviews,
    hasCachedOnlyReviews,
    loadError,
    loading,
    reviews,
  };
}
