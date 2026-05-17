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

// --- Italian Synonym Map ---
const synonyms = {
    'pasta':      { terms: ['spaghetti', 'penne', 'rigate', 'fusilli', 'linguine', 'tagliatelle', 'pasta'] },
    'pane':       { terms: ['bread', 'pane', 'loaf', 'sandwich'] },
    'bread':      { terms: ['bread', 'pane', 'sandwich', 'loaf'] },
    'latte':      { terms: ['latte', 'milk', 'lactose'], exclude: ['mozzarella', 'formaggio', 'cheese', 'fior di latte'] },
    'milk':       { terms: ['milk', 'latte', 'lactose'], exclude: ['mozzarella', 'formaggio', 'cheese', 'fior di latte'] },
    'riso':       { terms: ['rice', 'riso', 'basmati', 'carnaroli'] },
    'rice':       { terms: ['rice', 'riso', 'basmati', 'carnaroli'] },
    'burro':      { terms: ['butter', 'burro'] },
    'butter':     { terms: ['butter', 'burro'] },
    'formaggio':  { terms: ['cheese', 'mozzarella', 'parmigiano', 'formaggio', 'grana'] },
    'cheese':     { terms: ['cheese', 'mozzarella', 'parmigiano', 'grana'] },
    'yogurt':     { terms: ['yogurt', 'yoghurt'] },
    'farina':     { terms: ['flour', 'farina'] },
    'flour':      { terms: ['flour', 'farina'] },
    'acqua':      { terms: ['water', 'acqua'] },
    'water':      { terms: ['water', 'acqua'] },
    'mozzarella': { terms: ['mozzarella', 'bufala', 'fior di latte'] },
};

function getSearchContext(query) {
    const lower = query.toLowerCase().trim();
    return synonyms[lower] || { terms: [lower] };
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
    if (query.length < 2) { renderInitialState(); return; }
    searchTimeout = setTimeout(() => performSearch(query), 300);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length >= 2) performSearch(query);
    }
});

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
        
        const { data, error } = await sb
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
            .or(orFilter)
            .limit(20);

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
    const excludes = context.exclude || [];

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

    const filteredProducts = products.filter(product => {
        const name = product.name.toLowerCase();
        // If any exclude term is found in the name, filter it out
        return !excludes.some(ex => name.includes(ex.toLowerCase()));
    });

    if (filteredProducts.length === 0) {
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

    resultsContainer.innerHTML = filteredProducts.map(product => {
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
