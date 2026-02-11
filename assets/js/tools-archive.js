// tools-archive.js
(function () {
  const TOOLS = window.TOOLS_DATA || [];
  
  const els = {
    grid: document.getElementById("tools-grid"),
    searchInput: document.getElementById("searchInput"),
    resultsMeta: document.getElementById("resultsMeta")
  };

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

  function filteredTools() {
    const q = normalize(els.searchInput.value);
    if (!q) return TOOLS;
    
    return TOOLS.filter(tool => {
      const hay = normalize(`${tool.title} ${tool.desc}`);
      return hay.includes(q);
    });
  }

  function renderGrid() {
    const tools = filteredTools();
    els.grid.innerHTML = "";
    
    tools.forEach(tool => {
      const card = document.createElement("article");
      card.className = "archive-card";
      card.innerHTML = `
        <a href="${escapeHtml(tool.url)}" class="archive-card__link">
          <div class="archive-card__thumb">
            <img src="${escapeHtml(tool.thumb)}" alt="" loading="lazy" />
          </div>
          <div class="archive-card__body">
            <h2 class="archive-card__title">${escapeHtml(tool.title)}</h2>
            <p class="archive-card__desc">${escapeHtml(tool.desc)}</p>
          </div>
        </a>
      `;
      els.grid.appendChild(card);
    });

    // Update count
    els.resultsMeta.textContent = `${tools.length} tool${tools.length === 1 ? '' : 's'}`;
  }

  els.searchInput.addEventListener("input", renderGrid);
  
  // Focus search on "/" key
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== els.searchInput) {
      e.preventDefault();
      els.searchInput.focus();
    }
  });

  renderGrid();
})();