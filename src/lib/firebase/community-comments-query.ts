import {
  collection,
  limit,
  orderBy,
  query,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase/firestore";

export const COMMUNITY_COMMENT_PAGE_SIZE = 4;

export function getRecentCommunityCommentsQuery(db: Firestore, postId: string): Query<DocumentData> {
  return query(
    collection(db, "communityPosts", postId, "comments"),
    orderBy("createdAt", "desc"),
    limit(COMMUNITY_COMMENT_PAGE_SIZE),
  );
}
