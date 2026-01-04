/* assets/js/codeblocks.js
   Wrap <pre> blocks with a header bar showing language + copy/expand controls.
   Robust against Jekyll/Rouge markup that uses class="highlight" and/or data-lang.
*/
(() => {
  // ---------- helpers ----------
  const pickLangTokenFromClasses = (classStr) => {
    if (!classStr) return "";

    // Look for common language class patterns across highlighters/renderers
    // e.g. language-javascript, lang-js, highlight-source-cpp
    const m =
      classStr.match(/(?:^|\s)language-([a-z0-9+-]+)(?=\s|$)/i) ||
      classStr.match(/(?:^|\s)lang(?:uage)?-([a-z0-9+-]+)(?=\s|$)/i) ||
      classStr.match(/(?:^|\s)highlight-source-([a-z0-9+-]+)(?=\s|$)/i);

    return (m && m[1]) ? m[1] : "";
  };

  const normalizeLangLabel = (token) => {
    if (!token) return "CODE";
    const key = String(token).trim().toLowerCase();

    // Display-friendly aliases
    const map = {
      // JS/TS
      js: "javascript",
      javascript: "javascript",
      ts: "typescript",
      typescript: "typescript",

      // shell-ish
      sh: "shell",
      shell: "shell",
      bash: "shell",
      zsh: "shell",

      // yaml
      yml: "yaml",
      yaml: "yaml",

      // C# (usually csharp/cs in HTML classes)
      cs: "c#",
      csharp: "c#",

      // C++ (usually cpp/cc/cxx in HTML classes)
      cpp: "c++",
      cc: "c++",
      cxx: "c++",

      // SuperCollider (common tokens)
      supercollider: "supercollider",
      sclang: "supercollider",
      sc: "supercollider",
    };

    return (map[key] || key).toUpperCase();
  };

  const getCodeText = (pre) => {
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

  const findBestLang = (pre) => {
    const code = pre.querySelector("code");
    const figure = pre.closest("figure");
    const wrapper = pre.closest(".highlight");

    // 1) Best: explicit data-lang from Rouge/kramdown if present
    const dataLang =
      code?.dataset?.lang ||
      pre.dataset?.lang ||
      figure?.dataset?.lang ||
      wrapper?.dataset?.lang;

    if (dataLang) return normalizeLangLabel(dataLang);

    // 2) Next: language-* style classes on <code> or <pre>
    const classToken =
      pickLangTokenFromClasses(code?.className || "") ||
      pickLangTokenFromClasses(pre.className || "") ||
      pickLangTokenFromClasses(figure?.className || "");

    if (classToken) return normalizeLangLabel(classToken);

    // 3) If Rouge only gives you "highlight" etc., DO NOT treat it as a language.
    return "CODE";
  };

  // ---------- main enhancer ----------
  const enhancePre = (pre) => {
    // Avoid double-wrapping
    if (pre.closest(".codeblock")) return;

    // Some themes use <pre class="highlight"> (non-code). Ignore empty blocks.
    if (!pre.innerText || !pre.innerText.trim()) return;

    const langLabel = findBestLang(pre);

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

    // Wrap the <pre>
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.append(bar, body);
    body.append(pre, fade);

    // Copy
    copyBtn.addEventListener("click", async () => {
      const text = getCodeText(pre);
      try {
        await navigator.clipboard.writeText(text);
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
      }
      copyBtn.textContent = "copied";
      window.setTimeout(() => (copyBtn.textContent = "copy"), 1100);
    });

    // Collapse if tall
    const COLLAPSE_THRESHOLD_PX = 420;

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
        expandBtn.style.display = "none";
      }
    });
  };

  const init = () => {
    // Only enhance real code blocks (pre, or figure.highlight > pre, etc.)
    document.querySelectorAll("pre").forEach(enhancePre);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
