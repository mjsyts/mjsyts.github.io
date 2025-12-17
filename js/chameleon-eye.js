document.addEventListener("DOMContentLoaded", () => {
  const eye    = document.getElementById("eye");
  const pupil  = document.getElementById("pupil");
  const closed = document.getElementById("closed");

  if (!eye || !pupil || !closed) {
    console.warn("Chameleon eye script: missing #eye, #pupil, or #closed");
    return;
  }

  // --- PUPIL TRACKING (unchanged) ---
  const baseX = parseFloat(pupil.getAttribute("cx"));
  const baseY = parseFloat(pupil.getAttribute("cy"));

  document.addEventListener("mousemove", (e) => {
    const rect = eye.getBoundingClientRect();

    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top  + rect.height / 2;

    const dx = e.clientX - eyeCenterX;
    const dy = e.clientY - eyeCenterY;

    const angle = Math.atan2(dy, dx);

    const eyeRadius = eye.r ? eye.r.baseVal.value : Math.min(rect.width, rect.height) / 2;
    const maxMove   = eyeRadius * 0.4;

    const offsetX = Math.cos(angle) * maxMove;
    const offsetY = Math.sin(angle) * maxMove;

    pupil.setAttribute("cx", baseX + offsetX);
    pupil.setAttribute("cy", baseY + offsetY);
  });

  // --- BLINKING ---
  // Make sure "closed" starts hidden
  closed.style.display = "none";
  pupil.style.display = "";

  const BLINK_MS = 100; // 0.1 seconds
  const MIN_GAP_MS = 3000;
  const MAX_GAP_MS = 4000;

  function scheduleBlink() {
    const gap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);

    window.setTimeout(() => {
      // show closed, hide pupil
      pupil.style.display = "none";
      closed.style.display = "";

      window.setTimeout(() => {
        // restore
        closed.style.display = "none";
        pupil.style.display = "";

        // schedule next random blink
        scheduleBlink();
      }, BLINK_MS);
    }, gap);
  }

  scheduleBlink();
});
