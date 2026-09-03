"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Archive, ArrowRight, FolderKanban, FolderOpen, LoaderCircle, Pencil, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { reviewCategories, categoryLabels, type ReviewCategory } from "@/domain/review";
import { PROJECT_SCHEMA_VERSION, UNSORTED_PROJECT_ID, type PublicProject } from "@/domain/project";
import { useAuth } from "@/features/auth/auth-provider";
import { createProject, listProjects, removeProject, updateProject, type ProjectListItem, ProjectsRequestError } from "@/lib/projects-api-client";

type Filter = "active" | "archived" | "all";

export function ProjectsWorkspace() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [unsorted, setUnsorted] = useState<ProjectListItem | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>(Object.create(null) as Record<string, string>);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await listProjects(user);
      setProjects(result.projects);
      setUnsorted(result.unsorted);
      setError(result.truncatedArtifacts ? "Some artifact counts reached the display limit. Contact support before bulk transfers." : null);
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const visibleProjects = useMemo(() => projects.filter((project) => filter === "all" || project.status === filter), [filter, projects]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusyId("new");
    setError(null);
    try {
      await createProject(user, {
        schemaVersion: PROJECT_SCHEMA_VERSION,
        mutationId: crypto.randomUUID(),
        name: String(data.get("name") ?? ""),
        category: normalizeCategory(data.get("category")),
        goal: String(data.get("goal") ?? ""),
      });
      form.reset();
      await reload();
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function saveName(project: PublicProject, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    setBusyId(project.id);
    try {
      await updateProject(user, project.id, { schemaVersion: 1, expectedRevision: project.revision, mutationId: crypto.randomUUID(), changes: { name } });
      setEditingId(null);
      await reload();
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(project: PublicProject, status: PublicProject["status"]) {
    if (!user) return;
    setBusyId(project.id);
    setError(null);
    try {
      await updateProject(user, project.id, { schemaVersion: 1, expectedRevision: project.revision, mutationId: crypto.randomUUID(), changes: { status } });
      await reload();
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(project: PublicProject) {
    if (!user || pendingDeleteId !== project.id) return;
    const transferTarget = project.artifactCounts.total > 0 ? transferTargets[project.id] ?? UNSORTED_PROJECT_ID : undefined;
    setBusyId(project.id);
    setError(null);
    try {
      await removeProject(user, project.id, { schemaVersion: 1, expectedRevision: project.revision, mutationId: crypto.randomUUID(), ...(transferTarget ? { transferToProjectId: transferTarget } : {}) });
      setPendingDeleteId(null);
      await reload();
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="projects-workspace">
      <section className="projects-hero">
        <div><p className="eyebrow"><FolderKanban /> Private projects</p><h1>Organize the work.<br /><span>Keep the evidence.</span></h1><p>Group learning artifacts and future verified critiques without changing or deleting legacy records.</p></div>
        <Link className="button button-dark" href="/learn">Continue learning <ArrowRight /></Link>
      </section>

      <form className="project-create-card" onSubmit={create}>
        <div><p className="mono-label">NEW PROJECT</p><h2>Start with a useful name and goal.</h2></div>
        <label>Name<input name="name" required maxLength={80} placeholder="Client onboarding refresh" /></label>
        <label>Category<select name="category" defaultValue=""><option value="">Choose later</option>{reviewCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <label>Goal<textarea name="goal" maxLength={320} rows={3} placeholder="Clarify the first-use path and reduce hesitation." /></label>
        <button className="button button-lime" type="submit" disabled={busyId === "new"}>{busyId === "new" ? <><LoaderCircle className="spin" /> Creating...</> : <><Plus /> Create project</>}</button>
      </form>

      <section className="projects-list-section" aria-busy={loading}>
        <div className="projects-toolbar">
          <div><p className="mono-label">WORKSPACE</p><h2>Your projects</h2></div>
          <div className="project-filter" role="group" aria-label="Filter projects">{(["active", "archived", "all"] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <div className="projects-empty"><LoaderCircle className="spin" /><p>Loading your private workspace...</p></div> : (
          <div className="project-grid">
            {filter !== "archived" && unsorted && <UnsortedCard project={unsorted} />}
            {visibleProjects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-heading"><span className="project-icon"><FolderOpen /></span><span className={`project-state is-${project.status}`}>{project.status}</span></div>
                {editingId === project.id ? (
                  <form className="project-rename" onSubmit={(event) => void saveName(project, event)}><label>Project name<input name="name" defaultValue={project.name} required maxLength={80} autoFocus /></label><div><button className="button button-small" disabled={busyId === project.id}>Save</button><button className="button-quiet" type="button" onClick={() => setEditingId(null)}>Cancel</button></div></form>
                ) : <><h3>{project.name}</h3><p>{project.goal || "Add a project goal when the direction becomes clear."}</p></>}
                <dl className="project-metrics"><div><dt>Artifacts</dt><dd>{project.artifactCounts.total}</dd></div><div><dt>Category</dt><dd>{project.category ? categoryLabels[project.category] : "Open"}</dd></div></dl>
                <p className="project-next-action">{nextActionCopy(project.nextAction)}</p>
                {project.artifactCounts.total > 0 && <label className="project-transfer">On deletion, move artifacts to<select value={transferTargets[project.id] ?? UNSORTED_PROJECT_ID} onChange={(event) => setTransferTargets((current) => ({ ...current, [project.id]: event.target.value }))}><option value={UNSORTED_PROJECT_ID}>Unsorted</option>{projects.filter((candidate) => candidate.id !== project.id && candidate.status === "active").map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>}
                {pendingDeleteId === project.id && <div className="project-delete-confirm" role="alert"><TriangleAlert /><div><strong>Delete “{project.name}” permanently?</strong><p>{project.artifactCounts.total > 0 ? `Its ${project.artifactCounts.total} artifacts will be transferred first. The project record itself cannot be recovered.` : "This empty project cannot be recovered after deletion."}</p><div><button className="button button-small danger-button" type="button" disabled={busyId === project.id} onClick={() => void confirmDelete(project)}>{busyId === project.id ? "Deleting..." : "Confirm deletion"}</button><button className="button-quiet" type="button" onClick={() => setPendingDeleteId(null)}>Cancel</button></div></div></div>}
                <div className="project-actions">
                  <button type="button" className="button-quiet" onClick={() => setEditingId(project.id)}><Pencil /> Rename</button>
                  <button type="button" className="button-quiet" disabled={busyId === project.id} onClick={() => void setStatus(project, project.status === "active" ? "archived" : "active")}>{project.status === "active" ? <><Archive /> Archive</> : <><RotateCcw /> Restore</>}</button>
                  <button type="button" className="button-quiet danger-link" disabled={busyId === project.id} onClick={() => setPendingDeleteId(project.id)}><Trash2 /> Delete…</button>
                </div>
              </article>
            ))}
            {visibleProjects.length === 0 && filter === "archived" && <div className="projects-empty"><Archive /><h3>No archived projects.</h3><p>Archive a completed project when you want it out of the active workspace.</p></div>}
          </div>
        )}
      </section>
    </main>
  );
}

function UnsortedCard({ project }: { project: ProjectListItem }) {
  return <article className="project-card project-card-unsorted"><div className="project-card-heading"><span className="project-icon"><FolderOpen /></span><span className="project-state">virtual</span></div><h3>{project.name}</h3><p>{project.goal}</p><dl className="project-metrics"><div><dt>Artifacts</dt><dd>{project.artifactCounts.total}</dd></div><div><dt>Migration</dt><dd>Non-destructive</dd></div></dl><Link href="/learn">Create the next artifact <ArrowRight /></Link></article>;
}

function normalizeCategory(value: FormDataEntryValue | null): ReviewCategory | null {
  return typeof value === "string" && reviewCategories.includes(value as ReviewCategory) ? value as ReviewCategory : null;
}

function nextActionCopy(action: PublicProject["nextAction"]) {
  if (action === "start-learning") return "Next: create the first learning artifact.";
  if (action === "prepare-brief") return "Next: prepare a critique-ready brief.";
  if (action === "review-archive") return "Archived projects stay private and restorable.";
  return "Next: continue from the latest project evidence.";
}

function messageFor(error: unknown) {
  return error instanceof ProjectsRequestError || error instanceof Error ? error.message : "Projects could not be updated.";
}
