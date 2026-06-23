import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Layers3, MessageSquareText, Palette, ScanLine } from "lucide-react";
import { siteConfig } from "@/config/site";

const projects = [
  {
    title: "AI Design Review",
    href: "/review/new",
    icon: ScanLine,
    copy: "Upload creative work and receive structured critique across composition, hierarchy, typography, color, and audience fit.",
  },
  {
    title: "Improvement Planning",
    href: "/review/new",
    icon: MessageSquareText,
    copy: "Turn a critique into prioritized actions so the next version has a clear design direction.",
  },
  {
    title: "Portfolio Workshop",
    href: "/portfolio",
    icon: Layers3,
    copy: "Shape critique history into stronger project stories for a future public portfolio workflow.",
  },
  {
    title: "Creative Community",
    href: "/community",
    icon: Palette,
    copy: "Practice giving and receiving more specific feedback with structured community critique concepts.",
  },
] as const;

export const metadata: Metadata = {
  title: `${siteConfig.name} Projects`,
  description:
    "Official IroGuide projects, including AI design review, improvement planning, portfolio workflows, and creative community critique.",
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
          <p>Explore the active parts of IroGuide: design critique, improvement planning, portfolio preparation, and structured community feedback.</p>
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
