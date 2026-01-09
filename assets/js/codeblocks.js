/* assets/js/codeblocks.js
   - Standalone blocks: wrap with .codeblock (lang + copy + expand/collapse)
   - Grouped blocks: <div data-codegroup ... data-labels='{"cpp":"...","javascript":"..."}'>
     becomes tabbed .codegroup with shared copy/expand.
   - NO language guessing: languages must be explicit (fence / class / data-lang).
*/

(() => {
  // =========================================================
  // Language detection (explicit only)
  // =========================================================

  const pickLangTokenFromClasses = (classStr) => {
    if (!classStr) return "";
    const m =
      classStr.match(/(?:^|\s)language-([a-z0-9+-]+)(?=\s|$)/i) ||
      classStr.match(/(?:^|\s)lang(?:uage)?-([a-z0-9+-]+)(?=\s|$)/i) ||
      classStr.match(/(?:^|\s)highlight-source-([a-z0-9+-]+)(?=\s|$)/i);
    return (m && m[1]) ? m[1] : "";
  };

  const normalizeLangKey = (token) => {
    if (!token) return "";
    const key = String(token).trim().toLowerCase();

    const map = {
      js: "javascript",
      javascript: "javascript",
      mjs: "javascript",
      cjs: "javascript",

      ts: "typescript",
      typescript: "typescript",

      sh: "shell",
      shell: "shell",
      bash: "shell",
      zsh: "shell",

      yml: "yaml",
      yaml: "yaml",

      cs: "csharp",
      csharp: "csharp",

      cpp: "cpp",
      cc: "cpp",
      cxx: "cpp",
      "c++": "cpp",

      supercollider: "supercollider",
      sclang: "supercollider",
      sc: "supercollider",
    };

    return map[key] || key;
  };

  const labelForLangKey = (key) => {
    const map = {
      javascript: "JAVASCRIPT",
      typescript: "TYPESCRIPT",
      shell: "SHELL",
      yaml: "YAML",
      csharp: "C#",
      cpp: "C++",
      supercollider: "SUPERCOLLIDER",
      code: "CODE",
    };
    return map[key] || String(key).toUpperCase();
  };

  const parseLabelMap = (el) => {
    const raw = el.getAttribute("data-labels");
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      const normalized = {};
      for (const [k, v] of Object.entries(obj)) {
        const nk = normalizeLangKey(k);
        if (nk && typeof v === "string") normalized[nk] = v;
      }
      return normalized;
    } catch {
      return null;
    }
  };

  const findExplicitLangKey = (blockEl) => {
    const code = blockEl.querySelector("code");
    const pre = blockEl.matches("pre") ? blockEl : blockEl.querySelector("pre");
    const figure = blockEl.closest("figure");
    const highlightWrap = blockEl.closest(".highlight");

    // 1) data-lang
    const dataLang =
      code?.dataset?.lang ||
      pre?.dataset?.lang ||
      blockEl?.dataset?.lang ||
      figure?.dataset?.lang ||
      highlightWrap?.dataset?.lang;

    if (dataLang) return normalizeLangKey(dataLang);

    // 2) language-* classes
    const classToken =
      pickLangTokenFromClasses(code?.className || "") ||
      pickLangTokenFromClasses(pre?.className || "") ||
      pickLangTokenFromClasses(blockEl.className || "") ||
      pickLangTokenFromClasses(figure?.className || "");

    if (classToken) return normalizeLangKey(classToken);

    return "code";
  };

  // =========================================================
  // DOM helpers
  // =========================================================

  const makeBtn = (label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "codeblock__btn";
    b.textContent = label;
    return b;
  };

  const getCodeTextFromBlock = (blockEl) => {
    const code = blockEl.querySelector("code");
    const pre = blockEl.matches("pre") ? blockEl : blockEl.querySelector("pre");
    const el = code || pre || blockEl;
    return (el ? el.innerText : "").replace(/\s+$/, "");
  };

  const copyWithFeedback = async (btn, text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);
      }
      btn.textContent = "copied";
      window.setTimeout(() => (btn.textContent = "copy"), 1100);
    } catch {
      btn.textContent = "copy";
    }
  };

  const getCollapsedMaxPx = (referenceEl) => {
    const v = getComputedStyle(referenceEl).getPropertyValue("--code-collapsed-max").trim();
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 260;
  };

  // Collect “block units”:
  // - Prefer Rouge wrapper div.highlight
  // - Otherwise use <pre> not inside div.highlight
  const collectBlocksWithin = (root) => {
    const highlights = Array.from(root.querySelectorAll("div.highlight"));
    const pres = Array.from(root.querySelectorAll("pre"));

    const blocks = [];

    for (const h of highlights) {
      if (!h.textContent || !h.textContent.trim()) continue;
      blocks.push(h);
    }

    for (const pre of pres) {
      if (pre.closest("div.highlight")) continue;
      if (!pre.textContent || !pre.textContent.trim()) continue;
      blocks.push(pre);
    }

    return blocks.filter((el) => !el.closest(".codeblock") && !el.closest(".codegroup"));
  };

  // =========================================================
  // 1) Code groups (tabs)
  // =========================================================

  const enhanceCodeGroups = () => {
    const groups = Array.from(document.querySelectorAll("[data-codegroup]"));

    groups.forEach((group, groupIndex) => {
      if (group.getAttribute("data-code-processed") === "true") return;

      const blocks = collectBlocksWithin(group);
      if (blocks.length < 2) {
        group.setAttribute("data-code-processed", "true");
        return;
      }

      const labelMap = parseLabelMap(group);
      if (!labelMap) {
        // If you want explicit-only behavior, require data-labels for groups.
        // Otherwise we'd have to infer languages from fences/classes anyway.
        group.setAttribute("data-code-processed", "true");
        return;
      }

      const labelKeys = Object.keys(labelMap);

      // Authoritative mapping: blocks map to label keys by order.
      // If counts mismatch, fall back to explicit detection per block.
      const panels = blocks.map((blockEl, idx) => {
        const key =
          (labelKeys.length === blocks.length)
            ? labelKeys[idx]
            : findExplicitLangKey(blockEl);

        const panel = document.createElement("div");
        panel.className = "codegroup__panel";
        panel.dataset.lang = key;
        panel.hidden = true;
        panel.appendChild(blockEl);
        return { key, panel };
      });

      // Build unique lang list in order of appearance
      const langs = [];
      for (const p of panels) if (!langs.includes(p.key)) langs.push(p.key);

      group.classList.add("codegroup");

      // Build bar
      const bar = document.createElement("div");
      bar.className = "codegroup__bar";

      const tabs = document.createElement("div");
      tabs.className = "codegroup__tabs";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "Code languages");

      const actions = document.createElement("div");
      actions.className = "codegroup__actions";

      const copyBtn = makeBtn("copy");
      const expandBtn = makeBtn("expand");

      actions.append(copyBtn, expandBtn);
      bar.append(tabs, actions);

      // Rebuild DOM inside group
      const originalId = group.id;
      group.innerHTML = "";
      group.appendChild(bar);
      panels.forEach((p) => group.appendChild(p.panel));

      // Tabs
      const tabButtons = langs.map((key) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "codegroup__tab";
        b.dataset.lang = key;
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", "false");
        b.tabIndex = -1;

        b.textContent = labelMap[key] || labelForLangKey(key);
        tabs.appendChild(b);
        return b;
      });

      const storageKey = originalId
        ? `codegroup:${originalId}`
        : `codegroup:${location.pathname}:${groupIndex}`;

      const setActive = (key) => {
        // Show first panel for this lang
        let shown = false;
        for (const p of panels) {
          if (!shown && p.key === key) {
            p.panel.hidden = false;
            shown = true;
          } else {
            p.panel.hidden = true;
          }
        }

        for (const btn of tabButtons) {
          const active = btn.dataset.lang === key;
          btn.setAttribute("aria-selected", active ? "true" : "false");
          btn.tabIndex = active ? 0 : -1;
        }

        try { localStorage.setItem(storageKey, key); } catch {}
      };

      const getActivePanel = () => panels.find((p) => !p.panel.hidden)?.panel || null;

      const updateExpandUI = () => {
        const activePanel = getActivePanel();
        if (!activePanel) {
          expandBtn.style.display = "none";
          group.classList.remove("is-collapsible", "is-collapsed", "is-expanded");
          return;
        }

        const collapsedMax = getCollapsedMaxPx(group);
        const threshold = Math.max(240, collapsedMax + 60);

        const pre = activePanel.querySelector("pre") || activePanel;
        const fullHeight = pre.scrollHeight;

        if (fullHeight > threshold) {
          group.classList.add("is-collapsible");
          expandBtn.style.display = "";

          if (!group.classList.contains("is-collapsed") && !group.classList.contains("is-expanded")) {
            group.classList.add("is-collapsed");
          }

          expandBtn.textContent = group.classList.contains("is-collapsed") ? "expand" : "collapse";
        } else {
          expandBtn.style.display = "none";
          group.classList.remove("is-collapsible", "is-collapsed", "is-expanded");
        }
      };

      // Initial tab (restore if saved)
      let initial = langs[0];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && langs.includes(saved)) initial = saved;
      } catch {}

      setActive(initial);

      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          setActive(btn.dataset.lang);
          requestAnimationFrame(updateExpandUI);
        });
      });

      // Keyboard arrows
      tabs.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const currentIndex = tabButtons.findIndex((b) => b.getAttribute("aria-selected") === "true");
        if (currentIndex < 0) return;

        const nextIndex =
          e.key === "ArrowRight"
            ? (currentIndex + 1) % tabButtons.length
            : (currentIndex - 1 + tabButtons.length) % tabButtons.length;

        tabButtons[nextIndex].focus();
        tabButtons[nextIndex].click();
        e.preventDefault();
      });

      copyBtn.addEventListener("click", async () => {
        const activePanel = getActivePanel();
        if (!activePanel) return;
        await copyWithFeedback(copyBtn, getCodeTextFromBlock(activePanel));
      });

      expandBtn.addEventListener("click", () => {
        const collapsed = group.classList.toggle("is-collapsed");
        group.classList.toggle("is-expanded", !collapsed);
        expandBtn.textContent = collapsed ? "expand" : "collapse";
      });

      requestAnimationFrame(updateExpandUI);
      window.addEventListener("resize", () => updateExpandUI());

      group.setAttribute("data-code-processed", "true");
    });
  };

  // =========================================================
  // 2) Standalone blocks (.codeblock wrapper)
  // =========================================================

  const enhanceStandaloneBlock = (blockEl) => {
    if (blockEl.closest(".codeblock")) return;
    if (blockEl.closest(".codegroup")) return;
    if (!blockEl.textContent || !blockEl.textContent.trim()) return;

    const langKey = findExplicitLangKey(blockEl);
    const langLabel = labelForLangKey(langKey);

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

    blockEl.parentNode.insertBefore(wrapper, blockEl);
    wrapper.append(bar, body);
    body.append(blockEl, fade);

    copyBtn.addEventListener("click", async () => {
      await copyWithFeedback(copyBtn, getCodeTextFromBlock(blockEl));
    });

    const updateExpandUI = () => {
      const collapsedMax = getCollapsedMaxPx(wrapper);
      const threshold = Math.max(240, collapsedMax + 60);

      const pre = blockEl.matches("pre") ? blockEl : blockEl.querySelector("pre");
      const measurable = pre || blockEl;

      const fullHeight = measurable.scrollHeight;

      if (fullHeight > threshold) {
        wrapper.classList.add("is-collapsible");
        if (!wrapper.classList.contains("is-collapsed")) wrapper.classList.add("is-collapsed");
        expandBtn.style.display = "";
        expandBtn.textContent = wrapper.classList.contains("is-collapsed") ? "expand" : "collapse";
      } else {
        expandBtn.style.display = "none";
        wrapper.classList.remove("is-collapsible", "is-collapsed");
      }
    };

    expandBtn.addEventListener("click", () => {
      const collapsed = wrapper.classList.toggle("is-collapsed");
      expandBtn.textContent = collapsed ? "expand" : "collapse";
    });

    requestAnimationFrame(updateExpandUI);
    window.addEventListener("resize", () => updateExpandUI());
  };

  const enhanceStandaloneBlocks = () => {
    const blocks = collectBlocksWithin(document);
    blocks.forEach(enhanceStandaloneBlock);
  };

  // =========================================================
  // Init
  // =========================================================

  const init = () => {
    enhanceCodeGroups();       // must run first
    enhanceStandaloneBlocks(); // then wrap everything else
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
