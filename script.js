// KnowledgeOcean - Modern JavaScript Implementation
// ===================================================

// Configuration
const CONFIG = {
  API_KEY: "AIzaSyD1mbSNTOVDpWe1voq9UeG0l-KzieTOB9Q",
  SHEET_ID: "1U0aZe4LUU5qL3seGHRr2Wakb6-NIz_KLlWPSYz4P_3I",
  TAB_NAME: "Sheet1",
  RANGE: "Sheet1!A2:L",
  ITEMS_PER_PAGE: 20,
  PAGE_WINDOW: 5
};

CONFIG.API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.RANGE}?key=${CONFIG.API_KEY}`;

// Storage Keys
const STORAGE = {
  THEME: 'kb_theme',
  BOOKMARKS: 'kb_bookmarks',
  VIEW: 'kb_current_view'
};

// State Management
const state = {
  allData: [],
  bookmarks: new Set(JSON.parse(localStorage.getItem(STORAGE.BOOKMARKS) || '[]')),
  currentView: 'library',
  currentPage: 1,
  totalPages: 1,
  filters: {
    search: '',
    category: 'all',
    sort: 'newest'
  },
  study: {
    deck: [],
    deckType: 'saved',
    currentIndex: 0,
    revealed: false
  },
  currentModalId: null
};

// DOM Elements
const DOM = {
  // Navigation
  nav: document.getElementById('mainNav'),
  brandBtn: document.getElementById('brandBtn'),
  themeToggle: document.getElementById('themeToggle'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  
  // Views
  views: {
    library: document.getElementById('view-library'),
    saved: document.getElementById('view-saved'),
    study: document.getElementById('view-study')
  },
  
  // Library
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortFilter: document.getElementById('sortFilter'),
  mobileFilterBtn: document.getElementById('mobileFilterBtn'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  resetFromEmpty: document.getElementById('resetFromEmpty'),
  studyFilteredBtn: document.getElementById('studyFilteredBtn'),
  cardsGrid: document.getElementById('cardsGrid'),
  pagination: document.getElementById('pagination'),
  resultsMeta: document.getElementById('resultsMeta'),
  emptyState: document.getElementById('emptyState'),
  
  // Saved
  savedGrid: document.getElementById('savedGrid'),
  savedEmpty: document.getElementById('savedEmpty'),
  studySavedBtn: document.getElementById('studySavedBtn'),
  goToLibraryBtn: document.getElementById('goToLibraryBtn'),
  
  // Study
  deckBtns: document.querySelectorAll('.deck-btn'),
  shuffleDeckBtn: document.getElementById('shuffleDeckBtn'),
  restartDeckBtn: document.getElementById('restartDeckBtn'),
  studyProgress: document.getElementById('studyProgress'),
  flashcard: document.getElementById('flashcard'),
  cardCategory: document.getElementById('cardCategory'),
  cardQuestion: document.getElementById('cardQuestion'),
  cardTags: document.getElementById('cardTags'),
  cardBack: document.getElementById('cardBack'),
  cardAnswer: document.getElementById('cardAnswer'),
  revealBtn: document.getElementById('revealBtn'),
  detailsBtn: document.getElementById('detailsBtn'),
  prevCardBtn: document.getElementById('prevCardBtn'),
  nextCardBtn: document.getElementById('nextCardBtn'),
  studyEmpty: document.getElementById('studyEmpty'),
  studyGoLibraryBtn: document.getElementById('studyGoLibraryBtn'),
  
  // Modal
  modal: document.getElementById('detailModal'),
  modalCategory: document.getElementById('modalCategory'),
  modalTitle: document.getElementById('modalTitle'),
  modalAnswer: document.getElementById('modalAnswer'),
  modalTags: document.getElementById('modalTags'),
  modalShareBtn: document.getElementById('modalShareBtn'),
  modalBookmarkBtn: document.getElementById('modalBookmarkBtn'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  
  // Drawer
  drawer: document.getElementById('filterDrawer'),
  categoryFilterMobile: document.getElementById('categoryFilterMobile'),
  sortFilterMobile: document.getElementById('sortFilterMobile'),
  applyFiltersBtn: document.getElementById('applyFiltersBtn'),
  resetFiltersMobileBtn: document.getElementById('resetFiltersMobileBtn'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// Utility Functions
// ===================================================

const utils = {
  debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      } catch {
        return false;
      }
    }
  }
};

// Toast Notifications
// ===================================================

function showToast(title, message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="check" width="16" height="16"></i>
    </div>
    <div class="toast-content">
      <h4>${utils.escapeHtml(title)}</h4>
      <p>${utils.escapeHtml(message)}</p>
    </div>
  `;
  
  DOM.toastContainer.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Theme Management
// ===================================================

function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE.THEME) || 'light';
  setTheme(savedTheme, false);
}

function setTheme(theme, save = true) {
  document.documentElement.setAttribute('data-theme', theme);
  
  const iconName = theme === 'dark' ? 'sun' : 'moon';
  DOM.themeToggle.innerHTML = `<i data-lucide="${iconName}" width="20" height="20"></i>`;
  lucide.createIcons();
  
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.content = theme === 'dark' ? '#0f172a' : '#ffffff';
  }
  
  if (save) {
    localStorage.setItem(STORAGE.THEME, theme);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// View Management
// ===================================================

function switchView(viewName) {
  state.currentView = viewName;
  localStorage.setItem(STORAGE.VIEW, viewName);
  
  // Update views
  Object.entries(DOM.views).forEach(([key, view]) => {
    view.classList.toggle('active', key === viewName);
  });
  
  // Update tabs
  DOM.tabBtns.forEach(btn => {
    const isActive = btn.dataset.view === viewName;
    btn.classList.toggle('active', isActive);
  });
  
  // Update content
  if (viewName === 'saved') {
    renderSaved();
  } else if (viewName === 'study') {
    ensureStudyDeck();
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// Data Processing
// ===================================================

function processRowData(row, index) {
  const question = (row[0] || 'Untitled').trim();
  const answer = row[1] || '';
  const category = (row[2] || 'Uncategorized').trim();
  const tags = row[3] || '';
  const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
  
  const snippets = [];
  for (let i = 6; i <= 11; i++) {
    if (row[i]) snippets.push(row[i]);
  }
  
  return {
    id: index,
    question,
    answer,
    category,
    tags,
    tagsArray,
    snippets,
    searchText: `${question} ${tags} ${category}`.toLowerCase()
  };
}

function getFilteredData() {
  let filtered = state.allData.filter(item => {
    const categoryMatch = state.filters.category === 'all' || 
                         item.category === state.filters.category;
    const searchMatch = !state.filters.search || 
                       item.searchText.includes(state.filters.search.toLowerCase());
    return categoryMatch && searchMatch;
  });
  
  // Sort
  switch (state.filters.sort) {
    case 'oldest':
      filtered.sort((a, b) => a.id - b.id);
      break;
    case 'az':
      filtered.sort((a, b) => a.question.localeCompare(b.question));
      break;
    case 'random':
      filtered = utils.shuffle(filtered);
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => b.id - a.id);
  }
  
  return filtered;
}

// Content Formatting
// ===================================================

function parseCodeSnippet(snippet) {
  const content = snippet.replace(/^code:/i, '');
  const pipeIndex = content.indexOf('|');
  
  if (pipeIndex > 0) {
    return {
      lang: content.slice(0, pipeIndex).trim().toLowerCase() || 'javascript',
      code: content.slice(pipeIndex + 1)
    };
  }
  
  return {
    lang: 'javascript',
    code: content
  };
}

function formatContent(text, snippets, title = 'content') {
  if (!text) return '';
  
  const blocks = [];
  
  // Replace snippet placeholders
  let processed = text.replace(/\[(image|code|img)[_\s]?(\d+)\]/gi, (match, type, num) => {
    const index = parseInt(num) - 1;
    if (index < 0 || index >= snippets.length) return '';
    
    const snippet = snippets[index].trim();
    if (!snippet) return '';
    
    let html = '';
    
    if (snippet.toLowerCase().startsWith('code:')) {
      const { lang, code } = parseCodeSnippet(snippet);
      html = `
        <div class="code-wrapper">
          <pre><code class="language-${utils.escapeHtml(lang)}">${utils.escapeHtml(code)}</code></pre>
        </div>
      `;
    } else if (snippet.toLowerCase().startsWith('image:')) {
      const url = snippet.replace(/^image:/i, '').trim();
      html = `<img src="${utils.escapeHtml(url)}" alt="${utils.escapeHtml(title)}" loading="lazy">`;
    } else {
      html = `<div class="snippet-box">${utils.escapeHtml(snippet)}</div>`;
    }
    
    const token = `@@BLOCK_${blocks.length}@@`;
    blocks.push(html);
    return `\n\n${token}\n\n`;
  });
  
  // Escape HTML
  processed = utils.escapeHtml(processed);
  
  // Process bold
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Split into paragraphs
  const paragraphs = processed.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  return paragraphs.map(p => {
    const blockMatch = p.match(/^@@BLOCK_(\d+)@@$/);
    if (blockMatch) {
      return blocks[parseInt(blockMatch[1])];
    }
    const withBreaks = p.replace(/\n/g, '<br>');
    return `<p>${withBreaks}</p>`;
  }).join('');
}

// Card Rendering
// ===================================================

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = item.id;
  card.onclick = () => openModal(item);
  
  const isBookmarked = state.bookmarks.has(item.id);
  
  card.innerHTML = `
    <div class="card-header">
      <span class="card-category">${utils.escapeHtml(item.category)}</span>
      <button class="bookmark-btn ${isBookmarked ? 'saved' : ''}" 
              onclick="event.stopPropagation(); toggleBookmark(${item.id})"
              aria-label="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
        <i data-lucide="bookmark" width="18" height="18"></i>
      </button>
    </div>
    <h3 class="card-title">${utils.escapeHtml(item.question)}</h3>
    <div class="card-tags">
      ${item.tagsArray.slice(0, 3).map(tag => 
        `<span class="tag">${utils.escapeHtml(tag)}</span>`
      ).join('')}
    </div>
  `;
  
  return card;
}

// Library Rendering
// ===================================================

function populateCategories() {
  const categories = [...new Set(state.allData.map(item => item.category))]
    .sort((a, b) => a.localeCompare(b));
  
  [DOM.categoryFilter, DOM.categoryFilterMobile].forEach(select => {
    select.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  });
}

function renderLibrary() {
  const filtered = getFilteredData();
  const total = filtered.length;
  
  // Calculate pagination
  state.totalPages = Math.max(1, Math.ceil(total / CONFIG.ITEMS_PER_PAGE));
  state.currentPage = utils.clamp(state.currentPage, 1, state.totalPages);
  
  const start = (state.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const end = Math.min(start + CONFIG.ITEMS_PER_PAGE, total);
  const pageItems = filtered.slice(start, end);
  
  // Update meta
  updateResultsMeta(total, start + 1, end);
  
  // Clear grid
  DOM.cardsGrid.innerHTML = '';
  
  // Show/hide empty state
  DOM.emptyState.classList.toggle('hidden', total > 0);
  
  if (total > 0) {
    pageItems.forEach(item => {
      DOM.cardsGrid.appendChild(createCard(item));
    });
  }
  
  // Render pagination
  renderPagination();
  
  // Update clear button
  DOM.clearSearchBtn.classList.toggle('hidden', !state.filters.search);
  
  lucide.createIcons();
}

function updateResultsMeta(total, start, end) {
  let text = '';
  
  if (total === 0) {
    text = 'No results';
  } else if (total <= CONFIG.ITEMS_PER_PAGE) {
    text = `${total} item${total === 1 ? '' : 's'}`;
  } else {
    text = `Showing ${start}–${end} of ${total} items`;
  }
  
  const filters = [];
  if (state.filters.category !== 'all') {
    filters.push(`in "${state.filters.category}"`);
  }
  if (state.filters.search) {
    filters.push(`matching "${state.filters.search}"`);
  }
  
  if (filters.length) {
    text += ' • ' + filters.join(' • ');
  }
  
  DOM.resultsMeta.textContent = text;
}

function renderPagination() {
  DOM.pagination.innerHTML = '';
  
  if (state.totalPages <= 1) {
    DOM.pagination.classList.add('hidden');
    return;
  }
  
  DOM.pagination.classList.remove('hidden');
  
  // Previous button
  if (state.currentPage > 1) {
    const prev = createPageButton('‹', state.currentPage - 1, 'Previous page');
    DOM.pagination.appendChild(prev);
  }
  
  // Page numbers
  const groupStart = Math.floor((state.currentPage - 1) / CONFIG.PAGE_WINDOW) * CONFIG.PAGE_WINDOW + 1;
  const groupEnd = Math.min(groupStart + CONFIG.PAGE_WINDOW - 1, state.totalPages);
  
  for (let i = groupStart; i <= groupEnd; i++) {
    const btn = createPageButton(i, i, `Page ${i}`);
    if (i === state.currentPage) {
      btn.classList.add('active');
    }
    DOM.pagination.appendChild(btn);
  }
  
  // Next button
  const next = createPageButton('›', state.currentPage + 1, 'Next page');
  if (state.currentPage >= state.totalPages) {
    next.disabled = true;
  }
  DOM.pagination.appendChild(next);
  
  // Ellipsis
  if (groupEnd < state.totalPages) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '…';
    DOM.pagination.appendChild(ellipsis);
  }
}

function createPageButton(label, page, ariaLabel) {
  const btn = document.createElement('button');
  btn.className = 'page-btn';
  btn.textContent = label;
  btn.setAttribute('aria-label', ariaLabel);
  btn.onclick = () => {
    state.currentPage = page;
    renderLibrary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return btn;
}

// Saved View
// ===================================================

function renderSaved() {
  const saved = state.allData.filter(item => state.bookmarks.has(item.id));
  
  DOM.savedGrid.innerHTML = '';
  DOM.savedEmpty.classList.toggle('hidden', saved.length > 0);
  
  saved.forEach(item => {
    DOM.savedGrid.appendChild(createCard(item));
  });
  
  lucide.createIcons();
}

// Bookmark Management
// ===================================================

function toggleBookmark(id) {
  if (state.bookmarks.has(id)) {
    state.bookmarks.delete(id);
    showToast('Removed', 'Bookmark removed');
  } else {
    state.bookmarks.add(id);
    showToast('Saved', 'Added to bookmarks');
  }
  
  localStorage.setItem(STORAGE.BOOKMARKS, JSON.stringify([...state.bookmarks]));
  
  // Update UI
  if (state.currentView === 'library') {
    renderLibrary();
  } else if (state.currentView === 'saved') {
    renderSaved();
  }
  
  // Update modal if open
  if (state.currentModalId === id) {
    updateModalBookmarkButton();
  }
  
  // Update study deck if needed
  if (state.currentView === 'study' && state.study.deckType === 'saved') {
    startStudy('saved');
  }
}

// Modal
// ===================================================

function openModal(item) {
  state.currentModalId = item.id;
  
  DOM.modalCategory.textContent = item.category;
  DOM.modalTitle.textContent = item.question;
  DOM.modalAnswer.innerHTML = formatContent(item.answer, item.snippets, item.question);
  
  // Tags
  DOM.modalTags.innerHTML = item.tagsArray.map(tag => 
    `<button class="tag-btn" onclick="searchByTag('${utils.escapeHtml(tag)}')">${utils.escapeHtml(tag)}</button>`
  ).join('');
  
  updateModalBookmarkButton();
  
  DOM.modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // FIX: Reset modal scroll position to top
  const modalBody = DOM.modal.querySelector('.modal-body');
  if (modalBody) {
    modalBody.scrollTop = 0;
  }
  
  lucide.createIcons();
  Prism.highlightAllUnder(DOM.modal);
  
  // Update hash
  window.location.hash = `question-${item.id}`;
}

function closeModal() {
  DOM.modal.classList.add('hidden');
  document.body.style.overflow = '';
  state.currentModalId = null;
  
  // Remove hash
  history.pushState('', document.title, window.location.pathname);
}

function updateModalBookmarkButton() {
  const isBookmarked = state.bookmarks.has(state.currentModalId);
  DOM.modalBookmarkBtn.classList.toggle('saved', isBookmarked);
  DOM.modalBookmarkBtn.setAttribute('aria-label', 
    isBookmarked ? 'Remove bookmark' : 'Add bookmark');
}

function searchByTag(tag) {
  closeModal();
  switchView('library');
  state.filters.search = tag;
  DOM.searchInput.value = tag;
  state.currentPage = 1;
  renderLibrary();
  showToast('Search', `Filtering by "${tag}"`);
}

// === NEW SHARE FUNCTION (Native iOS/Android support) ===
async function shareCard() {
  const url = window.location.href;
  const title = DOM.modalTitle.textContent || 'KnowledgeOcean';
  const text = DOM.modalCategory.textContent 
    ? `Check out this card about ${DOM.modalCategory.textContent}` 
    : 'Check this out!';

  // Use native share if available (iOS/Android/Safari/Edge)
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: text,
        url: url
      });
    } catch (err) {
      // User cancelled or share failed, log silently
      console.log('Share cancelled or failed:', err);
    }
  } else {
    // Fallback for Desktop Chrome/Firefox (Copy Link)
    const success = await utils.copyToClipboard(url);
    if (success) {
      showToast('Copied', 'Link copied to clipboard');
    } else {
      showToast('Error', 'Could not copy link');
    }
  }
}

// Study Mode
// ===================================================

function ensureStudyDeck() {
  const savedCount = state.bookmarks.size;
  const filteredCount = getFilteredData().length;
  
  if (state.study.deckType === 'saved' && savedCount === 0) {
    state.study.deckType = filteredCount > 0 ? 'filtered' : 'all';
  }
  
  startStudy(state.study.deckType);
}

function startStudy(deckType) {
  state.study.deckType = deckType;
  state.study.revealed = false;
  
  // Update deck buttons
  DOM.deckBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.deck === deckType);
  });
  
  // Build deck
  let deck = [];
  if (deckType === 'saved') {
    deck = state.allData.filter(item => state.bookmarks.has(item.id));
  } else if (deckType === 'filtered') {
    deck = getFilteredData();
  } else {
    deck = [...state.allData];
  }
  
  state.study.deck = deck;
  state.study.currentIndex = utils.clamp(state.study.currentIndex, 0, deck.length - 1);
  
  renderStudyCard();
}

function renderStudyCard() {
  const { deck, currentIndex, revealed } = state.study;
  
  // Show/hide empty state
  const hasCards = deck.length > 0;
  DOM.studyEmpty.classList.toggle('hidden', hasCards);
  DOM.flashcard.classList.toggle('hidden', !hasCards);
  DOM.prevCardBtn.parentElement.classList.toggle('hidden', !hasCards);
  
  if (!hasCards) {
    updateStudyProgress(0, 0, 0);
    return;
  }
  
  const card = deck[currentIndex];
  
  // Update progress
  updateStudyProgress(currentIndex + 1, deck.length, ((currentIndex + 1) / deck.length) * 100);
  
  // Update card content
  DOM.cardCategory.textContent = card.category;
  DOM.cardQuestion.textContent = card.question;
  DOM.cardTags.innerHTML = card.tagsArray.slice(0, 5).map(tag => 
    `<span class="tag">${utils.escapeHtml(tag)}</span>`
  ).join('');
  
  DOM.cardAnswer.innerHTML = formatContent(card.answer, card.snippets, card.question);
  
  // Show/hide answer
  DOM.cardBack.classList.toggle('hidden', !revealed);
  
  // Update reveal button
  DOM.revealBtn.innerHTML = revealed
    ? '<i data-lucide="eye-off" width="18" height="18"></i><span>Hide Answer</span>'
    : '<i data-lucide="eye" width="18" height="18"></i><span>Reveal Answer</span>';
  
  lucide.createIcons();
  if (revealed) {
    Prism.highlightAllUnder(DOM.cardBack);
  }
}

function updateStudyProgress(current, total, percentage) {
  DOM.studyProgress.querySelector('.current').textContent = current;
  DOM.studyProgress.querySelector('.total').textContent = total;
  DOM.studyProgress.querySelector('.progress-fill').style.width = `${percentage}%`;
}

function revealAnswer() {
  state.study.revealed = !state.study.revealed;
  renderStudyCard();
}

function nextCard() {
  const { deck, currentIndex } = state.study;
  if (deck.length === 0) return;
  
  state.study.currentIndex = (currentIndex + 1) % deck.length;
  state.study.revealed = false;
  renderStudyCard();
}

function prevCard() {
  const { deck, currentIndex } = state.study;
  if (deck.length === 0) return;
  
  state.study.currentIndex = (currentIndex - 1 + deck.length) % deck.length;
  state.study.revealed = false;
  renderStudyCard();
}

function shuffleDeck() {
  if (state.study.deck.length === 0) return;
  
  const currentId = state.study.deck[state.study.currentIndex]?.id;
  state.study.deck = utils.shuffle(state.study.deck);
  
  if (currentId !== undefined) {
    const newIndex = state.study.deck.findIndex(item => item.id === currentId);
    state.study.currentIndex = newIndex >= 0 ? newIndex : 0;
  }
  
  state.study.revealed = false;
  renderStudyCard();
  showToast('Shuffled', 'Deck order randomized');
}

function restartDeck() {
  state.study.currentIndex = 0;
  state.study.revealed = false;
  renderStudyCard();
  showToast('Restarted', 'Back to first card');
}

function showCurrentCardDetails() {
  if (state.study.deck.length === 0) return;
  const card = state.study.deck[state.study.currentIndex];
  openModal(card);
}

// Drawer (Mobile Filters)
// ===================================================

function openDrawer() {
  DOM.drawer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Sync values
  DOM.categoryFilterMobile.value = state.filters.category;
  DOM.sortFilterMobile.value = state.filters.sort;
}

function closeDrawer() {
  DOM.drawer.classList.add('hidden');
  document.body.style.overflow = '';
}

function applyMobileFilters() {
  state.filters.category = DOM.categoryFilterMobile.value;
  state.filters.sort = DOM.sortFilterMobile.value;
  
  // Sync with desktop
  DOM.categoryFilter.value = state.filters.category;
  DOM.sortFilter.value = state.filters.sort;
  
  state.currentPage = 1;
  renderLibrary();
  closeDrawer();
}

function resetFilters() {
  state.filters = {
    search: '',
    category: 'all',
    sort: 'newest'
  };
  
  DOM.searchInput.value = '';
  DOM.categoryFilter.value = 'all';
  DOM.sortFilter.value = 'newest';
  DOM.categoryFilterMobile.value = 'all';
  DOM.sortFilterMobile.value = 'newest';
  
  state.currentPage = 1;
  renderLibrary();
  
  showToast('Reset', 'All filters cleared');
}

// Data Loading
// ===================================================

async function loadData() {
  try {
    const response = await fetch(CONFIG.API_URL);
    const data = await response.json();
    
    if (!data.values || !Array.isArray(data.values)) {
      throw new Error('Invalid data format');
    }
    
    const rows = data.values.filter(row => row[0] && row[0].trim());
    state.allData = rows.map(processRowData);
    
    populateCategories();
    
    // Initial render
    const savedView = localStorage.getItem(STORAGE.VIEW) || 'library';
    switchView(savedView);
    renderLibrary();
    
    // Check for deep link
    checkDeepLink();
    
  } catch (error) {
    console.error('Error loading data:', error);
    DOM.cardsGrid.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">Failed to load data. Please check your connection.</p>';
    showToast('Error', 'Failed to load data');
  }
}

function checkDeepLink() {
  const hash = window.location.hash;
  if (hash.startsWith('#question-')) {
    const id = parseInt(hash.replace('#question-', ''));
    const item = state.allData.find(item => item.id === id);
    if (item) {
      openModal(item);
    }
  }
}

// Event Listeners
// ===================================================

function initEventListeners() {
  // Theme
  DOM.themeToggle.onclick = toggleTheme;
  
  // Brand
  DOM.brandBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Tabs
  DOM.tabBtns.forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.view);
  });
  
  // Library - Search
  const debouncedSearch = utils.debounce(() => {
    state.filters.search = DOM.searchInput.value.trim();
    state.currentPage = 1;
    renderLibrary();
  }, 300);
  
  DOM.searchInput.oninput = debouncedSearch;
  DOM.clearSearchBtn.onclick = () => {
    DOM.searchInput.value = '';
    state.filters.search = '';
    state.currentPage = 1;
    renderLibrary();
  };
  
  // Library - Filters
  DOM.categoryFilter.onchange = () => {
    state.filters.category = DOM.categoryFilter.value;
    state.currentPage = 1;
    renderLibrary();
  };
  
  DOM.sortFilter.onchange = () => {
    state.filters.sort = DOM.sortFilter.value;
    state.currentPage = 1;
    renderLibrary();
  };
  
  DOM.mobileFilterBtn.onclick = openDrawer;
  DOM.resetFiltersBtn.onclick = resetFilters;
  DOM.resetFromEmpty.onclick = resetFilters;
  
  DOM.studyFilteredBtn.onclick = () => {
    switchView('study');
    startStudy('filtered');
  };
  
  // Saved
  DOM.studySavedBtn.onclick = () => {
    switchView('study');
    startStudy('saved');
  };
  
  DOM.goToLibraryBtn.onclick = () => switchView('library');
  
  // Study
  DOM.deckBtns.forEach(btn => {
    btn.onclick = () => startStudy(btn.dataset.deck);
  });
  
  DOM.shuffleDeckBtn.onclick = shuffleDeck;
  DOM.restartDeckBtn.onclick = restartDeck;
  DOM.revealBtn.onclick = revealAnswer;
  DOM.detailsBtn.onclick = showCurrentCardDetails;
  DOM.prevCardBtn.onclick = prevCard;
  DOM.nextCardBtn.onclick = nextCard;
  DOM.studyGoLibraryBtn.onclick = () => switchView('library');
  
  // Modal
  DOM.modalCloseBtn.onclick = closeModal;
  DOM.modalShareBtn.onclick = shareCard;
  DOM.modalBookmarkBtn.onclick = () => {
    if (state.currentModalId !== null) {
      toggleBookmark(state.currentModalId);
    }
  };
  
  // Close modal when clicking overlay
  DOM.modal.querySelector('.modal-overlay').onclick = closeModal;
  
  // Drawer
  DOM.applyFiltersBtn.onclick = applyMobileFilters;
  DOM.resetFiltersMobileBtn.onclick = () => {
    resetFilters();
    closeDrawer();
  };
  
  // Close drawer when clicking overlay or close buttons
  DOM.drawer.querySelector('.drawer-overlay').onclick = closeDrawer;
  DOM.drawer.querySelectorAll('[data-close="drawer"]').forEach(btn => {
    btn.onclick = closeDrawer;
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Modal shortcuts
    if (!DOM.modal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        closeModal();
      }
      return;
    }
    
    // Drawer shortcuts
    if (!DOM.drawer.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        closeDrawer();
      }
      return;
    }
    
    // Study mode shortcuts
    if (state.currentView === 'study' && state.study.deck.length > 0) {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        revealAnswer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.key === 'Escape' && state.study.revealed) {
        state.study.revealed = false;
        renderStudyCard();
      }
    }
  });
  
  // Handle browser back/forward
  window.addEventListener('popstate', checkDeepLink);
}

// Initialization
// ===================================================

function init() {
  initTheme();
  initEventListeners();
  loadData();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}