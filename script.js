/* =========================================================
   KnowledgeOcean — Polished UI (calm, white-based, responsive, study mode)
   ---------------------------------------------------------
   Google Sheets columns expected (same as your current app):
   A: Question
   B: Answer
   C: Category
   D: Tags (comma-separated)
   G-L: Snippets (optional) like:
        code:print("hi")
        code:js|console.log("hi")
        image:https://...
   Placeholders in Answer:
        [code_1], [image_2], [img 3] ...
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

// Study
let studyDeckType = "saved"; // saved | filtered | all
let studyDeck = [];
let studyIndex = 0;
let studyRevealed = false;

// Pagination (Library)
const ITEMS_PER_PAGE = 20;
const PAGE_WINDOW = 5; // show 5 page numbers
let currentPage = 1;
let lastTotalPages = 1;

/* =========================
   DOM
   ========================= */
const $ = (sel, root = document) => root.querySelector(sel);

const grid = $("#cardGrid");
const favGrid = $("#favGrid");
const skeleton = $("#skeleton");

const emptyState = $("#emptyState");
const savedEmpty = $("#savedEmpty");
const studyEmpty = $("#studyEmpty");

const resultMeta = $("#resultMeta");

const pagination = $("#pagination");

const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  library: $("#view-library"),
  saved: $("#view-saved"),
  study: $("#view-study"),
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

const studyFilteredBtn = $("#studyFilteredBtn");
const studySavedBtn = $("#studySavedBtn");

const goLibraryBtn = $("#goLibraryBtn");
const studyGoLibraryBtn = $("#studyGoLibraryBtn");

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

// Study DOM
const segButtons = Array.from(document.querySelectorAll(".seg"));
const studyShuffleBtn = $("#studyShuffleBtn");
const studyRestartBtn = $("#studyRestartBtn");
const studyBadge = $("#studyBadge");
const studyProgress = $("#studyProgress");

const studyCard = $("#studyCard");
const studyCategory = $("#studyCategory");
const studyQuestion = $("#studyQuestion");
const studyTags = $("#studyTags");
const studyRevealBtn = $("#studyRevealBtn");
const studyOpenDetailBtn = $("#studyOpenDetailBtn");
const studyAnswerWrap = $("#studyAnswerWrap");
const studyAnswer = $("#studyAnswer");
const studyPrevBtn = $("#studyPrevBtn");
const studyNextBtn = $("#studyNextBtn");

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
  const name = ["library", "saved", "study"].includes(viewName) ? viewName : "library";

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
  libraryTools.classList.toggle("hidden", name !== "library");
  // Filters are only relevant in Library (mobile drawer button lives in header)
  openFiltersBtn.classList.toggle("hidden", name !== "library");

  localStorage.setItem(LS_VIEW, name);
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Keep Saved / Study in sync
  if (name === "saved") renderSaved();
  if (name === "study") ensureStudyDeck();

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
  sortSelectMobile.value = sortSelect.value;
  catSelectMobile.value = catSelect.value;
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

  // Prev (hidden on first page to match “1 2 3 4 5 > …” style)
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

  // Page numbers (5 at a time)
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

  // Ellipsis indicator when there are more pages beyond the current window
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

  // Clear button visibility
  clearSearchBtn.classList.toggle("hidden", !(searchInput.value || "").trim());

  const items = getFilteredItems();
  const totalItems = items.length;

  lastTotalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  currentPage = clamp(currentPage, 1, lastTotalPages);

  const start = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = totalItems === 0 ? 0 : Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
  const pageItems = totalItems ? items.slice(start - 1, end) : [];

  updateResultMeta({ totalItems, start, end, totalPages: lastTotalPages });

  // Hide all, then append current page (cheap and stable)
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
    // Smoothly keep the grid in view when paging.
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
  const card = createLibraryCard(item);
  // In saved grid, card elements are new nodes; saving/un-saving re-renders anyway.
  return card;
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

  // Modal
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

  // Re-render saved view if needed
  if (views.saved.classList.contains("active")) renderSaved();

  // If studying saved deck, keep it coherent
  if (views.study.classList.contains("active") && studyDeckType === "saved") {
    startStudy("saved", { keepClosestToId: id });
  }

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

  // Update hash (unless already from hash)
  if (!fromHash) window.location.hash = `question-${item.id}`;

  mCategory.textContent = item.category;
  mTitle.textContent = item.question;
  mAnswer.innerHTML = formatContent(item.answer, item.snippets, item.question);

  // Tags (clickable)
  mTags.innerHTML = "";
  item.tagsArr.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn";
    btn.type = "button";
    btn.textContent = t;
    btn.addEventListener("click", () => applyTagFilter(t));
    mTags.appendChild(btn);
  });

  // Save state
  modalLoveBtn.classList.toggle("saved", favorites.has(item.id));
  modalLoveBtn.setAttribute("aria-label", favorites.has(item.id) ? "Remove from saved" : "Save");

  // Show
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // Focus
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
    // Remove hash without forcing a scroll jump
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function applyTagFilter(tag) {
  // Switch to library, search for the tag
  closeModal();
  switchView("library");
  searchInput.value = tag;
  resetPage();
  renderLibrary();
  toast("Filter", `Searching for “${tag}”.`);
}

/* =========================
   Content formatting (safe)
   ========================= */
function parseCodeSnippet(snippet) {
  // Supported:
  // code:<code>
  // code:js|<code>
  // code:python|<code>
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

  // Replace placeholders with block tokens that become their own paragraph
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
      html = `<img class="rendered-img" src="${escapeHtml(url)}" alt="Illustration for ${escapeHtml(titleForAlt)}">`;
    } else {
      html = `<div class="snippet-box">${escapeHtml(snippet)}</div>`;
    }

    const token = `@@BLOCK_${blocks.length}@@`;
    blocks.push(html);
    return `\n\n${token}\n\n`;
  });

  // Escape remaining text to prevent injection
  raw = escapeHtml(raw);

  // Bold: **text**
  raw = raw.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Split into paragraphs by blank lines
  const parts = raw.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);

  const htmlOut = parts.map((p) => {
    const m = p.match(/^@@BLOCK_(\d+)@@$/);
    if (m) {
      const idx = parseInt(m[1], 10);
      return blocks[idx] || "";
    }
    // Convert single newlines to <br>
    const withBreaks = p.replace(/\n/g, "<br>");
    return `<p>${withBreaks}</p>`;
  }).join("");

  return htmlOut;
}

/* Code copy handling via event delegation */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;

  const text = decodeURIComponent(btn.getAttribute("data-copy") || "");
  const ok = await copyToClipboard(text);

  toast(ok ? "Copied" : "Copy failed", ok ? "Code copied to clipboard." : "Your browser blocked clipboard access.");
});

/* =========================
   Study
   ========================= */
function setStudyDeckUI(type) {
  segButtons.forEach((b) => {
    const active = b.dataset.deck === type;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function buildStudyDeck(type) {
  if (type === "saved") return allData.filter((d) => favorites.has(d.id));
  if (type === "filtered") return getFilteredItems();
  return [...allData]; // all
}

function ensureStudyDeck() {
  // If current deck is empty, choose a sensible fallback.
  const savedCount = [...favorites].length;
  const filteredCount = getFilteredItems().length;

  if (studyDeckType === "saved" && savedCount === 0) {
    studyDeckType = filteredCount ? "filtered" : "all";
  }

  startStudy(studyDeckType);
}

function startStudy(type, { keepClosestToId = null } = {}) {
  studyDeckType = type;
  setStudyDeckUI(type);

  let deck = buildStudyDeck(type);

  // If empty, show empty state
  if (!deck.length) {
    studyDeck = [];
    studyIndex = 0;
    studyRevealed = false;
    renderStudy();
    return;
  }

  // If we want to keep close to a recently toggled id, try to keep current index stable
  if (keepClosestToId !== null) {
    const existing = deck.findIndex((d) => d.id === keepClosestToId);
    if (existing >= 0) studyIndex = clamp(existing, 0, deck.length - 1);
    else studyIndex = clamp(studyIndex, 0, deck.length - 1);
  } else {
    studyIndex = clamp(studyIndex, 0, deck.length - 1);
  }

  studyDeck = deck;
  studyRevealed = false;
  renderStudy();
}

function renderStudy() {
  const hasCards = studyDeck.length > 0;

  studyEmpty.classList.toggle("hidden", hasCards);
  studyCard.classList.toggle("hidden", !hasCards);
  studyPrevBtn.parentElement.classList.toggle("hidden", !hasCards);

  if (!hasCards) {
    studyBadge.textContent = "—";
    studyProgress.textContent = "0 / 0";
    studyCategory.textContent = "—";
    studyQuestion.textContent = "Choose a deck to start.";
    studyTags.innerHTML = "";
    studyAnswerWrap.classList.add("hidden");
    return;
  }

  const item = studyDeck[studyIndex];
  studyBadge.textContent = studyDeckType.toUpperCase();
  studyProgress.textContent = `${studyIndex + 1} / ${studyDeck.length}`;

  studyCategory.textContent = item.category;
  studyQuestion.textContent = item.question;

  studyTags.innerHTML = item.tagsArr.slice(0, 6).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");

  studyAnswer.innerHTML = formatContent(item.answer, item.snippets, item.question);

  if (studyRevealed) {
    studyAnswerWrap.classList.remove("hidden");
    studyRevealBtn.innerHTML = '<i data-lucide="eye-off" width="16" height="16"></i> Hide answer';
    Prism.highlightAllUnder(studyAnswerWrap);
  } else {
    studyAnswerWrap.classList.add("hidden");
    studyRevealBtn.innerHTML = '<i data-lucide="eye" width="16" height="16"></i> Reveal answer';
  }

  lucide.createIcons();
}

function revealStudy() {
  if (!studyDeck.length) return;
  studyRevealed = !studyRevealed;
  renderStudy();
}

function nextStudy(dir = 1) {
  if (!studyDeck.length) return;
  studyIndex = (studyIndex + dir + studyDeck.length) % studyDeck.length;
  studyRevealed = false;
  renderStudy();
  studyCard.focus();
}

function shuffleStudy() {
  if (!studyDeck.length) return;
  const currentId = studyDeck[studyIndex]?.id ?? null;
  studyDeck = shuffle(studyDeck);
  studyIndex = currentId ? Math.max(0, studyDeck.findIndex((d) => d.id === currentId)) : 0;
  studyRevealed = false;
  renderStudy();
  toast("Shuffled", "Deck order randomized.");
}

function openStudyDetail() {
  if (!studyDeck.length) return;
  openModal(studyDeck[studyIndex]);
}

/* =========================
   Data fetching
   ========================= */
async function fetchData() {
  initTheme();

  try {
    const res = await fetch(API_URL);
    const json = await res.json();

    // Remove skeleton
    if (skeleton) skeleton.remove();

    if (!json.values || !Array.isArray(json.values)) {
      emptyState.classList.remove("hidden");
      resultMeta.textContent = "0 items";
      return;
    }

    const rows = json.values.filter((row) => row[0] && String(row[0]).trim() !== "");

    allData = rows.map((row, i) => {
      const question = String(row[0] || "Untitled").trim();
      const answer = String(row[1] || "");
      const category = String(row[2] || "Uncategorized").trim() || "Uncategorized";
      const tags = String(row[3] || "");
      const tagsArr = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

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

    // Initial view
    const savedView = localStorage.getItem(LS_VIEW) || "library";
    switchView(savedView);

    // Initial render(s)
    renderLibrary();
    renderSaved();

    // Deep link
    checkHashForModal();

  } catch (err) {
    console.error(err);
    if (skeleton) skeleton.remove();
    emptyState.classList.remove("hidden");
    resultMeta.textContent = "Error loading data";
    toast("Error", "Could not load Google Sheets data. Check API key / Sheet ID.");
  }
}

/* =========================
   Drawer controls
   ========================= */
function openDrawer() {
  filterDrawer.classList.add("active");
  filterDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // Ensure current values
  syncMobileFiltersFromDesktop();
  sortSelectMobile.focus();
}

function closeDrawer() {
  filterDrawer.classList.remove("active");
  filterDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* =========================
   Events
   ========================= */
// Tabs
tabs.forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// Theme
themeToggle.addEventListener("click", toggleTheme);

// Brand scroll
brandBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// Search
searchInput.addEventListener(
  "input",
  debounce(() => {
    resetPage();
    renderLibrary();
  }, 180)
);
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  resetPage();
  renderLibrary();
});
resetFiltersBtn.addEventListener("click", resetFilters);

// Desktop filters
sortSelect.addEventListener("change", () => {
  syncMobileFiltersFromDesktop();
  resetPage();
  renderLibrary();
});
catSelect.addEventListener("change", () => {
  syncMobileFiltersFromDesktop();
  resetPage();
  renderLibrary();
});

// Keyboard shortcut: "/" to focus search (Library only)
document.addEventListener("keydown", (e) => {
  const isTyping =
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    e.target instanceof HTMLSelectElement;

  if (!isTyping && e.key === "/") {
    if (views.library.classList.contains("active")) {
      e.preventDefault();
      searchInput.focus();
    }
  }

  // ESC handling
  if (e.key === "Escape") {
    if (modal.classList.contains("active")) {
      closeModal();
      return;
    }
    if (filterDrawer.classList.contains("active")) {
      closeDrawer();
      return;
    }
    // Study: hide answer first
    if (views.study.classList.contains("active") && studyRevealed) {
      studyRevealed = false;
      renderStudy();
      return;
    }
  }

  // Study shortcuts
  if (views.study.classList.contains("active") && studyDeck.length) {
    if (e.key === "ArrowRight") nextStudy(1);
    if (e.key === "ArrowLeft") nextStudy(-1);
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!studyRevealed) {
        studyRevealed = true;
        renderStudy();
      } else {
        nextStudy(1);
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      studyRevealed = true;
      renderStudy();
    }
  }
});

// Mobile filter drawer
openFiltersBtn.addEventListener("click", () => openDrawer());

filterDrawer.addEventListener("click", (e) => {
  const shouldClose = e.target && (e.target.dataset.closeDrawer === "true");
  if (shouldClose) closeDrawer();
});

// Mobile selects: live sync
sortSelectMobile.addEventListener("change", () => {
  sortSelect.value = sortSelectMobile.value;
  resetPage();
  renderLibrary();
});
catSelectMobile.addEventListener("change", () => {
  catSelect.value = catSelectMobile.value;
  resetPage();
  renderLibrary();
});
applyFiltersBtn.addEventListener("click", () => closeDrawer());
resetFiltersBtnMobile.addEventListener("click", () => {
  resetFilters();
  closeDrawer();
});

// Modal close
modal.addEventListener("click", (e) => {
  const shouldClose = e.target && (e.target.dataset.closeModal === "true");
  if (shouldClose) closeModal();
});
closeModalBtn.addEventListener("click", () => closeModal());

// Share
modalShareBtn.addEventListener("click", async () => {
  const url = window.location.href;
  const title = mTitle.textContent || "KnowledgeOcean";

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      toast("Shared", "Sent via share sheet.");
      return;
    } catch {
      // fall through to copy
    }
  }

  const ok = await copyToClipboard(url);
  toast(ok ? "Link copied" : "Copy failed", ok ? "Share link copied to clipboard." : "Clipboard access blocked.");
});

// Save from modal
modalLoveBtn.addEventListener("click", () => {
  if (currentModalId === null) return;
  toggleFavorite(currentModalId);
});

// Deep link updates
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

// Study buttons
studyFilteredBtn.addEventListener("click", () => {
  switchView("study");
  startStudy("filtered");
  toast("Study", "Studying current filtered results.");
});

studySavedBtn.addEventListener("click", () => {
  switchView("study");
  startStudy("saved");
  toast("Study", "Studying saved cards.");
});

segButtons.forEach((btn) => {
  btn.addEventListener("click", () => startStudy(btn.dataset.deck));
});

studyRevealBtn.addEventListener("click", revealStudy);
studyNextBtn.addEventListener("click", () => nextStudy(1));
studyPrevBtn.addEventListener("click", () => nextStudy(-1));
studyShuffleBtn.addEventListener("click", shuffleStudy);
studyRestartBtn.addEventListener("click", () => {
  studyIndex = 0;
  studyRevealed = false;
  renderStudy();
  toast("Restarted", "Back to the first card.");
});
studyOpenDetailBtn.addEventListener("click", openStudyDetail);

// Saved empty buttons
goLibraryBtn.addEventListener("click", () => switchView("library"));
studyGoLibraryBtn.addEventListener("click", () => switchView("library"));

/* =========================
   Start
   ========================= */
fetchData();
