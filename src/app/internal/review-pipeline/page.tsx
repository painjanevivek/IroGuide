import { notFound } from "next/navigation";
import { AuthGate } from "@/features/auth/auth-gate";
import { ReviewPipelineWorkbench } from "@/features/review-pipeline/review-pipeline-workbench";
import { getReviewPipelineStatus } from "@/server/review-pipeline-config";

export const dynamic = "force-dynamic";

export default function InternalReviewPipelinePage() {
  if (!getReviewPipelineStatus().enabled) notFound();
  return (
    <AuthGate>
      <ReviewPipelineWorkbench />
    </AuthGate>
  );
}
