(() => {
  const normalizeLang = (raw) => {
    if (!raw) return "code";
    // language-javascript, lang-js, etc.
    const m = raw.match(/language-([a-z0-9+-]+)/i) || raw.match(/lang(?:uage)?-([a-z0-9+-]+)/i);
    const lang = (m && m[1]) ? m[1] : raw;
    // Small niceties
    const map = { js: "javascript", ts: "typescript", sh: "shell", yml: "yaml" };
    return (map[lang.toLowerCase()] || lang).toUpperCase();
  };

  const getCodeText = (pre) => {
    // Prefer <code> innerText if present
    const code = pre.querySelector("code");
    return (code ? code.innerText : pre.innerText).replace(/\s+$/, "");
  };

  const makeBtn = (label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "codeblock__btn";
    b.textContent = label;
    return b;
  };

  const enhancePre = (pre) => {
    // Avoid double-wrapping if hot reloaded
    if (pre.closest(".codeblock")) return;

    const code = pre.querySelector("code");
    const classStr = (code?.className || pre.className || "");
    const langLabel = normalizeLang(classStr);

    // Build wrapper
    const wrapper = document.createElement("section");
    wrapper.className = "codeblock";

    const bar = document.createElement("div");
    bar.className = "codeblock__bar";

    const lang = document.createElement("div");
    lang.className = "codeblock__lang";
    lang.textContent = langLabel;

    const actions = document.createElement("div");
    actions.className = "codeblock__actions";

    const copyBtn = makeBtn("copy");
    const expandBtn = makeBtn("expand");

    actions.append(copyBtn, expandBtn);
    bar.append(lang, actions);

    const body = document.createElement("div");
    body.className = "codeblock__body";

    const fade = document.createElement("div");
    fade.className = "codeblock__fade";

    // Insert wrapper around pre
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.append(bar, body);
    body.append(pre, fade);

    // Copy
    copyBtn.addEventListener("click", async () => {
      const text = getCodeText(pre);
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "copied";
        window.setTimeout(() => (copyBtn.textContent = "copy"), 1100);
      } catch {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);
        copyBtn.textContent = "copied";
        window.setTimeout(() => (copyBtn.textContent = "copy"), 1100);
      }
    });

    // Collapse if tall
    const COLLAPSE_THRESHOLD_PX = 420;

    // Measure after layout
    requestAnimationFrame(() => {
      const fullHeight = pre.scrollHeight;
      if (fullHeight > COLLAPSE_THRESHOLD_PX) {
        wrapper.classList.add("is-collapsible", "is-collapsed");
        expandBtn.textContent = "expand";

        expandBtn.addEventListener("click", () => {
          const collapsed = wrapper.classList.toggle("is-collapsed");
          expandBtn.textContent = collapsed ? "expand" : "collapse";
        });
      } else {
        // Not collapsible: hide expand button
        expandBtn.style.display = "none";
      }
    });
  };

  const init = () => {
    // Most markdown renderers produce pre > code
    document.querySelectorAll("pre").forEach(enhancePre);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
