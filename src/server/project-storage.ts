import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { DocumentReference, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  deriveProjectNextAction,
  emptyProjectArtifactCounts,
  projectSchema,
  publicProjectSchema,
  UNSORTED_PROJECT_ID,
  unsortedProjectSchema,
  withProjectArtifactTotal,
  type Project,
  type ProjectArtifactCounts,
  type ProjectCreate,
  type ProjectDelete,
  type ProjectPatch,
} from "@/domain/project";
import { assertAccountDeletionUnlocked, assertAccountDeletionUnlockedInTransaction } from "./account-deletion-lock";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const PROJECTS_COLLECTION = "projects";
const PROJECT_MUTATIONS_COLLECTION = "projectMutationReceipts";
const MAX_PROJECTS = 100;
const MAX_ARTIFACTS_PER_COLLECTION = 500;
const MAX_RECENT_MUTATIONS = 20;

const artifactCollections = [
  { key: "briefs", collection: "designBriefDrafts", ownerField: "userId" },
  { key: "selfReviews", collection: "selfReviewSessions", ownerField: "userId" },
  { key: "reviews", collection: "reviews", ownerField: "userId" },
  { key: "reviewJobs", collection: "reviewJobs", ownerField: "userId" },
  { key: "comparisons", collection: "comparisons", ownerField: "userId" },
  { key: "caseStudies", collection: "privateCaseStudies", ownerField: "ownerId" },
] as const;

export class ProjectStorageError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message);
    this.name = "ProjectStorageError";
  }
}

export async function listProjectsForUser(userId: string) {
  await assertAccountDeletionUnlocked(userId);
  const db = await getFirebaseAdminFirestore();
  const [projectsSnapshot, artifacts] = await Promise.all([
    db.collection(PROJECTS_COLLECTION).where("userId", "==", userId).limit(MAX_PROJECTS + 1).get(),
    loadOwnedArtifacts(db, userId),
  ]);
  if (projectsSnapshot.size > MAX_PROJECTS) throw new ProjectStorageError("Project limit exceeded. Contact support.", 409);

  const counts = countArtifacts(artifacts);
  const projects = projectsSnapshot.docs.map((document) => {
    const parsed = parseOwnedProject(document, userId);
    const artifactCounts = counts.byProject.get(parsed.id) ?? emptyProjectArtifactCounts();
    return toPublicProject({ ...parsed, artifactCounts, nextAction: deriveProjectNextAction({ ...parsed, artifactCounts }) });
  }).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

  const unsorted = unsortedProjectSchema.parse({
    schemaVersion: 1,
    id: UNSORTED_PROJECT_ID,
    name: "Unsorted",
    category: null,
    goal: "Legacy and unassigned artifacts remain available here until you organize them.",
    status: "active",
    revision: 0,
    artifactCounts: counts.unsorted,
    nextAction: "continue-project",
    createdAt: null,
    updatedAt: null,
    virtual: true,
  });
  return { projects, unsorted, truncatedArtifacts: artifacts.some((entry) => entry.truncated) };
}

export async function getProjectForUser(userId: string, id: string) {
  if (id === UNSORTED_PROJECT_ID) return (await listProjectsForUser(userId)).unsorted;
  await assertAccountDeletionUnlocked(userId);
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection(PROJECTS_COLLECTION).doc(id).get();
  const project = parseOwnedProject(snapshot, userId);
  const artifacts = await loadOwnedArtifacts(db, userId);
  const artifactCounts = countArtifacts(artifacts).byProject.get(id) ?? emptyProjectArtifactCounts();
  return toPublicProject({ ...project, artifactCounts, nextAction: deriveProjectNextAction({ ...project, artifactCounts }) });
}

export async function createProject(userId: string, input: ProjectCreate, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const receiptReference = db.collection(PROJECT_MUTATIONS_COLLECTION).doc(mutationReceiptId(userId, input.mutationId));
  return db.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptReference);
    if (receipt.exists) {
      const existingId = receipt.data()?.projectId;
      if (typeof existingId !== "string") throw new ProjectStorageError("Project mutation receipt is invalid.", 409);
      return toPublicProject(parseOwnedProject(await transaction.get(db.collection(PROJECTS_COLLECTION).doc(existingId)), userId));
    }
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const limitSnapshot = await transaction.get(db.collection(PROJECTS_COLLECTION).where("userId", "==", userId).limit(MAX_PROJECTS));
    if (limitSnapshot.size >= MAX_PROJECTS) throw new ProjectStorageError("You can keep up to 100 projects.", 409);
    const id = randomUUID();
    const timestamp = now.toISOString();
    const project = projectSchema.parse({
      schemaVersion: 1,
      id,
      userId,
      name: input.name,
      category: input.category,
      goal: input.goal,
      status: "active",
      revision: 0,
      artifactCounts: emptyProjectArtifactCounts(),
      nextAction: "start-learning",
      createdAt: timestamp,
      updatedAt: timestamp,
      recentMutationIds: [input.mutationId],
    });
    transaction.create(db.collection(PROJECTS_COLLECTION).doc(id), project);
    transaction.create(receiptReference, { schemaVersion: 1, projectId: id, userId, createdAt: timestamp });
    return toPublicProject(project);
  });
}

export async function patchProject(userId: string, id: string, input: ProjectPatch, now = new Date()) {
  if (id === UNSORTED_PROJECT_ID) throw new ProjectStorageError("Unsorted is a virtual project and cannot be changed.", 409);
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(PROJECTS_COLLECTION).doc(id);
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const current = parseOwnedProject(await transaction.get(reference), userId);
    if (current.recentMutationIds.includes(input.mutationId)) return toPublicProject(current);
    if (current.revision !== input.expectedRevision) throw new ProjectStorageError("Project changed in another session. Refresh and try again.", 409, { currentRevision: current.revision });
    const next = projectSchema.parse({
      ...current,
      ...input.changes,
      revision: current.revision + 1,
      updatedAt: now.toISOString(),
      recentMutationIds: appendMutation(current.recentMutationIds, input.mutationId),
    });
    transaction.set(reference, next);
    return toPublicProject(next);
  });
}

export async function deleteProject(userId: string, id: string, input: ProjectDelete, now = new Date()) {
  if (id === UNSORTED_PROJECT_ID) throw new ProjectStorageError("Unsorted is permanent and cannot be deleted.", 409);
  await assertAccountDeletionUnlocked(userId);
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(PROJECTS_COLLECTION).doc(id);
  const current = parseOwnedProject(await reference.get(), userId);
  if (current.revision !== input.expectedRevision && !current.recentMutationIds.includes(input.mutationId)) {
    throw new ProjectStorageError("Project changed in another session. Refresh and try again.", 409, { currentRevision: current.revision });
  }
  const artifacts = await loadOwnedArtifacts(db, userId);
  const owned = artifacts.flatMap((entry) => entry.documents.filter((document) => document.data().projectId === id));
  if (owned.length > 0 && input.transferToProjectId === undefined) {
    throw new ProjectStorageError("Move this project's artifacts before deleting it.", 409, { artifactCount: owned.length });
  }

  const destination = input.transferToProjectId === UNSORTED_PROJECT_ID ? null : input.transferToProjectId ?? null;
  if (destination === id) throw new ProjectStorageError("Choose a different transfer destination.", 400);
  if (destination) parseOwnedProject(await db.collection(PROJECTS_COLLECTION).doc(destination).get(), userId);

  await markProjectTransfer(db, reference, userId, current, input, now);
  if (owned.length > 0) await updateArtifactProjectIds(db, owned, destination);
  const remaining = (await loadOwnedArtifacts(db, userId)).flatMap((entry) => entry.documents.filter((document) => document.data().projectId === id));
  if (remaining.length > 0) throw new ProjectStorageError("Some artifacts changed during transfer. Retry deletion.", 409, { remaining: remaining.length });
  await reference.delete();
  return { deleted: true, transferredArtifacts: owned.length, transferToProjectId: destination };
}

export async function deleteProjectDataForUser(userId: string) {
  const db = await getFirebaseAdminFirestore();
  const [projects, receipts] = await Promise.all([
    db.collection(PROJECTS_COLLECTION).where("userId", "==", userId).get(),
    db.collection(PROJECT_MUTATIONS_COLLECTION).where("userId", "==", userId).get(),
  ]);
  await deleteReferences(db, [...projects.docs, ...receipts.docs].map((document) => document.ref));
  return { projectsDeleted: projects.size, projectMutationReceiptsDeleted: receipts.size };
}

export async function assertOwnedProject(userId: string, projectId: string | null) {
  if (projectId === null) return;
  if (projectId === UNSORTED_PROJECT_ID) throw new ProjectStorageError("Unsorted cannot be stored as a project identifier.", 400);
  await assertAccountDeletionUnlocked(userId);
  const db = await getFirebaseAdminFirestore();
  parseOwnedProject(await db.collection(PROJECTS_COLLECTION).doc(projectId).get(), userId);
}

function parseOwnedProject(snapshot: { exists: boolean; data(): unknown }, userId: string) {
  if (!snapshot.exists) throw new ProjectStorageError("Project not found.", 404);
  const parsed = projectSchema.safeParse(snapshot.data());
  if (!parsed.success || parsed.data.userId !== userId) throw new ProjectStorageError("Project not found.", 404);
  return parsed.data;
}

function toPublicProject(project: Project) {
  const value: Record<string, unknown> = { ...project };
  delete value.userId;
  delete value.recentMutationIds;
  return publicProjectSchema.parse(value);
}

async function loadOwnedArtifacts(db: Firestore, userId: string) {
  return Promise.all(artifactCollections.map(async (descriptor) => {
    const snapshot = await db.collection(descriptor.collection).where(descriptor.ownerField, "==", userId).limit(MAX_ARTIFACTS_PER_COLLECTION + 1).get();
    return {
      ...descriptor,
      documents: snapshot.docs.slice(0, MAX_ARTIFACTS_PER_COLLECTION),
      truncated: snapshot.size > MAX_ARTIFACTS_PER_COLLECTION,
    };
  }));
}

function countArtifacts(artifacts: Awaited<ReturnType<typeof loadOwnedArtifacts>>) {
  const rawByProject = new Map<string, Omit<ProjectArtifactCounts, "total">>();
  const unsortedRaw = emptyCountWithoutTotal();
  for (const entry of artifacts) {
    for (const document of entry.documents) {
      const projectId = typeof document.data().projectId === "string" ? document.data().projectId : null;
      const target = projectId ? rawByProject.get(projectId) ?? emptyCountWithoutTotal() : unsortedRaw;
      target[entry.key] += 1;
      if (projectId) rawByProject.set(projectId, target);
    }
  }
  return {
    byProject: new Map([...rawByProject].map(([id, counts]) => [id, withProjectArtifactTotal(counts)])),
    unsorted: withProjectArtifactTotal(unsortedRaw),
  };
}

function emptyCountWithoutTotal(): Omit<ProjectArtifactCounts, "total"> {
  return { briefs: 0, selfReviews: 0, reviews: 0, reviewJobs: 0, comparisons: 0, caseStudies: 0 };
}

async function markProjectTransfer(db: Firestore, reference: DocumentReference, userId: string, current: Project, input: ProjectDelete, now: Date) {
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const latest = parseOwnedProject(await transaction.get(reference), userId);
    if (latest.recentMutationIds.includes(input.mutationId)) return;
    if (latest.revision !== current.revision) throw new ProjectStorageError("Project changed during transfer. Refresh and try again.", 409);
    transaction.set(reference, projectSchema.parse({
      ...latest,
      status: "archived",
      revision: latest.revision + 1,
      updatedAt: now.toISOString(),
      recentMutationIds: appendMutation(latest.recentMutationIds, input.mutationId),
    }));
  });
}

async function updateArtifactProjectIds(db: Firestore, documents: QueryDocumentSnapshot[], projectId: string | null) {
  for (let offset = 0; offset < documents.length; offset += 400) {
    const batch = db.batch();
    for (const document of documents.slice(offset, offset + 400)) batch.update(document.ref, { projectId });
    await batch.commit();
  }
}

async function deleteReferences(db: Firestore, references: DocumentReference[]) {
  for (let offset = 0; offset < references.length; offset += 400) {
    const batch = db.batch();
    for (const reference of references.slice(offset, offset + 400)) batch.delete(reference);
    await batch.commit();
  }
}

function appendMutation(values: string[], mutationId: string) {
  return [...values.filter((value) => value !== mutationId), mutationId].slice(-MAX_RECENT_MUTATIONS);
}

function mutationReceiptId(userId: string, mutationId: string) {
  return createHash("sha256").update(`${userId}\0${mutationId}`).digest("hex");
}
