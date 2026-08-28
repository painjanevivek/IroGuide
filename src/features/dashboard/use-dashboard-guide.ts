"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { DashboardGuide } from "@/domain/dashboard-guide";
import { loadDashboardGuide } from "@/lib/dashboard-guide-client";
import { LearningRequestError } from "@/lib/learning-api-client";

export function useDashboardGuide(user: User | null) {
  const [guide, setGuide] = useState<DashboardGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<number | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const retry = useCallback(() => setRequestKey((value) => value + 1), []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError("");
      setStatus(null);
    });
    void loadDashboardGuide(user, controller.signal).then((nextGuide) => {
      setGuide(nextGuide);
      setLoading(false);
    }).catch((loadError) => {
      if (controller.signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Your next step could not load.");
      setStatus(loadError instanceof LearningRequestError ? loadError.status : 503);
      setLoading(false);
    });
    return () => controller.abort();
  }, [requestKey, user]);

  return { error, guide, loading, retry, status };
}
