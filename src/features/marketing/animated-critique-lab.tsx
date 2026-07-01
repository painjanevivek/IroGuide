"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, Crosshair, MousePointer2, Route, Sparkles } from "lucide-react";
import {
  Draggable,
  Flip,
  gsap,
  Observer,
  registerIroGuideGsap,
  SplitText,
} from "@/components/motion/gsap-runtime";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

const critiqueBeats = [
  {
    label: "Capture",
    title: "Upload evidence",
    copy: "The review starts by reading layout, type, contrast, and the design goal before making any judgment.",
    metric: "12 signals",
    x: 145,
    y: 160,
    glyph: "M0 -34 12 -8 40 -6 18 12 24 40 0 24 -24 40 -18 12 -40 -6 -12 -8Z",
  },
  {
    label: "Focus",
    title: "Find the friction",
    copy: "IroGuide traces the decision that slows comprehension, then ties it to hierarchy and audience fit.",
    metric: "3 priorities",
    x: 330,
    y: 255,
    glyph: "M-40 -8 H-8 V-40 H8 V-8 H40 V8 H8 V40 H-8 V8 H-40Z",
  },
  {
    label: "Refine",
    title: "Make the next move",
    copy: "The output turns critique into a short, ordered revision plan that keeps the designer in control.",
    metric: "1 path",
    x: 545,
    y: 145,
    glyph: "M0 -40 C22 -40 40 -22 40 0 S22 40 0 40 -40 22 -40 0 -22 -40 0 -40Z M-14 -3 0 13 20 -15",
  },
] as const;

export function AnimatedCritiqueLab() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const orbRef = useRef<SVGCircleElement>(null);
  const glyphRef = useRef<SVGPathElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const activeIndexRef = useRef(0);
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  const selectBeat = useCallback((nextIndex: number) => {
    const nextBeatIndex = Math.max(0, Math.min(critiqueBeats.length - 1, nextIndex));
    if (nextBeatIndex === activeIndexRef.current) return;

    if (!reducedMotion) {
      const marker = rootRef.current?.querySelector(".gsap-lab-control-marker");
      flipStateRef.current = marker ? Flip.getState(marker) : null;
    }

    flushSync(() => setActiveIndex(nextBeatIndex));
    activeIndexRef.current = nextBeatIndex;
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) {
      return;
    }

    registerIroGuideGsap();

    const root = rootRef.current;
    const title = titleRef.current;
    const stage = stageRef.current;
    const route = routeRef.current;
    const orb = orbRef.current;
    const knob = knobRef.current;
    const track = trackRef.current;
    const status = statusRef.current;
    const draggers: Draggable[] = [];
    let observer: Observer | undefined;
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

      if (status) {
        gsap.to(status, {
          scrambleText: { text: "Drag, wheel, or swipe the priority control to preview each review layer.", chars: "IroGuide0123456789", speed: 0.38 },
          duration: 1.4,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 58%",
            toggleActions: "play none none reverse",
          },
        });
      }

      if (knob && track) {
        draggers.push(...Draggable.create(knob, {
          type: "x",
          bounds: track,
          inertia: false,
          onDrag(this: Draggable) {
            const max = this.maxX || 1;
            const nextIndex = Math.round((this.x / max) * (critiqueBeats.length - 1));
            selectBeat(nextIndex);
          },
          onRelease(this: Draggable) {
            const max = this.maxX || 1;
            const nextIndex = Math.round((this.x / max) * (critiqueBeats.length - 1));
            gsap.to(knob, { x: (max / (critiqueBeats.length - 1)) * nextIndex, duration: 0.24, ease: "power3.out" });
          },
        }));
      }

      if (stage) {
        observer = Observer.create({
          target: stage,
          type: "wheel,touch,pointer",
          tolerance: 28,
          onDown: () => selectBeat(activeIndexRef.current + 1),
          onLeft: () => selectBeat(activeIndexRef.current + 1),
          onRight: () => selectBeat(activeIndexRef.current - 1),
          onUp: () => selectBeat(activeIndexRef.current - 1),
        });
      }
    }, root);

    return () => {
      draggers.forEach((dragger) => dragger.kill());
      observer?.kill();
      split?.revert();
      context.revert();
    };
  }, [reducedMotion, selectBeat]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;

    if (reducedMotion || !knobRef.current || !trackRef.current) {
      return;
    }

    const activeBeat = critiqueBeats[activeIndex];
    const max = Math.max(0, trackRef.current.clientWidth - knobRef.current.offsetWidth);

    if (flipStateRef.current) {
      Flip.from(flipStateRef.current, {
        duration: 0.24,
        ease: "power3.out",
        absolute: true,
        scale: true,
      });
      flipStateRef.current = null;
    }

    gsap.to(knobRef.current, {
      x: (max / (critiqueBeats.length - 1)) * activeIndex,
      duration: 0.28,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(glyphRef.current, {
      morphSVG: activeBeat.glyph,
      duration: 0.34,
      ease: "power3.inOut",
    });

    gsap.fromTo(".gsap-lab-readout > *", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, stagger: 0.035, ease: "power3.out" });

    gsap.to(statusRef.current, {
      scrambleText: { text: `${activeBeat.label}: ${activeBeat.title}`, chars: "IroGuide0123456789", speed: 0.42 },
      duration: 0.34,
      ease: "none",
      overwrite: true,
    });
  }, [activeIndex, reducedMotion]);

  const activeBeat = critiqueBeats[activeIndex];

  return (
    <section className="gsap-lab section-pad" ref={rootRef} aria-labelledby="gsap-lab-title">
      <div className="gsap-lab-copy">
        <p className="eyebrow light"><Sparkles size={14} /> Animated critique system</p>
        <h2 id="gsap-lab-title" ref={titleRef}>A review path you can feel before you submit.</h2>
        <p>
          Scroll through the lab to watch IroGuide connect evidence, diagnosis, and next steps. The SVG path is animated with GSAP, while the priority control stays interactive for hands-on exploration.
        </p>
        <p className="gsap-lab-status" ref={statusRef}>Scroll the lab into view to activate the critique path.</p>
        <Link className="button button-lime" href="/review/new" prefetch={false} data-analytics-event="gsap_lab_review_click">
          Try the live workflow <ArrowRight size={18} />
        </Link>
      </div>

      <div className="gsap-lab-panel" aria-label="Interactive critique path preview">
        <div className="gsap-lab-stage" ref={stageRef}>
          <svg className="gsap-lab-svg" viewBox="0 0 720 460" role="img" aria-labelledby="gsap-lab-svg-title gsap-lab-svg-desc">
            <title id="gsap-lab-svg-title">Animated IroGuide critique path</title>
            <desc id="gsap-lab-svg-desc">A design review path moving from upload evidence to friction diagnosis to a revision plan.</desc>
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

          <div className="gsap-lab-readout" aria-live="polite">
            <span className="mono-label">{activeBeat.label}</span>
            <h3>{activeBeat.title}</h3>
            <p>{activeBeat.copy}</p>
            <strong>{activeBeat.metric}</strong>
          </div>
        </div>

        <div className="gsap-lab-controls">
          <div className="gsap-lab-control-row" role="list" aria-label="Critique layers">
            {critiqueBeats.map((beat, index) => (
              <button
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
          <div className="gsap-lab-scrubber">
            <Route size={18} aria-hidden="true" />
            <div className="gsap-lab-scrubber-track" ref={trackRef}>
              <button className="gsap-lab-scrubber-knob" ref={knobRef} type="button" aria-label="Drag to preview critique layers">
                <MousePointer2 size={16} fill="currentColor" />
              </button>
            </div>
            <Crosshair size={18} aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
