"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { LoaderCircle, LayoutDashboard } from "lucide-react";
import { storedReviewDocumentSchema, type StoredReviewDocument } from "@/domain/review-storage";
import { useAuth } from "@/features/auth/auth-provider";
import { ReviewResult } from "@/features/review/review-studio";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";
import { getReviewSourceImageDownloadUrl } from "@/lib/firebase/storage";
import { getCachedReviewDocuments } from "@/lib/review-persistence";

export function DashboardReviewDetail({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<StoredReviewDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;

    async function loadReview() {
      setLoading(true);
      setError("");

      const cachedDocument = getCachedReviewDocuments(currentUser.uid).find((item) => item.id === documentId) ?? null;
      if (cachedDocument && active) {
        setDocument(cachedDocument);
      }

      if (isE2ELocalAuthEnabled()) {
        if (active) {
          setError(cachedDocument ? "" : "This review is not available in this browser.");
          setLoading(false);
        }
        return;
      }

      try {
        const snapshot = await getDoc(doc(getFirebaseClientFirestore(), "reviews", documentId));
        if (!active) return;
        if (!snapshot.exists()) {
          setError(cachedDocument ? "" : "This review could not be found.");
          return;
        }

        const parsed = storedReviewDocumentSchema.safeParse(snapshot.data());
        if (!parsed.success || parsed.data.userId !== currentUser.uid) {
          setError(cachedDocument ? "" : "This review could not be opened.");
          return;
        }

        setDocument(parsed.data);
      } catch (loadError) {
        if (!active) return;
        setError(cachedDocument ? "" : loadError instanceof Error ? loadError.message : "This review could not be opened.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReview();

    return () => {
      active = false;
    };
  }, [documentId, user]);

  useEffect(() => {
    if (!document?.sourceImage || !user) {
      queueMicrotask(() => setPreviewUrl(null));
      return;
    }

    let active = true;
    void getReviewSourceImageDownloadUrl(document.sourceImage, user.uid)
      .then((url) => {
        if (active) setPreviewUrl(url);
      })
      .catch(() => {
        if (active) setPreviewUrl(null);
      });

    return () => {
      active = false;
    };
  }, [document, user]);

  if (document) {
    return (
      <ReviewResult
        category={document.category}
        initialSaveError=""
        initialSaveState={document.syncState === "cloud" ? "saved" : "local"}
        initialSourceImage={document.sourceImage ?? null}
        onRestart={() => router.push("/review/new")}
        preview={previewUrl}
        review={document.review}
        sourceFile={null}
      />
    );
  }

  return (
    <main className="dashboard-main">
      <div className={`dashboard-empty${error ? " is-error" : " is-loading"}`}>
        <div>
          {loading ? <LoaderCircle className="spin" size={38} /> : <LayoutDashboard size={38} />}
          <h2>{loading ? "Opening review" : "Review unavailable"}</h2>
          <p>{error || "Loading the saved critique from your private workspace."}</p>
        </div>
      </div>
    </main>
  );
}
