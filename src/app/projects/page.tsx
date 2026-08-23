import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers3, LayoutDashboard, ScanLine } from "lucide-react";
import { siteConfig } from "@/config/site";

const projects = [
  {
    title: "Private Workspace",
    href: "/dashboard",
    icon: LayoutDashboard,
    copy: "Available now — keep owned critique text, drafts, progress evidence, and data controls in one signed-in workspace.",
  },
  {
    title: "Design Review",
    href: "/review/new",
    icon: ScanLine,
    copy: "Gated for the free launch — inspect the workflow and activation requirements without sending a design to a provider.",
  },
  {
    title: "Portfolio Workshop",
    href: "/portfolio",
    icon: Layers3,
    copy: "Private concept — shape owned critique history into stronger project stories without public publishing.",
  },
  {
    title: "Design Learning Guide",
    href: "/docs",
    icon: BookOpen,
    copy: "Available now — understand the what, why, and how critique model, privacy boundary, and staged launch.",
  },
] as const;

export const metadata: Metadata = {
  title: `${siteConfig.name} Projects`,
  description:
    "Official IroGuide product areas with clear availability for the private workspace, design review, portfolio preparation, and learning guide.",
  alternates: {
    canonical: "/projects",
  },
};

export default function ProjectsPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/about">About</Link><Link href="/contact">Contact</Link></nav>
      </header>
      <main className="official-main">
        <section className="official-hero">
          <p className="eyebrow"><Layers3 /> IroGuide projects</p>
          <h1>Official IroGuide product areas and creative workflows.</h1>
          <p>See what is available now, what remains private or gated, and where the critique learning loop is heading next.</p>
        </section>
        <section className="project-list" aria-label="IroGuide project areas">
          {projects.map((project) => {
            const ProjectIcon = project.icon;
            return (
              <Link href={project.href} key={project.title}>
                <ProjectIcon />
                <span><strong>{project.title}</strong><small>{project.copy}</small></span>
                <ArrowRight />
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
