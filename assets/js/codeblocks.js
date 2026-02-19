/**
 * CodeBlocks - A SOLID, modular code block enhancement library
 *
 * Architecture:
 * - LanguageConfig: Configurable language detection/normalization (Open/Closed)
 * - DOMBuilders: Pure functions for creating DOM elements (Single Responsibility)
 * - ClipboardController: Injectable clipboard API (Dependency Inversion)
 * - ExpandController: Expand/collapse logic (Single Responsibility)
 * - TabsController: Tab navigation for groups (Single Responsibility)
 * - CodeBlockManager: Main orchestrator with lifecycle (Interface Segregation)
 */

// =============================================================================
// LanguageConfig - Configurable language detection and normalization
// =============================================================================

class LanguageConfig {
  static defaultNormalizationMap = {
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
    plaintext: "code",
    text: "code",
    supercollider: "sclang",
    sclang: "sclang",
    sc: "sclang",
    mojo: "mojo"
  };

  static defaultLabelMap = {
    javascript: "JAVASCRIPT",
    typescript: "TYPESCRIPT",
    shell: "SHELL",
    yaml: "YAML",
    csharp: "C#",
    cpp: "C++",
    sclang: "SCLANG",
    code: "CODE",
    mojo: "MOJO"
  };

  constructor(options = {}) {
    this.normalizationMap = {
      ...LanguageConfig.defaultNormalizationMap,
      ...options.normalizationMap,
    };
    this.labelMap = {
      ...LanguageConfig.defaultLabelMap,
      ...options.labelMap,
    };
  }

  normalize(token) {
    if (!token) return "";
    const key = String(token).trim().toLowerCase();
    return this.normalizationMap[key] || key;
  }

  getLabel(key) {
    return this.labelMap[key] || String(key).toUpperCase();
  }

  parseClassToken(classStr) {
    if (!classStr) return "";
    const patterns = [
      /(?:^|\s)language-([a-z0-9+-]+)(?=\s|$)/i,
      /(?:^|\s)lang(?:uage)?-([a-z0-9+-]+)(?=\s|$)/i,
      /(?:^|\s)highlight-source-([a-z0-9+-]+)(?=\s|$)/i,
    ];
    for (const pattern of patterns) {
      const match = classStr.match(pattern);
      if (match?.[1]) return match[1];
    }
    return "";
  }

  detectLanguage(blockEl) {
    const code = blockEl.querySelector("code");
    const pre = blockEl.matches("pre") ? blockEl : blockEl.querySelector("pre");
    const figure = blockEl.closest("figure");
    const highlightWrap = blockEl.closest(".highlight");

    // 1) Check data-lang attributes
    const dataLang =
      code?.dataset?.lang ||
      pre?.dataset?.lang ||
      blockEl?.dataset?.lang ||
      figure?.dataset?.lang ||
      highlightWrap?.dataset?.lang;

    if (dataLang) return this.normalize(dataLang);

    // 2) Check language-* classes on various elements
    const elements = [
      code,
      pre,
      blockEl,
      blockEl.parentElement,
      blockEl.parentElement?.parentElement,
      figure,
    ];

    for (const el of elements) {
      const token = this.parseClassToken(el?.className || "");
      if (token) return this.normalize(token);
    }

    return "code";
  }

  parseLabelMapAttribute(el) {
    const raw = el.getAttribute("data-labels");
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      const normalized = {};
      for (const [k, v] of Object.entries(obj)) {
        const nk = this.normalize(k);
        if (nk && typeof v === "string") normalized[nk] = v;
      }
      return normalized;
    } catch {
      return null;
    }
  }
}

// =============================================================================
// DOMBuilders - Pure functions for creating DOM elements
// =============================================================================

const DOMBuilders = {
  createSVG(viewBox = "0 0 24 24") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");
    return svg;
  },

  createSVGElement(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    return el;
  },

  copyIcon() {
    const svg = this.createSVG();
    svg.appendChild(
      this.createSVGElement("path", {
        d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2",
      })
    );
    svg.appendChild(
      this.createSVGElement("rect", {
        x: "8",
        y: "8",
        width: "12",
        height: "12",
        rx: "2",
        ry: "2",
      })
    );
    return svg;
  },

  checkIcon() {
    const svg = this.createSVG();
    svg.appendChild(
      this.createSVGElement("polyline", { points: "20 6 9 17 4 12" })
    );
    return svg;
  },

  chevronDownIcon() {
    const svg = this.createSVG();
    svg.appendChild(
      this.createSVGElement("polyline", { points: "6 9 12 15 18 9" })
    );
    return svg;
  },

  copyButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "codeblock__copy-btn";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.appendChild(this.copyIcon());
    return btn;
  },

  expandButton(label = "expand") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "codeblock__expand-btn";
    btn.setAttribute("aria-label", `${label} code block`);
    btn.setAttribute("aria-expanded", "false");

    const span = document.createElement("span");
    span.textContent = label;

    btn.appendChild(span);
    btn.appendChild(this.chevronDownIcon());
    return btn;
  },

  codeblockBar(langLabel, copyBtn) {
    const bar = document.createElement("div");
    bar.className = "codeblock__bar";

    const lang = document.createElement("div");
    lang.className = "codeblock__lang";
    lang.textContent = langLabel;

    const actions = document.createElement("div");
    actions.className = "codeblock__actions";
    if (copyBtn) actions.appendChild(copyBtn);

    bar.appendChild(lang);
    bar.appendChild(actions);
    return bar;
  },

  codeblockBody() {
    const body = document.createElement("div");
    body.className = "codeblock__body";

    const fade = document.createElement("div");
    fade.className = "codeblock__fade";
    body.appendChild(fade);

    return body;
  },

  codeblockWrapper() {
    const wrapper = document.createElement("section");
    wrapper.className = "codeblock";
    return wrapper;
  },

  codegroupBar(tabsContainer, copyBtn) {
    const bar = document.createElement("div");
    bar.className = "codegroup__bar";

    bar.appendChild(tabsContainer);

    if (copyBtn) {
      const actions = document.createElement("div");
      actions.className = "codegroup__actions";
      actions.appendChild(copyBtn);
      bar.appendChild(actions);
    }

    return bar;
  },

  tabsContainer() {
    const tabs = document.createElement("div");
    tabs.className = "codegroup__tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Code languages");
    return tabs;
  },

  tabButton(key, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "codegroup__tab";
    btn.dataset.lang = key;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.tabIndex = -1;
    btn.textContent = label;
    return btn;
  },

  codegroupPanel(key) {
    const panel = document.createElement("div");
    panel.className = "codegroup__panel";
    panel.dataset.lang = key;
    panel.hidden = true;
    panel.setAttribute("role", "tabpanel");
    return panel;
  },

  // Status region for accessibility announcements
  statusRegion() {
    const region = document.createElement("div");
    region.className = "codeblock__status sr-only";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    return region;
  },
};

// =============================================================================
// ClipboardController - Injectable clipboard API with fallback
// =============================================================================

class ClipboardController {
  constructor(options = {}) {
    this.clipboard = options.clipboard || navigator.clipboard;
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
  }

  async write(text) {
    try {
      if (this.clipboard?.writeText) {
        await this.clipboard.writeText(text);
      } else {
        this.fallbackCopy(text);
      }
      this.onSuccess();
      return true;
    } catch (err) {
      this.onError(err);
      return false;
    }
  }

  fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  }
}

// =============================================================================
// ExpandController - Handles expand/collapse logic
// =============================================================================

class ExpandController {
  constructor(options = {}) {
    this.collapsedMaxDefault = options.collapsedMaxDefault || 260;
    this.thresholdPadding = options.thresholdPadding || 60;
    this.minThreshold = options.minThreshold || 240;
  }

  getCollapsedMax(element) {
    const value = getComputedStyle(element)
      .getPropertyValue("--code-collapsed-max")
      .trim();
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : this.collapsedMaxDefault;
  }

  getThreshold(element) {
    const collapsedMax = this.getCollapsedMax(element);
    return Math.max(this.minThreshold, collapsedMax + this.thresholdPadding);
  }

  needsCollapse(element, measurable) {
    const threshold = this.getThreshold(element);
    return measurable.scrollHeight > threshold;
  }

  updateState(wrapper, expandBtn, measurable) {
    const needsCollapse = this.needsCollapse(wrapper, measurable);

    if (needsCollapse) {
      wrapper.classList.add("is-collapsible");
      expandBtn.style.display = "";

      // Initialize as collapsed if no state set
      if (
        !wrapper.classList.contains("is-collapsed") &&
        !wrapper.classList.contains("is-expanded")
      ) {
        wrapper.classList.add("is-collapsed");
      }

      this.updateButton(expandBtn, wrapper.classList.contains("is-collapsed"));
    } else {
      expandBtn.style.display = "none";
      wrapper.classList.remove("is-collapsible", "is-collapsed", "is-expanded");
    }
  }

  toggle(wrapper, expandBtn) {
    const isCollapsed = wrapper.classList.toggle("is-collapsed");
    wrapper.classList.toggle("is-expanded", !isCollapsed);
    this.updateButton(expandBtn, isCollapsed);
    return isCollapsed;
  }

  updateButton(btn, isCollapsed) {
    const label = isCollapsed ? "expand" : "collapse";
    const span = btn.querySelector("span");
    if (span) span.textContent = label;
    btn.setAttribute("aria-label", `${label} code block`);
    btn.setAttribute("aria-expanded", String(!isCollapsed));
  }
}

// =============================================================================
// TabsController - Handles tab navigation for code groups
// =============================================================================

class TabsController {
  constructor(options = {}) {
    this.storagePrefix = options.storagePrefix || "codegroup";
    this.useStorage = options.useStorage !== false;
  }

  getStorageKey(groupId, groupIndex, pathname) {
    return groupId
      ? `${this.storagePrefix}:${groupId}`
      : `${this.storagePrefix}:${pathname}:${groupIndex}`;
  }

  saveSelection(storageKey, lang) {
    if (!this.useStorage) return;
    try {
      localStorage.setItem(storageKey, lang);
    } catch {
      // Storage unavailable
    }
  }

  loadSelection(storageKey, availableLangs) {
    if (!this.useStorage) return null;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved && availableLangs.includes(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  setActiveTab(tabButtons, panels, key) {
    // Show first panel matching this language
    let shown = false;
    for (const { key: panelKey, panel } of panels) {
      if (!shown && panelKey === key) {
        panel.hidden = false;
        shown = true;
      } else {
        panel.hidden = true;
      }
    }

    // Update tab button states
    for (const btn of tabButtons) {
      const isActive = btn.dataset.lang === key;
      btn.setAttribute("aria-selected", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    }
  }

  handleKeyboardNavigation(e, tabButtons, setActive) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

    const currentIndex = tabButtons.findIndex(
      (b) => b.getAttribute("aria-selected") === "true"
    );
    if (currentIndex < 0) return;

    const nextIndex =
      e.key === "ArrowRight"
        ? (currentIndex + 1) % tabButtons.length
        : (currentIndex - 1 + tabButtons.length) % tabButtons.length;

    tabButtons[nextIndex].focus();
    setActive(tabButtons[nextIndex].dataset.lang);
    e.preventDefault();
  }
}

// =============================================================================
// CodeBlockManager - Main orchestrator with lifecycle management
// =============================================================================

class CodeBlockManager {
  static defaultOptions = {
    root: document,
    enableCopy: true,
    enableExpand: true,
    enableTabs: true,
    selectors: {
      codegroup: "[data-codegroup]",
      highlight: "div.highlight",
      pre: "pre",
    },
    processedAttr: "data-code-processed",
  };

  constructor(options = {}) {
    this.options = { ...CodeBlockManager.defaultOptions, ...options };
    this.root =
      typeof this.options.root === "string"
        ? document.querySelector(this.options.root)
        : this.options.root;

    // Dependency injection
    this.langConfig = options.langConfig || new LanguageConfig(options.lang);
    this.clipboard =
      options.clipboardController ||
      new ClipboardController(options.clipboard);
    this.expandCtrl =
      options.expandController || new ExpandController(options.expand);
    this.tabsCtrl = options.tabsController || new TabsController(options.tabs);

    // Event delegation handlers (stored for cleanup)
    this.delegatedHandlers = new Map();
    this.resizeHandlers = [];
    this.statusRegion = null;

    // Track managed elements for cleanup
    this.managedElements = new Set();
  }

  init() {
    if (!this.root) return this;

    // Create status region for accessibility
    this.statusRegion = DOMBuilders.statusRegion();
    const statusParent =
      this.root === document ? document.body : this.root;
    statusParent.appendChild(this.statusRegion);

    // Process code groups first (they may contain blocks)
    if (this.options.enableTabs) {
      this.enhanceCodeGroups();
    }

    // Then process standalone blocks
    this.enhanceStandaloneBlocks();

    // Setup delegated event listeners
    this.setupDelegation();

    return this;
  }

  destroy() {
    // Remove delegated handlers
    for (const [event, handler] of this.delegatedHandlers) {
      this.root.removeEventListener(event, handler);
    }
    this.delegatedHandlers.clear();

    // Remove resize handlers
    for (const handler of this.resizeHandlers) {
      window.removeEventListener("resize", handler);
    }
    this.resizeHandlers.length = 0;

    // Remove status region
    this.statusRegion?.remove();

    // Cleanup managed elements
    for (const el of this.managedElements) {
      el.removeAttribute(this.options.processedAttr);
    }
    this.managedElements.clear();

    return this;
  }

  // -------------------------------------------------------------------------
  // Block collection
  // -------------------------------------------------------------------------

  collectBlocks(root = this.root) {
    const { selectors, processedAttr } = this.options;
    const highlights = Array.from(root.querySelectorAll(selectors.highlight));
    const pres = Array.from(root.querySelectorAll(selectors.pre));

    const blocks = [];

    for (const h of highlights) {
      if (!h.textContent?.trim()) continue;
      blocks.push(h);
    }

    for (const pre of pres) {
      if (pre.closest(selectors.highlight)) continue;
      if (!pre.textContent?.trim()) continue;
      blocks.push(pre);
    }

    return blocks.filter(
      (el) =>
        !el.closest(".codeblock") &&
        !el.closest(".codegroup") &&
        el.getAttribute(processedAttr) !== "true"
    );
  }

  getCodeText(blockEl) {
    const code = blockEl.querySelector("code");
    const pre = blockEl.matches("pre") ? blockEl : blockEl.querySelector("pre");
    const el = code || pre || blockEl;
    return (el?.innerText || "").replace(/\s+$/, "");
  }

  getMeasurable(blockEl) {
    const pre = blockEl.matches("pre") ? blockEl : blockEl.querySelector("pre");
    return pre || blockEl;
  }

  // -------------------------------------------------------------------------
  // Event delegation
  // -------------------------------------------------------------------------

  setupDelegation() {
    // Delegated click handler for copy buttons
    const clickHandler = (e) => {
      const copyBtn = e.target.closest(".codeblock__copy-btn");
      if (copyBtn) {
        this.handleCopyClick(copyBtn, e);
        return;
      }

      const expandBtn = e.target.closest(".codeblock__expand-btn");
      if (expandBtn) {
        this.handleExpandClick(expandBtn, e);
        return;
      }

      const tabBtn = e.target.closest(".codegroup__tab");
      if (tabBtn) {
        this.handleTabClick(tabBtn, e);
      }
    };

    // Delegated keydown handler for tab navigation
    const keydownHandler = (e) => {
      const tabs = e.target.closest(".codegroup__tabs");
      if (tabs && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        this.handleTabKeydown(tabs, e);
      }
    };

    this.root.addEventListener("click", clickHandler);
    this.root.addEventListener("keydown", keydownHandler);

    this.delegatedHandlers.set("click", clickHandler);
    this.delegatedHandlers.set("keydown", keydownHandler);
  }

  async handleCopyClick(btn, e) {
    e.preventDefault();

    // Find the associated code block
    const wrapper =
      btn.closest(".codeblock") || btn.closest(".codegroup");
    if (!wrapper) return;

    let blockEl;
    if (wrapper.classList.contains("codegroup")) {
      // Get active panel
      const activePanel = wrapper.querySelector(
        ".codegroup__panel:not([hidden])"
      );
      blockEl = activePanel;
    } else {
      blockEl =
        wrapper.querySelector(".highlight") || wrapper.querySelector("pre");
    }

    if (!blockEl) return;

    const text = this.getCodeText(blockEl);
    const success = await this.clipboard.write(text);

    if (success) {
      this.showCopyFeedback(btn);
      this.announce("Code copied to clipboard");
    }
  }

  showCopyFeedback(btn) {
    const icon = btn.querySelector("svg");
    if (!icon) return;

    const checkIcon = DOMBuilders.checkIcon();
    icon.replaceWith(checkIcon);
    btn.setAttribute("aria-label", "Code copied to clipboard");

    setTimeout(() => {
      checkIcon.replaceWith(DOMBuilders.copyIcon());
      btn.setAttribute("aria-label", "Copy code to clipboard");
    }, 1100);
  }

  handleExpandClick(btn, e) {
    e.preventDefault();

    const wrapper =
      btn.closest(".codeblock") || btn.closest(".codegroup");
    if (!wrapper) return;

    this.expandCtrl.toggle(wrapper, btn);
  }

  handleTabClick(btn, e) {
    e.preventDefault();

    const group = btn.closest(".codegroup");
    if (!group) return;

    const lang = btn.dataset.lang;
    const groupData = this.getGroupData(group);
    if (!groupData) return;

    this.tabsCtrl.setActiveTab(groupData.tabButtons, groupData.panels, lang);
    this.tabsCtrl.saveSelection(groupData.storageKey, lang);

    requestAnimationFrame(() => {
      this.updateGroupExpandState(group, groupData);
    });
  }

  handleTabKeydown(tabs, e) {
    const tabButtons = Array.from(tabs.querySelectorAll(".codegroup__tab"));
    const group = tabs.closest(".codegroup");
    if (!group) return;

    const groupData = this.getGroupData(group);
    if (!groupData) return;

    this.tabsCtrl.handleKeyboardNavigation(e, tabButtons, (lang) => {
      this.tabsCtrl.setActiveTab(groupData.tabButtons, groupData.panels, lang);
      this.tabsCtrl.saveSelection(groupData.storageKey, lang);
      requestAnimationFrame(() => {
        this.updateGroupExpandState(group, groupData);
      });
    });
  }

  announce(message) {
    if (this.statusRegion) {
      this.statusRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        this.statusRegion.textContent = "";
      }, 1000);
    }
  }

  // -------------------------------------------------------------------------
  // Code groups (tabs)
  // -------------------------------------------------------------------------

  enhanceCodeGroups() {
    const groups = Array.from(
      this.root.querySelectorAll(this.options.selectors.codegroup)
    );

    groups.forEach((group, groupIndex) => {
      if (group.getAttribute(this.options.processedAttr) === "true") return;

      const blocks = this.collectBlocks(group);
      if (blocks.length < 2) {
        group.setAttribute(this.options.processedAttr, "true");
        return;
      }

      const labelMap = this.langConfig.parseLabelMapAttribute(group);
      if (!labelMap) {
        group.setAttribute(this.options.processedAttr, "true");
        return;
      }

      const labelKeys = Object.keys(labelMap);

      // Create panels
      const panels = blocks.map((blockEl, idx) => {
        const key =
          labelKeys.length === blocks.length
            ? labelKeys[idx]
            : this.langConfig.detectLanguage(blockEl);

        const panel = DOMBuilders.codegroupPanel(key);
        panel.appendChild(blockEl);
        return { key, panel };
      });

      // Get unique languages in order
      const langs = [...new Set(panels.map((p) => p.key))];

      group.classList.add("codegroup");

      // Build UI components
      const tabs = DOMBuilders.tabsContainer();
      const copyBtn = this.options.enableCopy ? DOMBuilders.copyButton() : null;
      const expandBtn = this.options.enableExpand
        ? DOMBuilders.expandButton("expand")
        : null;

      const bar = DOMBuilders.codegroupBar(tabs, copyBtn);

      // Create tab buttons
      const tabButtons = langs.map((key) => {
        const label = labelMap[key] || this.langConfig.getLabel(key);
        const btn = DOMBuilders.tabButton(key, label);
        tabs.appendChild(btn);
        return btn;
      });

      // Store group ID before clearing
      const originalId = group.id;

      // Rebuild DOM
      group.innerHTML = "";
      group.appendChild(bar);
      panels.forEach((p) => group.appendChild(p.panel));
      if (expandBtn) group.appendChild(expandBtn);

      // Calculate storage key
      const storageKey = this.tabsCtrl.getStorageKey(
        originalId,
        groupIndex,
        location.pathname
      );

      // Store group data for event delegation
      group._codeblockData = {
        panels,
        tabButtons,
        langs,
        storageKey,
        expandBtn,
      };

      // Initialize with saved or first tab
      const initial =
        this.tabsCtrl.loadSelection(storageKey, langs) || langs[0];
      this.tabsCtrl.setActiveTab(tabButtons, panels, initial);

      // Setup expand state
      if (expandBtn) {
        requestAnimationFrame(() => {
          this.updateGroupExpandState(group, group._codeblockData);
        });

        const resizeHandler = () =>
          this.updateGroupExpandState(group, group._codeblockData);
        window.addEventListener("resize", resizeHandler);
        this.resizeHandlers.push(resizeHandler);
      }

      group.setAttribute(this.options.processedAttr, "true");
      this.managedElements.add(group);
    });
  }

  getGroupData(group) {
    return group._codeblockData || null;
  }

  updateGroupExpandState(group, groupData) {
    const { panels, expandBtn } = groupData;
    if (!expandBtn) return;

    const activePanel = panels.find((p) => !p.panel.hidden)?.panel;
    if (!activePanel) {
      expandBtn.style.display = "none";
      group.classList.remove("is-collapsible", "is-collapsed", "is-expanded");
      return;
    }

    const measurable = this.getMeasurable(activePanel);
    this.expandCtrl.updateState(group, expandBtn, measurable);
  }

  // -------------------------------------------------------------------------
  // Standalone blocks
  // -------------------------------------------------------------------------

  enhanceStandaloneBlocks() {
    const blocks = this.collectBlocks();
    blocks.forEach((blockEl) => this.enhanceStandaloneBlock(blockEl));
  }

  enhanceStandaloneBlock(blockEl) {
    if (blockEl.closest(".codeblock")) return;
    if (blockEl.closest(".codegroup")) return;
    if (!blockEl.textContent?.trim()) return;

    const langKey = this.langConfig.detectLanguage(blockEl);
    const langLabel = this.langConfig.getLabel(langKey);

    // Build components
    const wrapper = DOMBuilders.codeblockWrapper();
    const copyBtn = this.options.enableCopy ? DOMBuilders.copyButton() : null;
    const expandBtn = this.options.enableExpand
      ? DOMBuilders.expandButton("expand")
      : null;
    const bar = DOMBuilders.codeblockBar(langLabel, copyBtn);
    const body = DOMBuilders.codeblockBody();

    // Assemble DOM
    blockEl.parentNode.insertBefore(wrapper, blockEl);
    wrapper.appendChild(bar);
    wrapper.appendChild(body);
    if (expandBtn) wrapper.appendChild(expandBtn);

    // Move block into body (before fade element)
    body.insertBefore(blockEl, body.firstChild);

    // Setup expand state
    if (expandBtn) {
      const measurable = this.getMeasurable(blockEl);

      requestAnimationFrame(() => {
        this.expandCtrl.updateState(wrapper, expandBtn, measurable);
      });

      const resizeHandler = () => {
        this.expandCtrl.updateState(wrapper, expandBtn, measurable);
      };
      window.addEventListener("resize", resizeHandler);
      this.resizeHandlers.push(resizeHandler);
    }

    blockEl.setAttribute(this.options.processedAttr, "true");
    this.managedElements.add(wrapper);
  }
}

// =============================================================================
// Auto-initialization (backwards compatible)
// =============================================================================

(() => {
  // Expose classes globally for advanced usage
  window.CodeBlocks = {
    LanguageConfig,
    DOMBuilders,
    ClipboardController,
    ExpandController,
    TabsController,
    CodeBlockManager,
  };

  // Auto-initialize with defaults
  const initCodeBlocks = () => {
    window.codeBlockManager = new CodeBlockManager().init();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCodeBlocks);
  } else {
    initCodeBlocks();
  }
})();
