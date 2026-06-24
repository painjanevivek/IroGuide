"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef } from "react";
import { syncPendingAccountReviews } from "@/lib/review-sync";

const SYNC_INTERVAL_MS = 60_000;

export function AccountSyncManager({ user }: { user: User | null }) {
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const syncNow = async () => {
      if (!active || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await syncPendingAccountReviews({
          getIdToken: () => user.getIdToken(),
          userId: user.uid,
        });
      } catch {
        // Pending reviews stay cached locally; the next trigger retries without interrupting the user.
      } finally {
        inFlightRef.current = false;
      }
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncNow();
    };

    const initialTimer = window.setTimeout(() => {
      void syncNow();
    }, 0);
    const intervalId = window.setInterval(() => {
      void syncNow();
    }, SYNC_INTERVAL_MS);

    window.addEventListener("focus", syncNow);
    window.addEventListener("online", syncNow);
    window.addEventListener("pageshow", syncNow);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncNow);
      window.removeEventListener("online", syncNow);
      window.removeEventListener("pageshow", syncNow);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [user]);

  return null;
}
