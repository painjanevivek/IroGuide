import { getFirebaseAdminFirestore } from "@/server/firebase-admin";
import type { Query } from "firebase-admin/firestore";

export type CommunityDeleteResult = {
  commentsDeleted: number;
  interactionsDeleted: number;
  postsDeleted: number;
};

export async function deleteCommunityDataForUser(userId: string): Promise<CommunityDeleteResult> {
  const db = await getFirebaseAdminFirestore();
  const ownedPosts = await db.collection("communityPosts").where("authorId", "==", userId).get();
  const ownedPostPaths = new Set(ownedPosts.docs.map((post) => post.ref.path));

  const [commentsDeleted, interactionsDeleted] = await Promise.all([
    deleteCollectionGroupDocuments(db.collectionGroup("comments").where("authorId", "==", userId), ownedPostPaths),
    deleteCollectionGroupDocuments(db.collectionGroup("interactions").where("userId", "==", userId), ownedPostPaths),
  ]);

  await Promise.all(ownedPosts.docs.map((post) => db.recursiveDelete(post.ref)));
  return { commentsDeleted, interactionsDeleted, postsDeleted: ownedPosts.size };
}

async function deleteCollectionGroupDocuments(
  query: Query,
  ownedPostPaths: Set<string>,
) {
  const snapshot = await query.get();
  await Promise.all(snapshot.docs.map((document) => {
    const post = document.ref.parent.parent;
    return post && !ownedPostPaths.has(post.path) ? document.ref.delete() : Promise.resolve();
  }));
  return snapshot.docs.filter((document) => {
    const post = document.ref.parent.parent;
    return post && !ownedPostPaths.has(post.path);
  }).length;
}
