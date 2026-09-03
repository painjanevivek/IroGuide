import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Eye, LockKeyhole, MousePointerClick, ShieldCheck } from "lucide-react";
import { getLearningSample, learningSamples } from "@/domain/learning";
import { LearningStudio } from "./learning-studio";
import { UserMenu } from "@/features/auth/user-menu";

const publicSample = getLearningSample("form-together-friendly");

export function LearningPage() {
  return (
    <div className="learning-page">
      <header className="simple-header learning-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="#example">Example critique</Link><Link href="#practice">Practice</Link><Link href="/docs">Guide</Link><UserMenu /></nav>
      </header>

      <main>
        <section className="learning-hero">
          <div>
            <p className="eyebrow"><BookOpenCheck /> Free design learning</p>
            <h1>Learn to see the decision behind the design.</h1>
            <p>Inspect visible evidence, understand why it matters, and choose a first useful fix. No image upload or personalized analysis is used in this free path.</p>
            <div className="learning-hero-actions"><a className="button button-dark" href="#example">Read the example <ArrowRight /></a><a className="button-secondary" href="#practice">Try the exercise</a></div>
          </div>
          <aside aria-label="Free learning boundaries">
            <ShieldCheck />
            <strong>Useful now. Honest about the boundary.</strong>
            <p>The examples are owned teaching material. They are not an analysis of your work, and the practice tools send no image to a provider.</p>
          </aside>
        </section>

        <section className="public-critique" id="example" aria-labelledby="public-example-title">
          <header className="learning-section-heading">
            <div><p className="eyebrow">Example critique—not an analysis of your work</p><h2 id="public-example-title">{publicSample.title}: evidence before opinion.</h2></div>
            <span>{publicSample.category} / {publicSample.mode} / {publicSample.version}</span>
          </header>

          <div className="public-sample-grid">
            <figure className="learning-image-frame">
              <Image alt={publicSample.alt} height={publicSample.height} priority sizes="(max-width: 900px) 100vw, 58vw" src={publicSample.asset} width={publicSample.width} />
              {publicSample.regions.map((region, index) => <span aria-hidden="true" className="learning-region" key={region.id} style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}><b>{index + 1}</b></span>)}
              <figcaption>{publicSample.alt}</figcaption>
            </figure>
            <aside className="learning-brief">
              <p className="mono-label">THE BRIEF</p>
              <dl><div><dt>Audience</dt><dd>{publicSample.brief.audience}</dd></div><div><dt>Purpose</dt><dd>{publicSample.brief.purpose}</dd></div><div><dt>Context</dt><dd>{publicSample.brief.context}</dd></div><div><dt>Constraint</dt><dd>{publicSample.brief.constraint}</dd></div></dl>
              <p><Eye /> <span><strong>Learning outcome</strong>{publicSample.educationalOutcome}</span></p>
            </aside>
          </div>

          <ol className="public-findings">
            {publicSample.findings.map((finding, index) => (
              <li key={finding.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <article>
                  <p className={`finding-priority priority-${finding.priority}`}>{finding.priority}</p>
                  <h3>{finding.what}</h3>
                  <dl><div><dt>Visible evidence</dt><dd>{finding.evidence}</dd></div><div><dt>Why it matters</dt><dd>{finding.why}</dd></div><div><dt>{index === 0 ? "Fix first" : "What to try"}</dt><dd>{finding.how}</dd></div></dl>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section className="sample-library" aria-labelledby="sample-library-title">
          <header className="learning-section-heading"><div><p className="eyebrow">Three roles, one evidence standard</p><h2 id="sample-library-title">Practice paths with a clear purpose.</h2></div></header>
          <div>
            {learningSamples.map((sample) => <article key={sample.id}><Image alt="" aria-hidden="true" height={sample.height} sizes="(max-width: 700px) 100vw, 33vw" src={sample.asset} width={sample.width} /><span>{sample.role.replaceAll("-", " ")} / {sample.mode}</span><h3>{sample.title}</h3><p>{sample.educationalOutcome}</p><small><LockKeyhole /> {sample.ownership.owner} {sample.ownership.source}</small></article>)}
          </div>
        </section>

        <section className="learning-practice-shell" id="practice" aria-labelledby="practice-title">
          <header className="learning-section-heading"><div><p className="eyebrow"><MousePointerClick /> Guided practice</p><h2 id="practice-title">Predict. Reveal. Apply.</h2><p>Signed-in progress is private to your account. Guest example progress stays on this device for no more than seven days.</p></div><span><CheckCircle2 /> No upload</span></header>
          <LearningStudio />
        </section>
      </main>
    </div>
  );
}
