// ====== 1) EDIT THIS LIST TO ADD NEW POSTS ======
const POSTS = [
  {
    id: "dQw4w9WgXcQ",
    title: "Creature Layering Study — Footsteps + Vocalizations",
    date: "2025-12-01",
    tags: ["creature", "foley", "layering"],
    desc: "Short breakdown of creature footsteps + vocal layers, with before/after passes."
  },
  {
    id: "ysz5S6PUM-U",
    title: "UI + Menu SFX Pack — Micro-Animations",
    date: "2025-11-14",
    tags: ["ui", "sfx", "design"],
    desc: "A tight UI set focusing on micro-feedback, clicks, toggles, and gentle confirm sounds."
  },
  {
    id: "aqz-KE-bpKQ",
    title: "Ambient Bed Design — Tension Without Music",
    date: "2025-10-30",
    tags: ["ambience", "tension", "mix"],
    desc: "Building a bed that supports suspense: detail motion, distant events, and spectral movement."
  }
];

const PAGE_SIZE = 9;
const YT_BASE = "https://www.youtube-nocookie.com/embed/";

let activeTag = "All";
let query = "";
let sortMode = "new";
let shown = 0;

const els = {
  tagBar: document.getElementById("tagBar"),
  grid: document.getElementById("grid"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  clearBtn: document.getElementById("clearBtn"),
  loadMoreBtn: document.getElementById("loadMoreBtn"),
  resultsMeta: document.getElementById("resultsMeta"),
  modal: document.getElementById("modal"),
  playerFrame: document.getElementById("playerFrame"),
  modalTitle: document.getElementById("modalTitle"),
  modalMeta: document.getElementById("modalMeta"),
  modalDesc: document.getElementById("modalDesc"),
};

function uniq(arr){ return [...new Set(arr)]; }
function normalize(s){ return (s || "").toLowerCase().trim(); }
function fmtDate(iso){
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
}
function ytThumb(id){ return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }

function allTags(){
  const t = POSTS.flatMap(p => p.tags || []);
  return ["All", ...uniq(t).sort((a,b)=>a.localeCompare(b))];
}

function filteredPosts(){
  const q = normalize(query);
  let list = POSTS.slice();

  if (activeTag !== "All") list = list.filter(p => (p.tags || []).includes(activeTag));
  if (q) {
    list = list.filter(p => {
      const hay = normalize(`${p.title} ${(p.desc||"")} ${(p.tags||[]).join(" ")}`);
      return hay.includes(q);
    });
  }

  list.sort((a,b)=>{
    if (sortMode === "az") return a.title.localeCompare(b.title);
    if (sortMode === "old") return new Date(a.date) - new Date(b.date);
    return new Date(b.date) - new Date(a.date);
  });

  return list;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderTags(){
  const tags = allTags();
  els.tagBar.innerHTML = "";

  tags.forEach(tag => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sd-tag";
    btn.textContent = tag;
    btn.setAttribute("aria-pressed", String(tag === activeTag));
    btn.addEventListener("click", () => {
      activeTag = tag;
      shown = 0;
      renderAll();
    });
    els.tagBar.appendChild(btn);
  });
}

function cardEl(post){
  const card = document.createElement("article");
  card.className = "sd-card";
  card.tabIndex = 0;

  card.innerHTML = `
    <div class="sd-thumb">
      <img src="${ytThumb(post.id)}" alt="" loading="lazy" />
    </div>
    <div class="sd-card__body">
      <h3 class="sd-card__title">${escapeHtml(post.title)}</h3>
      <div class="sd-card__meta">${fmtDate(post.date)} • ${(post.tags || []).slice(0,3).join(", ")}</div>
      <div class="sd-pills">
        ${(post.tags || []).slice(0,5).map(t => `<span class="sd-pill">${escapeHtml(t)}</span>`).join("")}
      </div>
    </div>
  `;

  const open = () => openModal(post);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });

  return card;
}

function renderGrid(){
  const list = filteredPosts();
  const total = list.length;

  const next = list.slice(0, shown + PAGE_SIZE);
  const prevShown = shown;
  shown = next.length;

  if (prevShown === 0) els.grid.innerHTML = "";
  next.slice(prevShown).forEach(p => els.grid.appendChild(cardEl(p)));

  els.resultsMeta.textContent =
    `${shown} of ${total} shown` +
    (activeTag !== "All" ? ` • tag: ${activeTag}` : "") +
    (query ? ` • search: "${query}"` : "");

  els.loadMoreBtn.style.display = shown < total ? "inline-flex" : "none";
}

function openModal(post){
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");

  els.modalTitle.textContent = post.title;
  els.modalMeta.textContent = `${fmtDate(post.date)} • ${(post.tags || []).join(", ")}`;
  els.modalDesc.textContent = post.desc || "";
  els.playerFrame.src = `${YT_BASE}${post.id}?autoplay=1&rel=0&modestbranding=1`;

  document.body.style.overflow = "hidden";
}

function closeModal(){
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  els.playerFrame.src = "";
  document.body.style.overflow = "";
}

function renderAll(){
  renderTags();
  shown = 0;
  renderGrid();
}

els.searchInput.addEventListener("input", (e) => {
  query = e.target.value;
  shown = 0;
  renderAll();
});

els.sortSelect.addEventListener("change", (e) => {
  sortMode = e.target.value;
  shown = 0;
  renderAll();
});

els.clearBtn.addEventListener("click", () => {
  activeTag = "All";
  query = "";
  sortMode = "new";
  els.searchInput.value = "";
  els.sortSelect.value = "new";
  shown = 0;
  renderAll();
});

els.loadMoreBtn.addEventListener("click", () => renderGrid());

els.modal.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.modal.classList.contains("is-open")) closeModal();
  if (e.key === "/" && document.activeElement !== els.searchInput) {
    e.preventDefault();
    els.searchInput.focus();
  }
});

renderAll();