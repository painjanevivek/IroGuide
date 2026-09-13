"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [retrying, setRetrying] = useState(false);
  const [syncAttempt, setSyncAttempt] = useState(0);
  const activeUserRef = useRef<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const retry = useCallback(() => {
    setRetrying(true);
    setSyncAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    const nextUserId = user?.uid ?? null;
    if (activeUserRef.current === nextUserId) return;
    activeUserRef.current = nextUserId;

    queueMicrotask(() => {
      setCloudReviews([]);
      setCachedReviews([]);
      setLoadError("");
      setLoading(false);
      setRetrying(false);
      loadedUserRef.current = null;
    });
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
          revalidateCloudImports: syncAttempt > 0,
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
    function handleOnline() {
      retry();
    }

    window.addEventListener("online", handleOnline);

    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("online", handleOnline);
    };
  }, [retry, syncAttempt, user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    const isInitialLoad = loadedUserRef.current !== currentUser.uid;
    queueMicrotask(() => {
      if (isInitialLoad) setLoadError("");
      setLoading(isInitialLoad);
      setRetrying(!isInitialLoad);
    });

    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => {
        setCloudReviews([]);
        setLoadError("");
        setLoading(false);
        setRetrying(false);
        loadedUserRef.current = currentUser.uid;
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
        loadedUserRef.current = currentUser.uid;
        setCloudReviews(mapAccountReviewSnapshot(snapshot.docs, maxReviews));
        setLoadError("");
        setLoading(false);
        setRetrying(false);
      },
      (error) => {
        loadedUserRef.current = currentUser.uid;
        setLoadError(error.message);
        setLoading(false);
        setRetrying(false);
      },
    );
  }, [maxReviews, syncAttempt, user]);

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
    retry,
    retrying,
    reviews,
  };
}
