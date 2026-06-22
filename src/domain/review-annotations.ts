import type { ReviewOutput } from "./review";

type ReviewIssue = ReviewOutput["issues"][number];
type ReviewAnnotation = ReviewOutput["annotations"][number];

export type SafeReviewAnnotation = ReviewAnnotation & {
  issueCategory: string;
  issueIndex: number;
  issueDomId: string;
};

export function getAnnotationIssueId(issue: ReviewIssue, index: number): string {
  return issue.id ?? `issue-${index + 1}`;
}

export function getSafeReviewAnnotations(
  review: Pick<ReviewOutput, "annotations" | "issues">,
): SafeReviewAnnotation[] {
  const issueLookup = new Map(
    review.issues.map((issue, index) => [
      getAnnotationIssueId(issue, index),
      {
        category: issue.category,
        domId: `review-${getAnnotationIssueId(issue, index)}`,
        index,
      },
    ]),
  );

  return review.annotations.flatMap((annotation) => {
    const issue = issueLookup.get(annotation.issueId);
    const box = normalizeBox(annotation);

    if (!issue || !box) {
      return [];
    }

    return [{
      ...annotation,
      ...box,
      issueCategory: issue.category,
      issueDomId: issue.domId,
      issueIndex: issue.index,
    }];
  });
}

function normalizeBox(annotation: ReviewAnnotation): Pick<ReviewAnnotation, "x" | "y" | "width" | "height"> | null {
  if (![annotation.x, annotation.y, annotation.width, annotation.height].every(Number.isFinite)) {
    return null;
  }

  const width = clamp(annotation.width, 0.02, 1);
  const height = clamp(annotation.height, 0.02, 1);

  return {
    width,
    height,
    x: clamp(annotation.x, 0, 1 - width),
    y: clamp(annotation.y, 0, 1 - height),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
