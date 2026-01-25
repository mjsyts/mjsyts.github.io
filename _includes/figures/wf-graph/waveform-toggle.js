
// _includes/figures/wf-graph/waveform-toggle.js
(() => {
  function init(root) {
    const buttons = root.querySelectorAll(".wf__btn");
    if (!buttons.length) return;

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.target;
        const series = root.querySelector(`[data-wf-series="${key}"]`);
        if (!series) return;

        const on = btn.classList.toggle("is-on");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        series.classList.toggle("is-off", !on);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("[data-wf]").forEach(init);
    }, { once: true });
  } else {
    document.querySelectorAll("[data-wf]").forEach(init);
  }
})();
