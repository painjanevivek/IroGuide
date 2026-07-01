"use client";

import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

let isRegistered = false;

export function registerIroGuideGsap() {
  if (isRegistered) return;

  gsap.registerPlugin(
    useGSAP,
    ScrollTrigger,
    ScrollSmoother,
    ScrollToPlugin,
    SplitText,
    Flip,
    MorphSVGPlugin,
    MotionPathPlugin,
    Observer,
    Draggable,
    DrawSVGPlugin,
    ScrambleTextPlugin,
  );

  isRegistered = true;
}

export {
  Draggable,
  DrawSVGPlugin,
  Flip,
  gsap,
  MorphSVGPlugin,
  MotionPathPlugin,
  Observer,
  ScrambleTextPlugin,
  ScrollSmoother,
  ScrollToPlugin,
  ScrollTrigger,
  SplitText,
  useGSAP,
};
