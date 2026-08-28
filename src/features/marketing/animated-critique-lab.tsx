"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Sparkles } from "lucide-react";
import {
  Flip,
  gsap,
  registerIroGuideGsap,
  SplitText,
} from "@/components/motion/gsap-runtime";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { clampCritiqueBeatIndex, critiqueBeats, getCritiqueBeat } from "@/features/marketing/critique-preview-model";
import { ReviewLaunchLink } from "@/features/capabilities/review-launch-link";

export function AnimatedCritiqueLab() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const orbRef = useRef<SVGCircleElement>(null);
  const glyphRef = useRef<SVGPathElement>(null);
  const activeIndexRef = useRef(0);
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 721px) and (prefers-reduced-motion: no-preference)");
    const updateMotionMode = () => setMotionEnabled(query.matches && !reducedMotion);

    updateMotionMode();
    query.addEventListener("change", updateMotionMode);

    return () => query.removeEventListener("change", updateMotionMode);
  }, [reducedMotion]);

  const selectBeat = useCallback((nextIndex: number) => {
    const nextBeatIndex = clampCritiqueBeatIndex(nextIndex);
    if (nextBeatIndex === activeIndexRef.current) return;

    if (motionEnabled) {
      const marker = rootRef.current?.querySelector(".gsap-lab-control-marker");
      flipStateRef.current = marker ? Flip.getState(marker) : null;
    }

    flushSync(() => setActiveIndex(nextBeatIndex));
    activeIndexRef.current = nextBeatIndex;
  }, [motionEnabled]);

  useEffect(() => {
    if (!motionEnabled || !rootRef.current) {
      return;
    }

    registerIroGuideGsap();

    const root = rootRef.current;
    const title = titleRef.current;
    const route = routeRef.current;
    const orb = orbRef.current;
    let split: SplitText | null = null;

    const context = gsap.context(() => {
      gsap.set(".gsap-lab-hotspot, .gsap-lab-orb, .gsap-lab-glyph", { transformOrigin: "center" });
      split = title ? new SplitText(title, { type: "words", wordsClass: "gsap-lab-title-word" }) : null;

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          trigger: root,
          start: "top 68%",
          end: "bottom 42%",
          scrub: 0.85,
        },
      });

      timeline
        .from(".gsap-lab-copy > *", { y: 24, opacity: 0, stagger: 0.08, duration: 0.55 }, 0)
        .from(".gsap-lab-panel", { y: 34, opacity: 0, duration: 0.55 }, 0.05)
        .from(".gsap-lab-layer", { y: 24, opacity: 0, stagger: 0.08, duration: 0.55 }, 0.18);

      if (split?.words.length) {
        timeline.from(split.words, { yPercent: 18, opacity: 0, stagger: 0.035, duration: 0.42 }, 0.08);
      }

      if (route) {
        timeline.from(route, { drawSVG: "0% 0%", duration: 1 }, 0.22);
      }

      if (orb && route) {
        timeline.to(orb, {
          duration: 1,
          motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5] },
        }, 0.22);
      }

      timeline
        .from(".gsap-lab-hotspot", { scale: 0.72, opacity: 0, stagger: 0.1, duration: 0.45 }, 0.45)
        .from(".gsap-lab-glyph", { scale: 0.82, rotate: -10, opacity: 0, stagger: 0.06, duration: 0.4 }, 0.5);

    }, root);

    return () => {
      split?.revert();
      context.revert();
    };
  }, [motionEnabled]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;

    if (!motionEnabled) {
      return;
    }

    const activeBeat = getCritiqueBeat(activeIndex);

    if (flipStateRef.current) {
      Flip.from(flipStateRef.current, {
        duration: 0.24,
        ease: "power3.out",
        absolute: true,
        scale: true,
      });
      flipStateRef.current = null;
    }

    gsap.to(glyphRef.current, {
      morphSVG: activeBeat.glyph,
      duration: 0.34,
      ease: "power3.inOut",
    });

    gsap.fromTo(".gsap-lab-readout > *", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, stagger: 0.035, ease: "power3.out" });

  }, [activeIndex, motionEnabled]);

  const activeBeat = getCritiqueBeat(activeIndex);

  return (
    <section className="gsap-lab section-pad" id="critique-preview" ref={rootRef} aria-labelledby="gsap-lab-title">
      <div className="gsap-lab-copy">
        <p className="eyebrow light"><Sparkles size={14} /> Example critique preview</p>
        <h2 id="gsap-lab-title" ref={titleRef}>A review path you can feel before you submit.</h2>
        <p><strong>Example critique—not an analysis of your work.</strong> Inspect how IroGuide moves from visible evidence to a useful next move.</p>
        <p className="gsap-lab-status">Choose an insight to inspect the example in your own time.</p>
        <ReviewLaunchLink className="button button-lime" enabledLabel="Start a real review" disabledHref="/learn" disabledLabel="Inspect the full example" eventName="gsap_lab_review_click" />
      </div>

      <div className="gsap-lab-panel" aria-labelledby="gsap-lab-title">
        <div className="gsap-lab-stage">
          <svg className="gsap-lab-svg" viewBox="0 0 720 460" aria-hidden="true">
            <defs>
              <pattern id="gsap-lab-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1" />
              </pattern>
              <linearGradient id="gsap-lab-route-gradient" x1="84" x2="625" y1="354" y2="98" gradientUnits="userSpaceOnUse">
                <stop stopColor="#c8f45d" />
                <stop offset=".52" stopColor="#55d9e8" />
                <stop offset="1" stopColor="#ff6b57" />
              </linearGradient>
            </defs>
            <rect className="gsap-lab-svg-bg" x="24" y="24" width="672" height="412" rx="28" />
            <rect x="24" y="24" width="672" height="412" rx="28" fill="url(#gsap-lab-grid)" />
            <g className="gsap-lab-layer gsap-lab-layer-poster">
              <rect x="86" y="86" width="190" height="244" rx="18" />
              <path d="M124 136h112M124 168h78M124 250h104" />
              <circle cx="216" cy="218" r="46" />
            </g>
            <g className="gsap-lab-layer gsap-lab-layer-notes">
              <rect x="416" y="94" width="164" height="96" rx="16" />
              <path d="M446 126h90M446 154h56" />
              <rect x="348" y="290" width="190" height="82" rx="16" />
              <path d="M378 322h118M378 346h76" />
            </g>
            <path className="gsap-lab-route" ref={routeRef} d="M145 160 C214 76 292 316 330 255 S459 76 545 145" />
            <circle className="gsap-lab-orb" ref={orbRef} cx="145" cy="160" r="13" />
            {critiqueBeats.map((beat, index) => (
              <g className={`gsap-lab-hotspot ${index === activeIndex ? "is-active" : ""}`} key={beat.label} transform={`translate(${beat.x} ${beat.y})`}>
                <circle r="28" />
                <text y="5" textAnchor="middle">{index + 1}</text>
              </g>
            ))}
            <g className="gsap-lab-glyph" transform="translate(608 324)">
              <path ref={glyphRef} d={activeBeat.glyph} />
            </g>
          </svg>

          <div className="gsap-lab-readout" id="critique-preview-readout" aria-atomic="true" aria-live="polite">
            <span className="mono-label">{activeBeat.label}</span>
            <h3>{activeBeat.title}</h3>
            <p>{activeBeat.copy}</p>
            <strong>{activeBeat.outcome}</strong>
          </div>
        </div>

        <div className="gsap-lab-controls">
          <div className="gsap-lab-control-row" role="group" aria-label="Example critique insights">
            {critiqueBeats.map((beat, index) => (
              <button
                aria-controls="critique-preview-readout"
                aria-pressed={activeIndex === index}
                className={activeIndex === index ? "is-active" : undefined}
                key={beat.label}
                onClick={() => selectBeat(index)}
                type="button"
              >
                {activeIndex === index && <span className="gsap-lab-control-marker" data-flip-id="gsap-lab-control-marker" />}
                <span>{beat.label}</span>
                <small>{beat.title}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
