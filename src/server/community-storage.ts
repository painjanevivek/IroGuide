import { z } from "zod";
import { communityCommentSchema, communityMutationSchema, communityPostSchema, type CommunityMutation } from "@/domain/community";
import { reviewOutputSchema } from "@/domain/review";
import { getFirebaseAdminFirestore } from "@/server/firebase-admin";
import type { Query } from "firebase-admin/firestore";

export type CommunityDeleteResult = {
  commentsDeleted: number;
  interactionsDeleted: number;
  postsDeleted: number;
};

type CommunityActor = {
  uid: string;
  email?: unknown;
  name?: unknown;
  picture?: unknown;
};

const storedCommunityReviewSchema = z.object({
  userId: z.string().min(1),
  categoryLabel: z.string().min(1).max(80),
  review: reviewOutputSchema,
});

export class CommunityMutationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CommunityMutationError";
  }
}

export async function mutateCommunity(actor: CommunityActor, input: unknown) {
  const mutation = communityMutationSchema.parse(input);
  if (mutation.action === "publish") return publishCommunityPost(actor, mutation);
  if (mutation.action === "comment") return createCommunityComment(actor, mutation);
  return setCommunityInteraction(actor, mutation);
}

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

async function publishCommunityPost(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "publish" }>) {
  const db = await getFirebaseAdminFirestore();
  const reviewSnapshot = await db.collection("reviews").doc(mutation.reviewId).get();
  const reviewDocument = reviewSnapshot.exists ? storedCommunityReviewSchema.safeParse(reviewSnapshot.data()) : null;
  if (!reviewDocument?.success || reviewDocument.data.userId !== actor.uid) {
    throw new CommunityMutationError("The selected critique is no longer available.", 404);
  }

  const review = reviewDocument.data;
  const post = communityPostSchema.parse({
    authorId: actor.uid,
    authorName: getCommunityAuthorName(actor),
    ...(getCommunityAvatarUrl(actor) ? { authorAvatarUrl: getCommunityAvatarUrl(actor) } : {}),
    reviewId: mutation.reviewId,
    title: mutation.title ?? getDefaultPostTitle(review.review.summary),
    ...(mutation.note ? { note: mutation.note } : {}),
    category: review.categoryLabel,
    visibility: "public",
    review: review.review,
    stats: { comments: 0, likes: 0, saves: 0 },
  });
  const [{ FieldValue }] = await Promise.all([import("firebase-admin/firestore")]);
  const postRef = db.collection("communityPosts").doc();
  await postRef.set({ ...post, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { id: postRef.id };
}

async function createCommunityComment(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "comment" }>) {
  const db = await getFirebaseAdminFirestore();
  const [{ FieldValue }] = await Promise.all([import("firebase-admin/firestore")]);
  const postRef = db.collection("communityPosts").doc(mutation.postId);
  const commentRef = postRef.collection("comments").doc();
  const comment = communityCommentSchema.parse({
    authorId: actor.uid,
    authorName: getCommunityAuthorName(actor),
    body: mutation.body,
  });

  await db.runTransaction(async (transaction) => {
    const post = await transaction.get(postRef);
    if (!post.exists || post.data()?.visibility !== "public") {
      throw new CommunityMutationError("This community post is no longer available.", 404);
    }
    transaction.set(commentRef, { ...comment, createdAt: FieldValue.serverTimestamp() });
    transaction.update(postRef, {
      "stats.comments": getNonNegativeCounter(post.data()?.stats?.comments) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: commentRef.id };
}

async function setCommunityInteraction(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "interaction" }>) {
  const db = await getFirebaseAdminFirestore();
  const [{ FieldValue }] = await Promise.all([import("firebase-admin/firestore")]);
  const postRef = db.collection("communityPosts").doc(mutation.postId);
  const interactionRef = postRef.collection("interactions").doc(actor.uid);

  await db.runTransaction(async (transaction) => {
    const [post, interaction] = await Promise.all([transaction.get(postRef), transaction.get(interactionRef)]);
    if (!post.exists || post.data()?.visibility !== "public") {
      throw new CommunityMutationError("This community post is no longer available.", 404);
    }

    const currentValue = interaction.data()?.[mutation.key] === true;
    if (currentValue === mutation.value) return;

    transaction.set(interactionRef, {
      [mutation.key]: mutation.value,
      userId: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const stat = mutation.key === "liked" ? "likes" : mutation.key === "saved" ? "saves" : null;
    if (stat) {
      transaction.update(postRef, {
        [`stats.${stat}`]: Math.max(0, getNonNegativeCounter(post.data()?.stats?.[stat]) + (mutation.value ? 1 : -1)),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

function getCommunityAuthorName(actor: CommunityActor) {
  const name = typeof actor.name === "string" ? actor.name.trim().slice(0, 80) : "";
  const emailName = typeof actor.email === "string" ? actor.email.split("@")[0]?.trim().slice(0, 80) : "";
  return name || emailName || "IroGuide designer";
}

function getCommunityAvatarUrl(actor: CommunityActor) {
  return typeof actor.picture === "string" && actor.picture.length <= 100_000 ? actor.picture : undefined;
}

function getDefaultPostTitle(summary: string) {
  return summary.trim().slice(0, 120) || "A focused critique";
}

function getNonNegativeCounter(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
