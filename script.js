// CONFIGURATION
const API_KEY = 'AIzaSyD1mbSNTOVDpWe1voq9UeG0l-KzieTOB9Q'; 
const SHEET_ID = '1U0aZe4LUU5qL3seGHRr2Wakb6-NIz_KLlWPSYz4P_3I';
const TAB_NAME = 'Sheet1'; 
const RANGE = `${TAB_NAME}!A2:L`; 
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

// STATE
let allData = [];
let favorites = JSON.parse(localStorage.getItem('kb_favs')) || [];
let currentModalId = null; 

// DOM
const grid = document.getElementById('cardGrid');
const favGrid = document.getElementById('favGrid');
const modal = document.getElementById('modalOverlay');

// --- THEME LOGIC (FIXED) ---
function initTheme() {
    const savedTheme = localStorage.getItem('kb_theme') || 'dark';
    
    // FIX: Apply to HTML tag, not BODY
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    updateThemeIcon(savedTheme);
    updateMetaColor(savedTheme); 
}

function toggleTheme() {
    // FIX: Check attribute on HTML tag
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // FIX: Set attribute on HTML tag
    document.documentElement.setAttribute('data-theme', newTheme);
    
    localStorage.setItem('kb_theme', newTheme);
    updateThemeIcon(newTheme);
    updateMetaColor(newTheme); 
}

function updateThemeIcon(theme) {
    const iconContainer = document.querySelector('#themeToggle i');
    if (!iconContainer) return;
    const iconName = theme === 'dark' ? 'sun' : 'moon';
    iconContainer.setAttribute('data-lucide', iconName);
    lucide.createIcons();
}

// Helper: Update Mobile Browser Address Bar Color
function updateMetaColor(theme) {
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if(metaTag) {
        // Ensure these hex codes match your CSS variables exactly
        const color = theme === 'dark' ? '#0f1115' : '#f3f4f6';
        metaTag.setAttribute('content', color);
    }
}

// --- INIT ---
async function fetchData() {
    initTheme(); 

    try {
        const response = await fetch(API_URL);
        const result = await response.json();
        
        if (!result.values) return;

        const validRows = result.values.filter(row => row[0] && row[0].trim() !== '');

        allData = validRows.map((row, i) => {
            const snippets = [];
            for(let c = 6; c <= 11; c++) {
                if(row[c]) snippets.push(row[c]);
            }

            return {
                id: i, 
                question: row[0] || 'Untitled',
                answer: row[1] || '',
                category: row[2] ? row[2].trim() : 'Uncategorized',
                tags: row[3] || '',
                snippets: snippets
            };
        });

        populateCategoryFilter();
        renderGarden();
        renderFavorites();

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p class="loading">Error loading data. Check console.</p>';
    }
}

// --- SCROLL TO TOP LOGIC ---
document.getElementById('appNav').addEventListener('click', (e) => {
    if(e.target === e.currentTarget) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const modalOverlay = document.getElementById('modalOverlay');
        if(modalOverlay.classList.contains('active')) {
            modalOverlay.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
});

// --- HELPER: Populate Categories ---
function populateCategoryFilter() {
    const cats = [...new Set(allData.map(d => d.category))].sort();
    const select = document.getElementById('catSelect');
    select.innerHTML = '<option value="all">All Categories</option>';
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// --- RENDER CARD LOGIC ---
function createCard(item) {
    const isLoved = favorites.includes(item.id);
    const tags = item.tags ? item.tags.split(',').slice(0, 3) : []; 

    const card = document.createElement('div');
    card.className = 'word-card';
    card.onclick = (e) => {
        if(!e.target.closest('.card-love-btn')) openModal(item);
    };

    let tagsHtml = '';
    tags.forEach(t => tagsHtml += `<span class="meta-tag">${t.trim()}</span>`);

    card.innerHTML = `
        <button class="card-love-btn ${isLoved ? 'loved' : ''}" onclick="toggleLove(this, ${item.id})">
            <i data-lucide="heart" width="16" height="16"></i>
        </button>
        <div class="card-bg-gradient"></div>
        <div class="card-content">
            <div class="card-cat">${item.category}</div>
            <div class="card-word">${item.question}</div>
            <div class="card-meta">${tagsHtml}</div>
        </div>
    `;
    return card;
}

function renderGarden() {
    const catFilter = document.getElementById('catSelect').value;
    const sortMode = document.getElementById('sortSelect').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    const clearBtn = document.getElementById('clearSearch');
    if(search.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    let processedData = allData.filter(item => {
        const matchesCat = catFilter === 'all' || item.category === catFilter;
        const matchesSearch = item.question.toLowerCase().includes(search) || 
                            item.tags.toLowerCase().includes(search);
        return matchesCat && matchesSearch;
    });

    if (sortMode === 'random') {
        processedData = shuffleArray([...processedData]);
    } else if (sortMode === 'newest') {
        processedData.sort((a, b) => b.id - a.id);
    } else if (sortMode === 'oldest') {
        processedData.sort((a, b) => a.id - b.id);
    } else if (sortMode === 'az') {
        processedData.sort((a, b) => a.question.localeCompare(b.question));
    }

    grid.innerHTML = '';
    processedData.forEach(item => grid.appendChild(createCard(item)));
    lucide.createIcons();
}

function toggleLove(btn, id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(fid => fid !== id);
        if(btn) btn.classList.remove('loved');
    } else {
        favorites.push(id);
        if(btn) btn.classList.add('loved');
    }
    localStorage.setItem('kb_favs', JSON.stringify(favorites));
    renderFavorites(); 
}

function toggleModalLove() {
    if (currentModalId === null) return;
    const btn = document.getElementById('modalLoveBtn');
    if (favorites.includes(currentModalId)) {
        favorites = favorites.filter(fid => fid !== currentModalId);
        btn.classList.remove('loved');
    } else {
        favorites.push(currentModalId);
        btn.classList.add('loved');
    }
    localStorage.setItem('kb_favs', JSON.stringify(favorites));
    renderFavorites();
    renderGarden(); 
}

function renderFavorites() {
    favGrid.innerHTML = '';
    const favItems = allData.filter(item => favorites.includes(item.id));
    if (favItems.length === 0) {
        favGrid.innerHTML = '<p style="color:var(--text-muted)">No favorites yet.</p>';
        return;
    }
    favItems.forEach(item => favGrid.appendChild(createCard(item)));
    lucide.createIcons();
}

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const btns = document.querySelectorAll('.nav-links .nav-btn:not(.theme-btn)');
    if(viewName === 'garden') btns[0].classList.add('active');
    if(viewName === 'collection') btns[1].classList.add('active');
    
    document.getElementById(`view-${viewName}`).classList.add('active');
    window.scrollTo(0,0);
    lucide.createIcons();
}

function formatContent(text, snippets) {
    if (!text) return '';

    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    formatted = formatted.replace(/\[(image|code|img)[_\s]?(\d+)\]/gi, (match, type, num) => {
        const index = parseInt(num) - 1;
        if (index >= 0 && index < snippets.length) {
            const content = snippets[index];
            if (content.startsWith('code:')) {
                const cleanCode = content.replace(/^code:/, '');
                return `<pre><code class="language-swift">${cleanCode}</code></pre>`;
            } else if (content.startsWith('image:')) {
                const cleanUrl = content.replace(/^image:/, '');
                return `<img src="${cleanUrl}" class="rendered-img" alt="Illustration">`;
            } else {
                return `<div class="snippet-box">${content}</div>`;
            }
        }
        return '';
    });

    return formatted.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
}

function openModal(item) {
    currentModalId = item.id; 
    
    document.getElementById('m-category').textContent = item.category;
    document.getElementById('m-question').textContent = item.question;
    
    const contentHTML = formatContent(item.answer, item.snippets);
    document.getElementById('m-answer').innerHTML = contentHTML;

    const tagsContainer = document.getElementById('m-tags');
    tagsContainer.innerHTML = '';
    if(item.tags) {
        item.tags.split(',').forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag'; 
            span.textContent = tag.trim();
            tagsContainer.appendChild(span);
        });
    }

    const loveBtn = document.getElementById('modalLoveBtn');
    loveBtn.onclick = toggleModalLove;
    
    if(favorites.includes(item.id)) {
        loveBtn.classList.add('loved');
    } else {
        loveBtn.classList.remove('loved');
    }

    modal.classList.add('active');
    lucide.createIcons();
    Prism.highlightAll();
}

document.getElementById('closeModal').onclick = () => modal.classList.remove('active');

document.getElementById('catSelect').addEventListener('change', renderGarden);
document.getElementById('sortSelect').addEventListener('change', renderGarden);
document.getElementById('searchInput').addEventListener('input', renderGarden);

document.getElementById('clearSearch').addEventListener('click', () => {
    const input = document.getElementById('searchInput');
    input.value = '';
    input.focus();
    renderGarden();
});

fetchData();
