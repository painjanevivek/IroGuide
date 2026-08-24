"use client";

import { useEffect, useRef } from "react";
import type { ProductEvidenceEventInput } from "@/domain/product-evidence";
import { useAuth } from "@/features/auth/auth-provider";
import { captureProductEvidence } from "@/lib/product-evidence";

export function ProductEvidencePageView({ event }: { event: ProductEvidenceEventInput }) {
  const { loading, user } = useAuth();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || recordedRef.current) return;
    recordedRef.current = true;
    void captureProductEvidence(user, event);
  }, [event, loading, user]);

  return null;
}
