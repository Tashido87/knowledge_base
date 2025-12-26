/* =========================================================
   KnowledgeOcean — Polished UI (calm, white-based, responsive)
   ---------------------------------------------------------
   Google Sheets columns expected:
   A: Question
   B: Answer
   C: Category
   D: Tags (comma-separated)
   G-L: Snippets (optional)
   ========================================================= */

/* =========================
   CONFIGURATION (edit these)
   ========================= */
const API_KEY = "AIzaSyD1mbSNTOVDpWe1voq9UeG0l-KzieTOB9Q";
const SHEET_ID = "1U0aZe4LUU5qL3seGHRr2Wakb6-NIz_KLlWPSYz4P_3I";
const TAB_NAME = "Sheet1";
const RANGE = `${TAB_NAME}!A2:L`;
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

/* =========================
   Local storage keys
   ========================= */
const LS_THEME = "kb_theme";
const LS_FAVS = "kb_favs";
const LS_VIEW = "kb_view";

/* =========================
   State
   ========================= */
let allData = [];
let cardElements = new Map(); // id -> HTMLElement (Library cards)
let favorites = new Set(JSON.parse(localStorage.getItem(LS_FAVS) || "[]"));
let currentModalId = null;
let lastFocusedElement = null;

// Pagination (Library)
const ITEMS_PER_PAGE = 20;
const PAGE_WINDOW = 5; // show 5 page numbers
let currentPage = 1;
let lastTotalPages = 1;

// Pull to Refresh State
let ptrStartY = 0;
let ptrDist = 0;
let isRefreshing = false;
const PTR_THRESHOLD = 80;

// Image Viewer State
let ivState = {
  scale: 1,
  panning: false,
  pointX: 0,
  pointY: 0,
  startX: 0,
  startY: 0,
  startScale: 1,
  startDist: 0,
};

/* =========================
   DOM
   ========================= */
const $ = (sel, root = document) => root.querySelector(sel);

const grid = $("#cardGrid");
const favGrid = $("#favGrid");
const skeleton = $("#skeleton");

const emptyState = $("#emptyState");
const savedEmpty = $("#savedEmpty");

const resultMeta = $("#resultMeta");

const pagination = $("#pagination");

const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  library: $("#view-library"),
  saved: $("#view-saved"),
};

const libraryTools = $("#libraryTools");

const searchInput = $("#searchInput");
const clearSearchBtn = $("#clearSearchBtn");
const resetFiltersBtn = $("#resetFiltersBtn");

const sortSelect = $("#sortSelect");
const catSelect = $("#catSelect");
const sortSelectMobile = $("#sortSelectMobile");
const catSelectMobile = $("#catSelectMobile");
const openFiltersBtn = $("#openFiltersBtn");

const filterDrawer = $("#filterDrawer");
const applyFiltersBtn = $("#applyFiltersBtn");
const resetFiltersBtnMobile = $("#resetFiltersBtnMobile");

const themeToggle = $("#themeToggle");
const brandBtn = $("#brandBtn");

const goLibraryBtn = $("#goLibraryBtn");

// Modal
const modal = $("#modal");
const closeModalBtn = $("#closeModalBtn");
const modalShareBtn = $("#modalShareBtn");
const modalLoveBtn = $("#modalLoveBtn");
const mCategory = $("#m-category");
const mTitle = $("#m-title");
const mAnswer = $("#m-answer");
const mTags = $("#m-tags");

// Toasts
const toastStack = $("#toastStack");

// PTR DOM
const ptrLoader = $("#ptr-loader");
const ptrIcon = ptrLoader ? ptrLoader.querySelector("i") : null;

// Image Viewer DOM
const ivOverlay = $("#imageViewer");
const ivImage = $("#ivImage");
const ivCloseBtn = $("#ivCloseBtn");
const ivContent = $("#ivContent");

/* =========================
   Helpers
   ========================= */
function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(title, message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="dot" aria-hidden="true"></div>
    <div>
      <p class="t-title">${escapeHtml(title)}</p>
      <p class="t-msg">${escapeHtml(message)}</p>
    </div>
  `;
  toastStack.appendChild(el);

  // auto-remove
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 220);
  }, 3200);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* =========================
   Theme
   ========================= */
function initTheme() {
  const saved = localStorage.getItem(LS_THEME) || "light";
  setTheme(saved, false);
}

function setTheme(theme, persist = true) {
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
  updateMetaColor(theme);
  if (persist) localStorage.setItem(LS_THEME, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(current === "dark" ? "light" : "dark");
}

function updateThemeIcon(theme) {
  const icon = $("#themeToggle i");
  if (!icon) return;
  icon.setAttribute("data-lucide", theme === "dark" ? "sun" : "moon");
  lucide.createIcons();
}

function updateMetaColor(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute("content", theme === "dark" ? "#0b1220" : "#f8fafc");
}

/* =========================
   Views
   ========================= */
function switchView(viewName) {
  const name = ["library", "saved"].includes(viewName) ? viewName : "library";

  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });

  tabs.forEach((btn) => {
    const isActive = btn.dataset.view === name;
    btn.classList.toggle("active", isActive);
    if (isActive) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  // Tools are only relevant in Library
  if (libraryTools) libraryTools.classList.toggle("hidden", name !== "library");
  // Filters are only relevant in Library
  if (openFiltersBtn) openFiltersBtn.classList.toggle("hidden", name !== "library");

  localStorage.setItem(LS_VIEW, name);
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Keep Saved in sync
  if (name === "saved") renderSaved();

  lucide.createIcons();
}

/* =========================
   Filters + derived data
   ========================= */
function getFilterState() {
  return {
    search: (searchInput.value || "").trim().toLowerCase(),
    category: catSelect.value || "all",
    sort: sortSelect.value || "newest",
  };
}

function resetPage() {
  currentPage = 1;
}

function getFilteredItems() {
  const { search, category, sort } = getFilterState();

  // Filter
  let items = allData.filter((item) => {
    const matchCat = category === "all" || item.category === category;
    const hay =
      item.questionLower +
      " " +
      item.tagsLower +
      " " +
      (item.categoryLower || "");
    const matchSearch = !search || hay.includes(search);
    return matchCat && matchSearch;
  });

  // Sort
  if (sort === "random") items = shuffle(items);
  if (sort === "newest") items.sort((a, b) => b.id - a.id);
  if (sort === "oldest") items.sort((a, b) => a.id - b.id);
  if (sort === "az") items.sort((a, b) => a.question.localeCompare(b.question));

  return items;
}

function syncMobileFiltersFromDesktop() {
  if (sortSelectMobile) sortSelectMobile.value = sortSelect.value;
  if (catSelectMobile) catSelectMobile.value = catSelect.value;
}

function resetFilters() {
  searchInput.value = "";
  sortSelect.value = "newest";
  catSelect.value = "all";
  syncMobileFiltersFromDesktop();
  resetPage();
  renderLibrary();
  toast("Reset", "Filters cleared.");
}

/* =========================
   Rendering: Library
   ========================= */
function populateCategories() {
  const categories = [...new Set(allData.map((d) => d.category))].sort((a, b) =>
    a.localeCompare(b)
  );

  const fill = (selectEl) => {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="all">All categories</option>';
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      selectEl.appendChild(opt);
    });
  };

  fill(catSelect);
  fill(catSelectMobile);
}

function createLibraryCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.id = String(item.id);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Open: ${item.question}`);

  const chips = item.tagsArr.slice(0, 3).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");

  const isSaved = favorites.has(item.id);

  card.innerHTML = `
    <div class="card-top">
      <div class="kicker">${escapeHtml(item.category)}</div>

      <button class="save-btn ${isSaved ? "saved" : ""}" type="button" aria-label="${isSaved ? "Remove from saved" : "Save"}">
        <i data-lucide="heart" width="18" height="18"></i>
      </button>
    </div>

    <div class="title">${escapeHtml(item.question)}</div>

    <div class="tags-row">${chips}</div>
  `;

  const saveBtn = card.querySelector(".save-btn");
  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(item.id);
  });

  card.addEventListener("click", () => openModal(item));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(item);
    }
  });

  return card;
}

function buildLibraryCards() {
  grid.innerHTML = "";
  cardElements.clear();

  allData.forEach((item) => {
    const card = createLibraryCard(item);
    cardElements.set(item.id, card);
  });
}

function updateResultMeta({ totalItems, start, end, totalPages }) {
  const { search, category } = getFilterState();

  const bits = [];

  if (totalItems === 0) {
    bits.push("0 items");
  } else if (totalItems <= ITEMS_PER_PAGE) {
    bits.push(`${totalItems} item${totalItems === 1 ? "" : "s"}`);
  } else {
    bits.push(`Showing ${start}–${end} of ${totalItems} items`);
  }

  if (totalPages > 1) bits.push(`• Page ${currentPage} of ${totalPages}`);
  if (category !== "all") bits.push(`• in “${category}”`);
  if (search) bits.push(`• matching “${search}”`);

  resultMeta.textContent = bits.join(" ");
}

function setPage(nextPage) {
  currentPage = clamp(nextPage, 1, lastTotalPages);
  renderLibrary({ keepScroll: false });
}

function renderPagination(totalPages) {
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.classList.add("hidden");
    pagination.innerHTML = "";
    return;
  }

  pagination.classList.remove("hidden");
  pagination.innerHTML = "";

  const groupStart = Math.floor((currentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
  const groupEnd = Math.min(groupStart + PAGE_WINDOW - 1, totalPages);

  const mkBtn = ({ label, page, active = false, disabled = false, ariaLabel = null, kind = "num" }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `page-btn ${kind} ${active ? "active" : ""}`.trim();
    b.textContent = label;
    if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
    if (disabled) {
      b.disabled = true;
      b.setAttribute("aria-disabled", "true");
    } else if (typeof page === "number") {
      b.addEventListener("click", () => setPage(page));
    }
    return b;
  };

  // Prev
  if (currentPage > 1) {
    pagination.appendChild(
      mkBtn({
        label: "<",
        page: currentPage - 1,
        kind: "nav",
        ariaLabel: "Previous page",
      })
    );
  }

  // Page numbers
  for (let p = groupStart; p <= groupEnd; p++) {
    pagination.appendChild(
      mkBtn({
        label: String(p),
        page: p,
        active: p === currentPage,
        ariaLabel: p === currentPage ? `Page ${p}, current page` : `Go to page ${p}`,
      })
    );
  }

  // Next
  pagination.appendChild(
    mkBtn({
      label: ">",
      page: currentPage + 1,
      disabled: currentPage >= totalPages,
      kind: "nav",
      ariaLabel: "Next page",
    })
  );

  if (groupEnd < totalPages) {
    const dots = document.createElement("span");
    dots.className = "page-ellipsis";
    dots.textContent = "…";
    dots.setAttribute("aria-hidden", "true");
    pagination.appendChild(dots);
  }
}

function renderLibrary({ keepScroll = true } = {}) {
  if (!allData.length) return;

  clearSearchBtn.classList.toggle("hidden", !(searchInput.value || "").trim());

  const items = getFilteredItems();
  const totalItems = items.length;

  lastTotalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  currentPage = clamp(currentPage, 1, lastTotalPages);

  const start = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = totalItems === 0 ? 0 : Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
  const pageItems = totalItems ? items.slice(start - 1, end) : [];

  updateResultMeta({ totalItems, start, end, totalPages: lastTotalPages });

  cardElements.forEach((el) => el.classList.add("hidden"));

  if (totalItems === 0) {
    emptyState.classList.remove("hidden");
    renderPagination(0);
    return;
  }

  emptyState.classList.add("hidden");

  pageItems.forEach((item) => {
    const el = cardElements.get(item.id);
    if (!el) return;
    el.classList.remove("hidden");
    grid.appendChild(el);
  });

  renderPagination(lastTotalPages);

  lucide.createIcons();

  if (!keepScroll) {
    try {
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

/* =========================
   Saved
   ========================= */
function createSavedCard(item) {
  return createLibraryCard(item);
}

function renderSaved() {
  if (!allData.length) return;

  favGrid.innerHTML = "";

  const items = allData.filter((d) => favorites.has(d.id));

  savedEmpty.classList.toggle("hidden", items.length !== 0);

  if (!items.length) return;

  items.forEach((item) => {
    favGrid.appendChild(createSavedCard(item));
  });

  lucide.createIcons();
}

/* =========================
   Favorites logic
   ========================= */
function persistFavorites() {
  localStorage.setItem(LS_FAVS, JSON.stringify([...favorites]));
}

function setSavedUIState(id) {
  const libCard = cardElements.get(id);
  if (libCard) {
    const btn = libCard.querySelector(".save-btn");
    const saved = favorites.has(id);
    btn.classList.toggle("saved", saved);
    btn.setAttribute("aria-label", saved ? "Remove from saved" : "Save");
  }

  if (currentModalId === id) {
    modalLoveBtn.classList.toggle("saved", favorites.has(id));
    modalLoveBtn.setAttribute("aria-label", favorites.has(id) ? "Remove from saved" : "Save");
  }
}

function toggleFavorite(id) {
  const wasSaved = favorites.has(id);
  if (wasSaved) favorites.delete(id);
  else favorites.add(id);

  persistFavorites();
  setSavedUIState(id);

  if (views.saved.classList.contains("active")) renderSaved();

  toast(wasSaved ? "Removed" : "Saved", wasSaved ? "Removed from Saved." : "Added to Saved.");
}

/* =========================
   Modal + deep linking
   ========================= */
function checkHashForModal() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#question-")) return;

  const id = parseInt(hash.replace("#question-", ""), 10);
  if (Number.isNaN(id)) return;

  const item = allData.find((d) => d.id === id);
  if (item) openModal(item, { fromHash: true });
}

function openModal(item, { fromHash = false } = {}) {
  currentModalId = item.id;
  lastFocusedElement = document.activeElement;

  if (!fromHash) window.location.hash = `question-${item.id}`;

  mCategory.textContent = item.category;
  mTitle.textContent = item.question;
  mAnswer.innerHTML = formatContent(item.answer, item.snippets, item.question);

  mTags.innerHTML = "";
  item.tagsArr.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn";
    btn.type = "button";
    btn.textContent = t;
    btn.addEventListener("click", () => applyTagFilter(t));
    mTags.appendChild(btn);
  });

  modalLoveBtn.classList.toggle("saved", favorites.has(item.id));
  modalLoveBtn.setAttribute("aria-label", favorites.has(item.id) ? "Remove from saved" : "Save");

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  closeModalBtn.focus();

  lucide.createIcons();
  Prism.highlightAllUnder(modal);
}

function closeModal({ keepHash = false } = {}) {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  currentModalId = null;

  if (!keepHash) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function applyTagFilter(tag) {
  closeModal();
  switchView("library");
  searchInput.value = tag;
  resetPage();
  renderLibrary();
  toast("Filter", `Searching for “${tag}”.`);
}

/* =========================
   Content formatting
   ========================= */
function parseCodeSnippet(snippet) {
  const raw = snippet.replace(/^code:/i, "");
  const pipeIndex = raw.indexOf("|");
  if (pipeIndex > 0) {
    const lang = raw.slice(0, pipeIndex).trim().toLowerCase();
    const code = raw.slice(pipeIndex + 1);
    return { lang: lang || "swift", code };
  }
  return { lang: "swift", code: raw };
}

function formatContent(text, snippets, titleForAlt = "image") {
  if (!text) return "";

  const blocks = [];

  let raw = String(text).replace(/\[(image|code|img)[_\s]?(\d+)\]/gi, (_m, _type, num) => {
    const idx = parseInt(num, 10) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= snippets.length) return "";

    const snippet = String(snippets[idx] || "").trim();
    if (!snippet) return "";

    let html = "";
    if (snippet.toLowerCase().startsWith("code:")) {
      const { lang, code } = parseCodeSnippet(snippet);
      const safeCode = escapeHtml(code);
      html = `
        <div class="code-wrap">
          <button class="copy-btn" type="button" data-copy="${encodeURIComponent(code)}">Copy</button>
          <pre><code class="language-${escapeHtml(lang)}">${safeCode}</code></pre>
        </div>
      `;
    } else if (snippet.toLowerCase().startsWith("image:")) {
      const url = snippet.replace(/^image:/i, "").trim();
      // Add data-iv attribute to identify images for viewer
      html = `<img class="rendered-img" src="${escapeHtml(url)}" alt="Illustration for ${escapeHtml(titleForAlt)}" loading="lazy" data-iv-src="${escapeHtml(url)}">`;
    } else {
      html = `<div class="snippet-box">${escapeHtml(snippet)}</div>`;
    }

    const token = `@@BLOCK_${blocks.length}@@`;
    blocks.push(html);
    return `\n\n${token}\n\n`;
  });

  raw = escapeHtml(raw);
  raw = raw.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const parts = raw.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);

  const htmlOut = parts.map((p) => {
    const m = p.match(/^@@BLOCK_(\d+)@@$/);
    if (m) {
      const idx = parseInt(m[1], 10);
      return blocks[idx] || "";
    }
    const withBreaks = p.replace(/\n/g, "<br>");
    return `<p>${withBreaks}</p>`;
  }).join("");

  return htmlOut;
}

/* Code copy */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const text = decodeURIComponent(btn.getAttribute("data-copy") || "");
  const ok = await copyToClipboard(text);
  toast(ok ? "Copied" : "Copy failed", ok ? "Code copied." : "Clipboard blocked.");
});

/* =========================
   Image Viewer (Lightbox)
   ========================= */
function openImageViewer(src) {
  if (!ivOverlay || !ivImage) return;

  ivImage.src = src;
  ivOverlay.classList.add("active");
  ivOverlay.setAttribute("aria-hidden", "false");

  // Reset transform
  resetImageTransform();
}

function closeImageViewer() {
  ivOverlay.classList.remove("active");
  ivOverlay.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    ivImage.src = "";
    resetImageTransform();
  }, 300);
}

function resetImageTransform() {
  ivState = {
    scale: 1,
    panning: false,
    pointX: 0,
    pointY: 0,
    startX: 0,
    startY: 0,
    startScale: 1,
    startDist: 0,
  };
  updateImageTransform();
}

function updateImageTransform() {
  if (!ivImage) return;
  ivImage.style.transform = `translate(${ivState.pointX}px, ${ivState.pointY}px) scale(${ivState.scale})`;
}

// Distance between two touch points
function getDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

// Touch event delegation for images in answer area
document.addEventListener("click", (e) => {
  if (e.target.matches("img.rendered-img")) {
    const src = e.target.dataset.ivSrc || e.target.src;
    openImageViewer(src);
  }
});

// IV Event Listeners
if (ivOverlay) {
  ivCloseBtn.addEventListener("click", closeImageViewer);
  ivOverlay.addEventListener("click", (e) => {
    // Close if clicked outside the image
    if (e.target === ivContent) closeImageViewer();
  });

  // Zoom / Pan Logic
  ivContent.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      // Start Pan
      ivState.panning = true;
      ivState.startX = e.touches[0].clientX - ivState.pointX;
      ivState.startY = e.touches[0].clientY - ivState.pointY;
    } else if (e.touches.length === 2) {
      // Start Pinch
      ivState.panning = false;
      ivState.startDist = getDistance(e.touches);
      ivState.startScale = ivState.scale;
    }
  }, { passive: false });

  ivContent.addEventListener("touchmove", (e) => {
    e.preventDefault(); // Prevent page scroll when interacting with image

    if (e.touches.length === 1 && ivState.panning) {
      // Pan
      // Only allow pan if zoomed in OR if we want to allow dragging freely
      // Usually dragging when scale=1 feels loose, but let's allow moderate movement or stick to zoom
      if (ivState.scale > 1) {
        ivState.pointX = e.touches[0].clientX - ivState.startX;
        ivState.pointY = e.touches[0].clientY - ivState.startY;
        updateImageTransform();
      }
    } else if (e.touches.length === 2) {
      // Pinch
      const dist = getDistance(e.touches);
      if (dist > 0) {
        const diff = dist / ivState.startDist;
        ivState.scale = Math.max(1, Math.min(ivState.startScale * diff, 5)); // Limit zoom 1x to 5x
        updateImageTransform();
      }
    }
  }, { passive: false });

  ivContent.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      // If fingers lifted, check boundaries logic could go here
      // For now, if scale < 1 reset to 1
      if (ivState.scale < 1) {
        ivState.scale = 1;
        ivState.pointX = 0;
        ivState.pointY = 0;
        updateImageTransform();
      }
    }
  });

  // Handle window rotation (orientation change)
  window.addEventListener("resize", () => {
    if (ivOverlay.classList.contains("active")) {
      // Reset position to center on rotate to avoid getting lost off-screen
      resetImageTransform();
    }
  });
}

/* =========================
   Data fetching
   ========================= */
async function fetchData() {
  initTheme();

  try {
    const res = await fetch(API_URL);
    const json = await res.json();

    if (skeleton) skeleton.remove();

    if (!json.values || !Array.isArray(json.values)) {
      emptyState.classList.remove("hidden");
      resultMeta.textContent = "0 items";
      resetPTR();
      return;
    }

    const rows = json.values.filter((row) => row[0] && String(row[0]).trim() !== "");

    allData = rows.map((row, i) => {
      const question = String(row[0] || "Untitled").trim();
      const answer = String(row[1] || "");
      const category = String(row[2] || "Uncategorized").trim() || "Uncategorized";
      const tags = String(row[3] || "");
      const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);

      const snippets = [];
      for (let c = 6; c <= 11; c++) {
        if (row[c]) snippets.push(String(row[c]));
      }

      return {
        id: i,
        question,
        answer,
        category,
        tags,
        tagsArr,
        snippets,
        questionLower: question.toLowerCase(),
        tagsLower: tags.toLowerCase(),
        categoryLower: category.toLowerCase(),
      };
    });

    populateCategories();
    buildLibraryCards();
    syncMobileFiltersFromDesktop();

    const savedView = localStorage.getItem(LS_VIEW) || "library";
    switchView(savedView);

    renderLibrary();
    renderSaved();
    checkHashForModal();

    if (isRefreshing) toast("Refreshed", "Content updated.");

  } catch (err) {
    console.error(err);
    if (skeleton) skeleton.remove();
    emptyState.classList.remove("hidden");
    resultMeta.textContent = "Error loading data";
    toast("Error", "Could not load Google Sheets data.");
  } finally {
    resetPTR();
  }
}

/* =========================
   Pull to Refresh Logic
   ========================= */
function initPullToRefresh() {
  if (!ptrLoader) return;
  const app = document.getElementById("app") || document.body;

  app.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0) {
      ptrStartY = e.touches[0].clientY;
      ptrDist = 0;
    }
  }, { passive: true });

  app.addEventListener("touchmove", (e) => {
    if (window.scrollY > 0 || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - ptrStartY;
    if (diff > 0) {
      ptrDist = Math.pow(diff, 0.8);
      ptrLoader.style.opacity = Math.min(1, ptrDist / PTR_THRESHOLD);
      ptrLoader.style.transform = `translateY(${Math.min(ptrDist / 2, 40)}px) scale(${Math.min(1, ptrDist / PTR_THRESHOLD)})`;
      if (ptrIcon) ptrIcon.style.transform = `rotate(${ptrDist * 3}deg)`;
    }
  }, { passive: true });

  app.addEventListener("touchend", () => {
    if (window.scrollY > 0 || isRefreshing) return;
    if (ptrDist > PTR_THRESHOLD) {
      isRefreshing = true;
      ptrLoader.classList.add("visible");
      ptrLoader.style.transform = "translateY(0) scale(1)";
      fetchData();
    } else {
      resetPTR();
    }
  });
}

function resetPTR() {
  isRefreshing = false;
  ptrDist = 0;
  if (ptrLoader) {
    ptrLoader.style.opacity = "0";
    ptrLoader.style.transform = "translateY(-20px) scale(0.9)";
    ptrLoader.classList.remove("visible");
    if (ptrIcon) ptrIcon.style.transform = "rotate(0deg)";
  }
}

/* =========================
   Drawer controls
   ========================= */
function openDrawer() {
  filterDrawer.classList.add("active");
  filterDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  syncMobileFiltersFromDesktop();
  if (sortSelectMobile) sortSelectMobile.focus();
}

function closeDrawer() {
  filterDrawer.classList.remove("active");
  filterDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* =========================
   Events
   ========================= */
tabs.forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));

themeToggle.addEventListener("click", toggleTheme);
brandBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

searchInput.addEventListener("input", debounce(() => { resetPage(); renderLibrary(); }, 180));
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  resetPage();
  renderLibrary();
});
resetFiltersBtn.addEventListener("click", resetFilters);

sortSelect.addEventListener("change", () => { syncMobileFiltersFromDesktop(); resetPage(); renderLibrary(); });
catSelect.addEventListener("change", () => { syncMobileFiltersFromDesktop(); resetPage(); renderLibrary(); });

document.addEventListener("keydown", (e) => {
  const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
  if (!isTyping && e.key === "/") {
    if (views.library.classList.contains("active")) {
      e.preventDefault();
      searchInput.focus();
    }
  }
  if (e.key === "Escape") {
    if (ivOverlay && ivOverlay.classList.contains("active")) {
      closeImageViewer();
      return;
    }
    if (modal.classList.contains("active")) {
      closeModal();
      return;
    }
    if (filterDrawer.classList.contains("active")) {
      closeDrawer();
      return;
    }
  }
});

openFiltersBtn.addEventListener("click", () => openDrawer());
filterDrawer.addEventListener("click", (e) => {
  if (e.target && e.target.dataset.closeDrawer === "true") closeDrawer();
});

if (sortSelectMobile) sortSelectMobile.addEventListener("change", () => {
  sortSelect.value = sortSelectMobile.value;
  resetPage();
  renderLibrary();
});
if (catSelectMobile) catSelectMobile.addEventListener("change", () => {
  catSelect.value = catSelectMobile.value;
  resetPage();
  renderLibrary();
});

applyFiltersBtn.addEventListener("click", () => closeDrawer());
resetFiltersBtnMobile.addEventListener("click", () => { resetFilters(); closeDrawer(); });

modal.addEventListener("click", (e) => {
  if (e.target && e.target.dataset.closeModal === "true") closeModal();
});
closeModalBtn.addEventListener("click", () => closeModal());

modalShareBtn.addEventListener("click", async () => {
  const url = window.location.href;
  const title = mTitle.textContent || "KnowledgeOcean";
  if (navigator.share) {
    try { await navigator.share({ title, url }); toast("Shared", "Sent via share sheet."); return; } catch {}
  }
  const ok = await copyToClipboard(url);
  toast(ok ? "Link copied" : "Copy failed", ok ? "Link copied." : "Clipboard blocked.");
});

modalLoveBtn.addEventListener("click", () => {
  if (currentModalId === null) return;
  toggleFavorite(currentModalId);
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash || "";
  if (!hash) {
    if (modal.classList.contains("active")) closeModal({ keepHash: true });
    return;
  }
  if (hash.startsWith("#question-")) {
    const id = parseInt(hash.replace("#question-", ""), 10);
    if (!Number.isNaN(id)) {
      const item = allData.find((d) => d.id === id);
      if (item) openModal(item, { fromHash: true });
    }
  }
});

goLibraryBtn.addEventListener("click", () => switchView("library"));

/* =========================
   Start
   ========================= */
initPullToRefresh();
fetchData();
