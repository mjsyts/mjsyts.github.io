/* assets/js/codeblocks.js
   Wrap <pre> blocks with a header bar showing language + copy/expand controls.
   Robust against Jekyll/Highlight.js markup that lacks language-* classes.
*/
(() => {
  // ---------- helpers ----------
  const pickLangTokenFromClasses = (classStr) => {
    if (!classStr) return "";
    const m =
      classStr.match(/(?:^|\s)language-([a-z0-9+-]+)(?=\s|$)/i) ||
      classStr.match(/(?:^|\s)lang(?:uage)?-([a-z0-9+-]+)(?=\s|$)/i) ||
      classStr.match(/(?:^|\s)highlight-source-([a-z0-9+-]+)(?=\s|$)/i);
    return (m && m[1]) ? m[1] : "";
  };

  const normalizeLangLabel = (token) => {
    if (!token) return "CODE";
    const key = String(token).trim().toLowerCase();

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

      cs: "c#",
      csharp: "c#",

      cpp: "c++",
      cc: "c++",
      cxx: "c++",

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

  // When markup gives us *no* language, guess from code content.
  // This is exactly your current situation: <pre class="highlight"><code>...</code></pre>
  const guessLangFromText = (text) => {
    const t = (text || "").slice(0, 4000); // don't scan huge blocks

    // SuperCollider
    if (/(SynthDef\s*\(|\bUGen\b|\bEnvGen\b|\bOut\.ar\b|\bSinOsc\.ar\b|\bLPF\.ar\b|\bRoutine\s*\{|s\.waitForBoot\b)/.test(t)) {
      return "supercollider";
    }

    // C#
    if (/\bnamespace\s+[A-Za-z_]\w*|\busing\s+System\b|\bpublic\s+(class|struct|interface)\b|\bConsole\.Write(Line)?\b|\bget;\s*set;/.test(t)) {
      return "csharp";
    }

    // C++
    if (/#include\s+<|std::|template\s*<|cout\s*<<|\bconstexpr\b|\bnullptr\b/.test(t)) {
      return "cpp";
    }

    // JavaScript / TypeScript
    // (Your post screams JS: AudioWorkletProcessor, registerProcessor, const, this., =>)
    if (/\bAudioWorkletProcessor\b|\bregisterProcessor\s*\(|\bconst\b|\blet\b|\bvar\b|\bthis\.\w+|\bclass\s+\w+|\(\s*\)\s*=>|\bexport\s+(default\s+)?/.test(t)) {
      // If it smells like TS specifically, bump to TS
      if (/\binterface\s+\w+|\btype\s+\w+\s*=|\bimplements\s+\w+|:\s*(string|number|boolean|any|unknown)\b/.test(t)) {
        return "typescript";
      }
      return "javascript";
    }

    return "";
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
    const highlightWrap = pre.closest(".highlight");

    // 1) data-lang (best if present)
    const dataLang =
      code?.dataset?.lang ||
      pre.dataset?.lang ||
      figure?.dataset?.lang ||
      highlightWrap?.dataset?.lang;

    if (dataLang) return normalizeLangLabel(dataLang);

    // 2) language-* style classes
    const classToken =
      pickLangTokenFromClasses(code?.className || "") ||
      pickLangTokenFromClasses(pre.className || "") ||
      pickLangTokenFromClasses(figure?.className || "");

    if (classToken) return normalizeLangLabel(classToken);

    // 3) content-based guess (your current case)
    const guessed = guessLangFromText(getCodeText(pre));
    if (guessed) return normalizeLangLabel(guessed);

    return "CODE";
  };

  // ---------- main enhancer ----------
  const enhancePre = (pre) => {
    if (pre.closest(".codeblock")) return;
    if (!pre.innerText || !pre.innerText.trim()) return;

    const langLabel = findBestLang(pre);

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

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.append(bar, body);
    body.append(pre, fade);

    copyBtn.addEventListener("click", async () => {
      const text = getCodeText(pre);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
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
    document.querySelectorAll("pre").forEach(enhancePre);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
