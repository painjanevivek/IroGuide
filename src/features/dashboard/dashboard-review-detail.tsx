"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { LoaderCircle, LayoutDashboard } from "lucide-react";
import { getReviewTrustState, storedReviewDocumentSchema, type StoredReviewDocument } from "@/domain/review-storage";
import { useAuth } from "@/features/auth/auth-provider";
import { useLaunchCapabilities } from "@/features/capabilities/launch-capabilities-provider";
import { ReviewResult } from "@/features/review/review-studio";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";
import { getReviewSourceImageDownloadUrl } from "@/lib/firebase/storage";
import { getCachedReviewDocuments } from "@/lib/review-persistence";
import { getCachedLocalReviewSourceImage } from "@/lib/review-source-image-cache";
import { captureProductEvidence, getReviewAgeBucket } from "@/lib/product-evidence";

export function DashboardReviewDetail({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const { sourceImageStorage } = useLaunchCapabilities();
  const router = useRouter();
  const [document, setDocument] = useState<StoredReviewDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const recordedDocumentRef = useRef("");

  useEffect(() => {
    if (!document || !user || recordedDocumentRef.current === document.id) return;
    recordedDocumentRef.current = document.id;
    void captureProductEvidence(user, {
      name: "review_detail_reopened",
      ageBucket: getReviewAgeBucket(document.savedAt),
      trustState: document.syncState === "local" ? "local-unverified" : getReviewTrustState(document),
    });
  }, [document, user]);

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

        const snapshotData = snapshot.data();
        const parsed = storedReviewDocumentSchema.safeParse({
          ...snapshotData,
          savedAt: toIsoDate(snapshotData.savedAt),
          updatedAt: toIsoDate(snapshotData.updatedAt),
        });
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
    if (!document || !user) {
      queueMicrotask(() => setPreviewUrl(null));
      return;
    }

    const currentDocument = document;
    const currentUser = user;
    let active = true;
    let localObjectUrl: string | null = null;

    async function loadPreview() {
      if (sourceImageStorage && currentDocument.sourceImage) {
        try {
          const cloudUrl = await getReviewSourceImageDownloadUrl(currentDocument.sourceImage, currentUser.uid);
          if (active) setPreviewUrl(cloudUrl);
          return;
        } catch {
          // Fall back to the browser's private local source image cache below.
        }
      }

      const localSourceImage = await getCachedLocalReviewSourceImage(currentUser.uid, currentDocument.id);
      if (!active) return;

      if (localSourceImage) {
        localObjectUrl = URL.createObjectURL(localSourceImage);
        setPreviewUrl(localObjectUrl);
      } else {
        setPreviewUrl(null);
      }
    }

    void loadPreview();

    return () => {
      active = false;
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
  }, [document, sourceImageStorage, user]);

  if (document) {
    return (
      <ReviewResult
        initialSaveError=""
        initialSaveState={document.syncState === "cloud" ? "saved" : "local"}
        initialSourceImage={sourceImageStorage ? document.sourceImage ?? null : null}
        onRestart={() => router.push("/review/new")}
        preview={previewUrl}
        review={document.review}
        reviewDocumentId={document.id}
        trustState={getReviewTrustState(document)}
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

function toIsoDate(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString() as string;
  }
  return "";
}
