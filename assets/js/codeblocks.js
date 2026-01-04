(() => {
  const normalizeLang = (raw) => {
    if (!raw) return "CODE";

    // Try to extract a language token from typical class patterns.
    // Handles: language-javascript, lang-js, highlight-source-cpp, etc.
    const m =
      raw.match(/(?:^|\s)language-([a-z0-9+-]+)(?=\s|$)/i) ||
      raw.match(/(?:^|\s)lang(?:uage)?-([a-z0-9+-]+)(?=\s|$)/i) ||
      raw.match(/(?:^|\s)highlight-source-([a-z0-9+-]+)(?=\s|$)/i);

    let lang = (m && m[1]) ? m[1] : raw;

    // If raw was a full class string, last-ditch: pick the last token
    // that looks language-ish (avoids returning the entire class list).
    if (lang.includes(" ")) {
      const parts = lang.split(/\s+/).filter(Boolean);
      lang = parts.find(p => /^language-|^lang(?:uage)?-|^highlight-source-/i.test(p)) || parts[parts.length - 1];
      // re-extract if we picked a prefixed token
      const mm = lang.match(/(?:language-|lang(?:uage)?-|highlight-source-)([a-z0-9+-]+)/i);
      if (mm) lang = mm[1];
    }

    const key = lang.toLowerCase();

    // Friendly display labels
    const map = {
      js: "javascript",
      javascript: "javascript",
      ts: "typescript",
      typescript: "typescript",
      sh: "shell",
      shell: "shell",
      bash: "shell",
      zsh: "shell",
      yml: "yaml",
      yaml: "yaml",

      // C#
      cs: "c#",
      csharp: "c#",
      "c#": "c#",

      // C++
      cpp: "c++",
      "c++": "c++",
      cc: "c++",
      cxx: "c++",

      // SuperCollider
      supercollider: "supercollider",
      sclang: "supercollider",
      sc: "supercollider",
    };

    return (map[key] || key).toUpperCase();
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
        try { document.execCommand("copy"); } catch { }
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

