document.addEventListener("DOMContentLoaded", () => {
  const eye   = document.getElementById("eye");
  const pupil = document.getElementById("pupil");

  if (!eye || !pupil) {
    console.warn("Chameleon eye script: missing #eye or #pupil");
    return;
  }

  // Original pupil position in SVG coordinates
  const baseX = parseFloat(pupil.getAttribute("cx"));
  const baseY = parseFloat(pupil.getAttribute("cy"));

  document.addEventListener("mousemove", (e) => {
    const rect = eye.getBoundingClientRect();

    // Eye center in *screen* coordinates
    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top  + rect.height / 2;

    const dx = e.clientX - eyeCenterX;
    const dy = e.clientY - eyeCenterY;

    const angle = Math.atan2(dy, dx);

    // How far the pupil can move inside the eye (fraction of radius)
    const eyeRadius = eye.r ? eye.r.baseVal.value : Math.min(rect.width, rect.height) / 2;
    const maxMove   = eyeRadius * 0.4; // tweak 0.4 for more/less motion

    const offsetX = Math.cos(angle) * maxMove;
    const offsetY = Math.sin(angle) * maxMove;

    // Move the pupil in SVG coordinate space
    pupil.setAttribute("cx", baseX + offsetX);
    pupil.setAttribute("cy", baseY + offsetY);
  });
});
