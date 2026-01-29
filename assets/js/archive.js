/**
 * Unified Archive Script
 *
 * Expects the page to define:
 *   window.ARCHIVE_POSTS  - Array of post objects
 *   window.ARCHIVE_CONFIG - Configuration object
 *
 * Config options:
 *   mode: "link" | "video"  (default: "link")
 *   showPagination: boolean (default: false)
 *   showClearBtn: boolean   (default: false)
 *   showAllTag: boolean     (default: false)
 *   pageSize: number        (default: 9)
 *   ytBase: string          (default: "https://www.youtube-nocookie.com/embed/")
 */

(function () {
  const POSTS = window.ARCHIVE_POSTS || [];
  const CONFIG = Object.assign(
    {
      mode: "link",
      showPagination: false,
      showClearBtn: false,
      showAllTag: false,
      pageSize: 9,
      ytBase: "https://www.youtube-nocookie.com/embed/",
    },
    window.ARCHIVE_CONFIG || {}
  );

  let activeTag = CONFIG.showAllTag ? "All" : null;
  let query = "";
  let sortMode = "new";
  let shown = 0;

  // DOM elements
  const els = {
    grid: document.getElementById("grid"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    tagBar: document.getElementById("tagBar"),
    resultsMeta: document.getElementById("resultsMeta"),
    clearBtn: document.getElementById("clearBtn"),
    loadMoreBtn: document.getElementById("loadMoreBtn"),
    modal: document.getElementById("modal"),
    playerFrame: document.getElementById("playerFrame"),
    modalTitle: document.getElementById("modalTitle"),
    modalMeta: document.getElementById("modalMeta"),
    modalDesc: document.getElementById("modalDesc"),
  };

  // Utility functions
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(s) {
    return (s || "").toLowerCase().trim();
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function ytThumb(id) {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  // Get all unique tags
  function allTags() {
    const tags = [...new Set(POSTS.flatMap((p) => p.tags || []))].sort((a, b) =>
      a.localeCompare(b)
    );
    return CONFIG.showAllTag ? ["All", ...tags] : tags;
  }

  // Filter and sort posts
  function filteredPosts() {
    const q = normalize(query);
    let list = POSTS.slice();

    // Tag filter
    if (activeTag && activeTag !== "All") {
      list = list.filter((p) => (p.tags || []).includes(activeTag));
    }

    // Search filter
    if (q) {
      list = list.filter((p) => {
        const hay = normalize(
          `${p.title} ${p.desc || ""} ${(p.tags || []).join(" ")}`
        );
        return hay.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortMode === "az") return a.title.localeCompare(b.title);
      if (sortMode === "old") return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });

    return list;
  }

  // Render tag bar
  function renderTags() {
    const tags = allTags();
    els.tagBar.innerHTML = "";

    tags.forEach((tag) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "archive-tag";
      btn.textContent = tag;

      const isActive = CONFIG.showAllTag
        ? tag === activeTag
        : tag === activeTag;
      btn.setAttribute("aria-pressed", String(isActive));

      btn.addEventListener("click", () => {
        if (CONFIG.showAllTag) {
          activeTag = tag;
        } else {
          activeTag = activeTag === tag ? null : tag;
        }
        shown = 0;
        renderGrid();
        renderTags();
      });

      els.tagBar.appendChild(btn);
    });
  }

  // Create a card element for link mode (blog posts)
  function createLinkCard(post) {
    const card = document.createElement("article");
    card.className = "archive-card";

    const thumb = post.image
      ? `<div class="archive-card__thumb">
           <img src="${escapeHtml(post.image)}" alt="" loading="lazy" />
         </div>`
      : "";

    card.innerHTML = `
      <a href="${escapeHtml(post.slug)}" class="archive-card__link">
        ${thumb}
        <div class="archive-card__body">
          <h2 class="archive-card__title">${escapeHtml(post.title)}</h2>
          <p class="archive-card__desc">${escapeHtml(post.desc || "")}</p>
        </div>
      </a>
    `;

    return card;
  }

  // Create a card element for video mode (YouTube)
  function createVideoCard(post) {
    const card = document.createElement("article");
    card.className = "archive-card";
    card.tabIndex = 0;

    const tagsHtml = (post.tags || [])
      .slice(0, 5)
      .map((t) => `<span class="archive-pill">${escapeHtml(t)}</span>`)
      .join("");

    card.innerHTML = `
      <div class="archive-card__thumb">
        <img src="${ytThumb(post.id)}" alt="" loading="lazy" />
      </div>
      <div class="archive-card__body">
        <h3 class="archive-card__title">${escapeHtml(post.title)}</h3>
        <div class="archive-card__meta">${fmtDate(post.date)} &bull; ${(post.tags || []).slice(0, 3).join(", ")}</div>
        <div class="archive-pills">${tagsHtml}</div>
      </div>
    `;

    const open = () => openModal(post);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    return card;
  }

  // Create card based on mode
  function createCard(post) {
    return CONFIG.mode === "video"
      ? createVideoCard(post)
      : createLinkCard(post);
  }

  // Render the grid
  function renderGrid() {
    const list = filteredPosts();
    const total = list.length;

    let itemsToShow;
    if (CONFIG.showPagination) {
      itemsToShow = list.slice(0, shown + CONFIG.pageSize);
      const prevShown = shown;
      shown = itemsToShow.length;

      if (prevShown === 0) {
        els.grid.innerHTML = "";
        itemsToShow.forEach((p) => els.grid.appendChild(createCard(p)));
      } else {
        itemsToShow
          .slice(prevShown)
          .forEach((p) => els.grid.appendChild(createCard(p)));
      }
    } else {
      els.grid.innerHTML = "";
      list.forEach((p) => els.grid.appendChild(createCard(p)));
      shown = list.length;
    }

    // Update results meta
    let metaText;
    if (CONFIG.showPagination) {
      metaText = `${shown} of ${total} shown`;
      if (activeTag && activeTag !== "All") metaText += ` \u2022 tag: ${activeTag}`;
      if (query) metaText += ` \u2022 search: "${query}"`;
    } else {
      metaText = `${total} post${total === 1 ? "" : "s"}`;
    }
    els.resultsMeta.textContent = metaText;

    // Toggle load more button
    if (els.loadMoreBtn) {
      els.loadMoreBtn.style.display =
        CONFIG.showPagination && shown < total ? "inline-flex" : "none";
    }
  }

  // Modal functions (video mode only)
  function openModal(post) {
    if (!els.modal) return;

    els.modal.classList.add("is-open");
    els.modal.setAttribute("aria-hidden", "false");

    els.modalTitle.textContent = post.title;
    els.modalMeta.textContent = `${fmtDate(post.date)} \u2022 ${(post.tags || []).join(", ")}`;
    els.modalDesc.textContent = post.desc || "";
    els.playerFrame.src = `${CONFIG.ytBase}${post.id}?autoplay=1&rel=0&modestbranding=1`;

    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!els.modal) return;

    els.modal.classList.remove("is-open");
    els.modal.setAttribute("aria-hidden", "true");
    els.playerFrame.src = "";
    document.body.style.overflow = "";
  }

  // Clear all filters
  function clearFilters() {
    activeTag = CONFIG.showAllTag ? "All" : null;
    query = "";
    sortMode = "new";
    els.searchInput.value = "";
    els.sortSelect.value = "new";
    shown = 0;
    renderTags();
    renderGrid();
  }

  // Event listeners
  els.searchInput.addEventListener("input", (e) => {
    query = e.target.value;
    shown = 0;
    renderGrid();
  });

  els.sortSelect.addEventListener("change", (e) => {
    sortMode = e.target.value;
    shown = 0;
    renderGrid();
  });

  if (els.clearBtn) {
    els.clearBtn.addEventListener("click", clearFilters);
  }

  if (els.loadMoreBtn) {
    els.loadMoreBtn.addEventListener("click", () => renderGrid());
  }

  if (els.modal) {
    els.modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-close]")) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (els.modal && e.key === "Escape" && els.modal.classList.contains("is-open")) {
      closeModal();
    }
    if (e.key === "/" && document.activeElement !== els.searchInput) {
      e.preventDefault();
      els.searchInput.focus();
    }
  });

  // Initial render
  renderTags();
  renderGrid();
})();
