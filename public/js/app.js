const SUPABASE_URL = 'https://yeeborffffiwltoegbvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZWJvcmZmZmZpd2x0b2VnYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTcxMjcsImV4cCI6MjA5MzQ3MzEyN30.L85LtztEloiKS6qd00yGwEqyS-LV72tb2qwuCCZzx9I';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const searchInput = document.getElementById('product-search');
const resultsContainer = document.getElementById('results-container');

let searchTimeout;

// Debouncing search
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        renderInitialState();
        return;
    }

    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
});

// Handle Enter key for immediate search
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        performSearch(searchInput.value.trim());
    }
});

function renderInitialState() {
    resultsContainer.innerHTML = `
        <div style="text-align: center; margin-top: 4rem; color: var(--text-secondary);">
            <i data-lucide="shopping-basket" size="48" style="margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>Start searching to find the best prices in Milan.</p>
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
    
    try {
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
            .ilike('name', `%${query}%`)
            .limit(10);

        if (error) throw error;

        // Visual delay for smooth transition (optional, but feels more "app-like")
        setTimeout(() => renderResults(data, query), 300);
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

function renderResults(products, query) {
    if (!products || products.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; margin-top: 6rem; animation: fadeIn 0.5s ease;">
                <div style="background: hsla(0, 0%, 100%, 0.05); width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
                    <i data-lucide="search-x" size="40" style="color: var(--text-secondary);"></i>
                </div>
                <h2 style="font-weight: 700; margin-bottom: 0.5rem;">No results found</h2>
                <p style="color: var(--text-secondary);">Try searching for products like "Latte", "Pasta", or "Pane".</p>
                <div style="margin-top: 2rem; padding: 1.5rem; background: hsla(45, 93%, 47%, 0.1); border: 1px solid hsla(45, 93%, 47%, 0.2); border-radius: 1rem; max-width: 400px; margin: 2rem auto;">
                    <p style="color: var(--accent-gold); font-size: 0.9rem; font-weight: 500;">
                        <i data-lucide="database" size="14" style="vertical-align: middle; margin-right: 0.5rem;"></i>
                        Database empty? Make sure you imported the CSV files in Supabase!
                    </p>
                </div>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    resultsContainer.innerHTML = products.map(product => {
        const prices = product.store_prices || [];
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
                                    ${isCheapest ? '<span class="savings-badge">Best Deal</span>' : ''}
                                    <span class="price-value">€ ${p.price_eur.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${prices.length === 0 ? '<p style="color: var(--text-secondary); font-size: 0.8rem; text-align: center;">No price data available for this store.</p>' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
}
