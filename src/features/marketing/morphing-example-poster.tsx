"use client";

import { useEffect, useRef } from "react";
import { gsap, registerIroGuideGsap } from "@/components/motion/gsap-runtime";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

const coralRest = "M406 93C512 60 621 112 668 220C715 328 688 474 602 568C516 662 371 686 280 607C189 528 150 346 207 226C264 106 300 126 406 93Z";
const coralShift = "M420 79C541 68 636 157 654 268C672 379 606 518 497 578C388 638 260 586 219 467C178 348 210 194 300 130C350 94 365 84 420 79Z";
const violetRest = "M29 273L350 149L399 259L80 374Z";
const violetShift = "M47 250C143 223 244 184 358 132L421 232C312 280 193 329 91 381L47 250Z";

export function MorphingExamplePoster() {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const coralRef = useRef<SVGPathElement>(null);
  const violetRef = useRef<SVGPathElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const cursorRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (reducedMotion) return;

    registerIroGuideGsap();

    const context = gsap.context(() => {
      const coral = coralRef.current;
      const violet = violetRef.current;
      const track = trackRef.current;
      const cursor = cursorRef.current;
      if (!coral || !violet || !track || !cursor) return;

      const timeline = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });

      timeline
        .to(coral, { duration: 4.2, morphSVG: coralShift, rotate: -5, transformOrigin: "50% 50%" }, 0)
        .to(violet, { duration: 3.6, morphSVG: violetShift, rotate: 4, transformOrigin: "50% 50%" }, 0.15)
        .to(cursor, {
          duration: 4.2,
          ease: "power1.inOut",
          motionPath: {
            path: track,
            align: track,
            alignOrigin: [0.5, 0.5],
          },
        }, 0);
    }, rootRef);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <div className="example-art" ref={rootRef}>
      <span>SHIFT</span>
      <svg className="example-morph-svg" viewBox="0 0 640 700" aria-hidden="true">
        <path className="example-morph-track" d="M58 278C190 214 326 167 468 139C558 121 621 171 641 249" ref={trackRef} />
        <path className="example-shape example-shape-coral" d={coralRest} ref={coralRef} />
        <path className="example-shape example-shape-violet" d={violetRest} ref={violetRef} />
        <circle className="example-track-cursor" cx="58" cy="278" r="8" ref={cursorRef} />
      </svg>
      <strong>MAKE<br />SPACE<br />FOR<br /><em>BOLD</em></strong>
    </div>
  );
}
