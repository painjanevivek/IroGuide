export type ReviewAccessCandidate = {
  uid: string;
  email_verified?: unknown;
};

export function hasReviewGenerationAccess(user: ReviewAccessCandidate) {
  return user.uid.trim().length > 0 && user.email_verified === true;
}
