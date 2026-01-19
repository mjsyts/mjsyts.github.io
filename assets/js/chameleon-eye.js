// assets/js/chameleon-eye.js
// Scoped, multi-instance-safe eye tracking + blinking for inline SVG logos.
// Fixes issues caused by duplicate IDs when the same SVG is used more than once.

(() => {
  "use strict";

  const SELECTOR = "svg"; // we’ll filter down to only SVGs that contain the required parts

  const BLINK_MS = 100;
  const MIN_GAP_MS = 3000;
  const MAX_GAP_MS = 4000;

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function getEyeRadiusFromSVG(eyeEl) {
    // If #eye is a <circle>, prefer its r attribute (SVG units).
    // Otherwise fall back to pixel radius via bounding box.
    if (eyeEl && eyeEl.r && eyeEl.r.baseVal) return eyeEl.r.baseVal.value;
    const rect = eyeEl.getBoundingClientRect();
    return Math.min(rect.width, rect.height) / 2;
  }

  function setupInstance(svg) {
    const eye = svg.querySelector("#eye");
    const pupil = svg.querySelector("#pupil");
    const closed = svg.querySelector("#closed");

    if (!eye || !pupil || !closed) return null;

    // Ensure initial blink state is consistent
    closed.style.display = "none";
    pupil.style.display = "";

    // Base pupil position (SVG units)
    const baseX = parseFloat(pupil.getAttribute("cx"));
    const baseY = parseFloat(pupil.getAttribute("cy"));

    // Cache for performance: compute rect each event, but keep base values stable
    const instance = {
      svg,
      eye,
      pupil,
      closed,
      baseX,
      baseY,
      blinkTimer: null,
      unblinkTimer: null
    };

    // Blink loop
    const scheduleBlink = () => {
      const gap = randBetween(MIN_GAP_MS, MAX_GAP_MS);
      instance.blinkTimer = window.setTimeout(() => {
        instance.pupil.style.display = "none";
        instance.closed.style.display = "";

        instance.unblinkTimer = window.setTimeout(() => {
          instance.closed.style.display = "none";
          instance.pupil.style.display = "";
          scheduleBlink();
        }, BLINK_MS);
      }, gap);
    };

    scheduleBlink();

    return instance;
  }

  function main() {
    // If the user prefers reduced motion, keep it simple: no blinking, no tracking
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;

    const svgs = Array.from(document.querySelectorAll(SELECTOR));
    const instances = svgs.map(setupInstance).filter(Boolean);

    if (!instances.length) return;

    // One pointer listener drives all instances (cheap + consistent)
    const onPointerMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      for (const inst of instances) {
        const rect = inst.eye.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const dx = x - cx;
        const dy = y - cy;

        const angle = Math.atan2(dy, dx);

        // Movement scale: based on the eye’s apparent size
        // If eye is a circle in SVG units, r might not match pixels; this blend works well visually.
        const pxRadius = Math.min(rect.width, rect.height) / 2;
        const svgRadius = getEyeRadiusFromSVG(inst.eye);
        const radius = Number.isFinite(svgRadius) ? svgRadius : pxRadius;

        const maxMove = radius * 0.4;

        const offsetX = Math.cos(angle) * maxMove;
        const offsetY = Math.sin(angle) * maxMove;

        inst.pupil.setAttribute("cx", inst.baseX + offsetX);
        inst.pupil.setAttribute("cy", inst.baseY + offsetY);
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });

    // Cleanup on pagehide (helps on iOS Safari page caching)
    window.addEventListener("pagehide", () => {
      document.removeEventListener("pointermove", onPointerMove);
      for (const inst of instances) {
        if (inst.blinkTimer) window.clearTimeout(inst.blinkTimer);
        if (inst.unblinkTimer) window.clearTimeout(inst.unblinkTimer);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main, { once: true });
  } else {
    main();
  }
})();