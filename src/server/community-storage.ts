import "server-only";

import { communityMutationSchema } from "@/domain/community";
import {
  createCommunityComment,
  deleteCommunityComment,
  editCommunityProjection,
  hideCommunityProjection,
  listCommunityComments,
  listCommunityProjections,
  publishCommunityProjection,
  setCommunityInteraction,
  CommunityMutationError,
} from "./community-projection-storage";
import type { CommunityActor } from "./community-records";
import {
  deleteCommunityDataForUser,
  reportCommunityTarget,
  setCommunityBlock,
  submitCommunityAppeal,
  CommunityDeletionIncompleteError,
  getCommunityAccountRiskState,
  type CommunityDeleteResult,
} from "./community-user-safety-storage";

export { CommunityDeletionIncompleteError, CommunityMutationError, deleteCommunityDataForUser, getCommunityAccountRiskState, listCommunityComments, listCommunityProjections };
export type { CommunityDeleteResult };

export async function mutateCommunity(actor: CommunityActor, input: unknown) {
  const mutation = communityMutationSchema.parse(input);
  switch (mutation.action) {
    case "publish": return publishCommunityProjection(actor, mutation);
    case "edit-post": return editCommunityProjection(actor, mutation);
    case "delete-post":
    case "withdraw-consent": return hideCommunityProjection(actor, mutation);
    case "comment": return createCommunityComment(actor, mutation);
    case "delete-comment": return deleteCommunityComment(actor, mutation);
    case "interaction": return setCommunityInteraction(actor, mutation);
    case "block":
    case "unblock": return setCommunityBlock(actor, mutation);
    case "report": return reportCommunityTarget(actor, mutation);
    case "appeal": return submitCommunityAppeal(actor, mutation);
  }
}
