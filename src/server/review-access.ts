export type ReviewAccessCandidate = {
  uid: string;
  email_verified?: unknown;
  iroguide_review_entitled?: unknown;
};

export function hasReviewGenerationAccess(user: ReviewAccessCandidate) {
  if (user.email_verified !== true) return false;
  if (user.iroguide_review_entitled === true) return true;

  return getCsvEnvSet(process.env.IROGUIDE_REVIEW_ENTITLED_UIDS).has(user.uid);
}

function getCsvEnvSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}
