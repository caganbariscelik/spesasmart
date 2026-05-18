const SUPABASE_URL = 'https://yeeborffffiwltoegbvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZWJvcmZmZmZpd2x0b2VnYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTcxMjcsImV4cCI6MjA5MzQ3MzEyN30.L85LtztEloiKS6qd00yGwEqyS-LV72tb2qwuCCZzx9I';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const searchInput = document.getElementById('product-search');
const resultsContainer = document.getElementById('results-container');

let searchTimeout;
let currentLang = 'en';

// --- Translations ---
const i18n = {
    en: {
        heroTitle: 'SpesaSmart',
        heroSubtitle: 'High-performance price comparison in Milan',
        placeholder: 'What are you looking for? (e.g. Milk, Bread, Rice)...',
        readyTitle: 'Ready to save?',
        readySubtitle: 'Start typing above to compare 4,000+ local prices.',
        noResultsTitle: 'No results found',
        noResultsSubtitle: 'Try: Milk, Cheese, Bread, Rice, Butter, Tea...',
        dbWarning: 'Database empty? Make sure you imported the CSV files!',
        bestDeal: 'Best Deal',
        admin: 'Admin'
    },
    it: {
        heroTitle: 'SpesaSmart',
        heroSubtitle: 'Confronto prezzi ad alta performance a Milano',
        placeholder: 'Cosa stai cercando? (es. Latte, Pane, Riso)...',
        readyTitle: 'Pronto a risparmiare?',
        readySubtitle: 'Inizia a digitare per confrontare oltre 4.000 prezzi.',
        noResultsTitle: 'Nessun risultato trovato',
        noResultsSubtitle: 'Prova: Latte, Formaggio, Pane, Riso, Burro, Tè...',
        dbWarning: 'Database vuoto? Importa i file CSV in Supabase!',
        bestDeal: 'Miglior Prezzo',
        admin: 'Admin'
    }
};

// --- Italian Synonym Map with strict relevance filtering ---
const synonyms = {
    'pasta':      { terms: ['spaghetti', 'penne', 'rigate', 'fusilli', 'linguine', 'tagliatelle', 'pasta'],
                    exclude: ['dentifricio', 'toothpaste'] },
    'pane':       { terms: ['bread', 'pane', 'loaf', 'sandwich'],
                    exclude: ['panettone', 'grissini'] },
    'bread':      { terms: ['bread', 'pane', 'sandwich', 'loaf'],
                    exclude: ['panettone', 'grissini'] },
    'latte':      { terms: ['latte', 'milk'],
                    exclude: ['mozzarella', 'formaggio', 'cheese', 'fior di latte', 'burrata', 'ricotta', 'mascarpone', 'stracchino', 'crescenza', 'fiordilatte', 'latticini'] },
    'milk':       { terms: ['milk', 'latte'],
                    exclude: ['mozzarella', 'formaggio', 'cheese', 'fior di latte', 'burrata', 'ricotta', 'mascarpone', 'stracchino', 'crescenza', 'fiordilatte', 'latticini'] },
    'riso':       { terms: ['rice', 'riso', 'basmati', 'carnaroli'] },
    'rice':       { terms: ['rice', 'riso', 'basmati', 'carnaroli'] },
    'burro':      { terms: ['butter', 'burro'] },
    'butter':     { terms: ['butter', 'burro'] },
    'formaggio':  { terms: ['cheese', 'mozzarella', 'parmigiano', 'formaggio', 'grana padano'],
                    exclude: ['biscotti', 'cookies', 'frollini', 'chocolate', 'cioccolato', 'merendine', 'snack', 'croissant', 'plumcake', 'wafer', 'tortina'] },
    'cheese':     { terms: ['cheese', 'mozzarella', 'parmigiano', 'grana padano'],
                    exclude: ['biscotti', 'cookies', 'frollini', 'chocolate', 'cioccolato', 'merendine', 'snack', 'croissant', 'plumcake', 'wafer', 'tortina'] },
    'yogurt':     { terms: ['yogurt', 'yoghurt'] },
    'farina':     { terms: ['flour', 'farina'] },
    'flour':      { terms: ['flour', 'farina'] },
    'acqua':      { terms: ['water', 'acqua'] },
    'water':      { terms: ['water', 'acqua'] },
    'mozzarella': { terms: ['mozzarella', 'bufala', 'fior di latte', 'fiordilatte'] },
    'uova':       { terms: ['uova', 'eggs', 'egg'] },
    'eggs':       { terms: ['eggs', 'egg', 'uova'] },
    'olio':       { terms: ['olio', 'oil', 'oliva', 'olive'] },
    'oil':        { terms: ['oil', 'olio', 'oliva', 'olive'] },
    'zucchero':   { terms: ['zucchero', 'sugar'] },
    'sugar':      { terms: ['sugar', 'zucchero'] },
    'caffe':      { terms: ['caffe', 'caffè', 'coffee', 'espresso'] },
    'coffee':     { terms: ['coffee', 'caffe', 'caffè', 'espresso'] },
    'te':         { terms: ['tea', 'tè', 'infuso'] },
    'tea':        { terms: ['tea', 'tè', 'infuso'] },
};

function getSearchContext(query) {
    const lower = query.toLowerCase().trim();
    return synonyms[lower] || { terms: [lower] };
}

// --- Relevance scoring: ranks products by match quality ---
function scoreProduct(product, query, context) {
    const name = product.name.toLowerCase();
    const queryLower = query.toLowerCase().trim();
    const excludes = context.exclude || [];

    // HARD REJECT: if product name contains any excluded term, score = -1
    for (const ex of excludes) {
        if (name.includes(ex.toLowerCase())) return -1;
    }

    let score = 0;

    // Exact query match in name gives highest score
    if (name.includes(queryLower)) score += 100;

    // Exact word boundary match (e.g. "latte" as a standalone word, not inside "fior di latte")
    const wordBoundaryRegex = new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordBoundaryRegex.test(product.name)) score += 50;

    // Synonym term matches
    const terms = context.terms || [queryLower];
    for (const term of terms) {
        if (name.includes(term.toLowerCase())) score += 20;
    }

    // Products with valid (non-zero) prices get a bonus
    const validPrices = (product.store_prices || []).filter(p => p.price_eur > 0);
    if (validPrices.length > 0) score += 10;
    else score -= 50; // Penalize products with no valid prices

    return score;
}

function applyLanguage(lang) {
    currentLang = lang;
    const t = i18n[lang];
    document.querySelector('.hero-section h1').textContent = t.heroTitle;
    document.querySelector('.hero-section p').textContent = t.heroSubtitle;
    searchInput.placeholder = t.placeholder;
    document.querySelector('.admin-badge span') && (document.querySelector('.admin-badge span').textContent = t.admin);
    // Toggle button active state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    // Re-render initial state
    if (searchInput.value.trim().length < 2) renderInitialState();
}

// --- Events ---
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    // Hidden Admin Panel shortcut: typing "admin" or "/admin" in the search bar
    if (query.toLowerCase() === 'admin' || query.toLowerCase() === '/admin') {
        window.location.href = 'admin.html';
        return;
    }
    
    if (query.length < 2) { renderInitialState(); return; }
    searchTimeout = setTimeout(() => performSearch(query), 300);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.toLowerCase() === 'admin' || query.toLowerCase() === '/admin') {
            window.location.href = 'admin.html';
            return;
        }
        if (query.length >= 2) performSearch(query);
    }
});

// Hidden Admin Panel shortcut: Double click the SpesaSmart logo
const logoTitle = document.getElementById('site-logo-title');
if (logoTitle) {
    logoTitle.addEventListener('dblclick', () => {
        window.location.href = 'admin.html';
    });
}

function renderInitialState() {
    const t = i18n[currentLang];
    resultsContainer.innerHTML = `
        <div style="text-align: center; margin-top: 6rem; animation: fadeIn 1s ease;">
            <div style="background: hsla(142, 70%, 50%, 0.1); width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
                <i data-lucide="shopping-bag" size="40" style="color: var(--accent-emerald);"></i>
            </div>
            <h2 style="font-weight: 700; margin-bottom: 0.5rem;">${t.readyTitle}</h2>
            <p style="color: var(--text-secondary);">${t.readySubtitle}</p>
        </div>
    `;
    lucide.createIcons();
}

async function performSearch(query) {
    // Premium Skeleton Loading
    resultsContainer.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
    
    const context = getSearchContext(query);
    const terms = context.terms;

    try {
        // Build OR filter for synonym expansion
        const orFilter = terms.map(t => `name.ilike.%${t}%`).join(',');
        
        let queryBuilder = sb
            .from('products')
            .select(`
                id,
                name,
                brand,
                store_prices (
                    store_name,
                    price_eur,
                    last_updated
                )
            `)
            .or(orFilter);

        // Apply database-level exclusions for faster filtering
        const excludes = context.exclude || [];
        for (const ex of excludes) {
            queryBuilder = queryBuilder.not('name', 'ilike', `%${ex}%`);
        }

        const { data, error } = await queryBuilder.limit(30);

        if (error) throw error;

        setTimeout(() => renderResults(data, query, context), 300);
    } catch (err) {
        console.error('Search error:', err);
        resultsContainer.innerHTML = `
            <div style="text-align: center; margin-top: 4rem; color: var(--alert-red);">
                <i data-lucide="alert-circle" size="48" style="margin-bottom: 1rem;"></i>
                <p>Connection failed. Please check your network.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderResults(products, query, context = {}) {
    const t = i18n[currentLang];

    if (!products || products.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; margin-top: 6rem; animation: fadeIn 0.5s ease;">
                <div style="background: hsla(0, 0%, 100%, 0.05); width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
                    <i data-lucide="search-x" size="40" style="color: var(--text-secondary);"></i>
                </div>
                <h2 style="font-weight: 700; margin-bottom: 0.5rem;">${t.noResultsTitle}</h2>
                <p style="color: var(--text-secondary);">${t.noResultsSubtitle}</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Score and filter products by relevance
    const scoredProducts = products
        .map(product => ({ ...product, _score: scoreProduct(product, query, context) }))
        .filter(product => product._score > 0)
        .sort((a, b) => b._score - a._score);

    if (scoredProducts.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; margin-top: 6rem; animation: fadeIn 0.5s ease;">
                <div style="background: hsla(0, 0%, 100%, 0.05); width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
                    <i data-lucide="search-x" size="40" style="color: var(--text-secondary);"></i>
                </div>
                <h2 style="font-weight: 700; margin-bottom: 0.5rem;">${t.noResultsTitle}</h2>
                <p style="color: var(--text-secondary);">${t.noResultsSubtitle}</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    resultsContainer.innerHTML = scoredProducts.map(product => {
        // Filter out zero prices
        const prices = (product.store_prices || []).filter(p => p.price_eur > 0);
        
        // Skip products that have no valid prices after filtering
        if (prices.length === 0) return '';

        const sortedPrices = [...prices].sort((a, b) => a.price_eur - b.price_eur);
        const minPrice = sortedPrices.length > 0 ? sortedPrices[0].price_eur : null;

        // Highlight the query in the name
        const highlightedName = product.name.replace(new RegExp(`(${query})`, 'gi'), '<span style="color: var(--accent-emerald)">$1</span>');

        return `
            <div class="product-card">
                <div class="product-header">
                    <div>
                        <div class="product-name">${highlightedName}</div>
                        <div class="product-brand">${product.brand || 'Original Brand'}</div>
                    </div>
                </div>
                <div class="price-list">
                    ${prices.map(p => {
                        const isCheapest = p.price_eur === minPrice && prices.length > 1;
                        return `
                            <div class="price-item ${isCheapest ? 'cheapest' : ''}">
                                <span class="store-name">${p.store_name}</span>
                                <div style="display: flex; align-items: center;">
                                    ${isCheapest ? `<span class="savings-badge">${t.bestDeal}</span>` : ''}
                                    <span class="price-value">€ ${p.price_eur.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
}
