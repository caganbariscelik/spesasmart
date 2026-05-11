const SUPABASE_URL = 'https://yeeborffffiwltoegbvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZWJvcmZmZmZpd2x0b2VnYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTcxMjcsImV4cCI6MjA5MzQ3MzEyN30.L85LtztEloiKS6qd00yGwEqyS-LV72tb2qwuCCZzx9I';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const statsGrid = document.getElementById('stats-grid');
const inventoryBody = document.getElementById('inventory-body');
const logoutBtn = document.getElementById('logout-btn');

// --- Session Handling ---

async function checkSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showDashboard() {
    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    loadStats();
    loadInventory();
}

function showLogin() {
    authContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    errorMsg.classList.add('hidden');
}

// --- Auth Events ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';
    errorMsg.classList.add('hidden');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    
    loginBtn.disabled = false;
    loginBtn.textContent = 'Authorize Access';

    if (error) {
        errorMsg.textContent = error.message;
        errorMsg.classList.remove('hidden');
    } else {
        showDashboard();
    }
});

logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    showLogin();
});

// --- Data Operations ---

// Load Stats (Accurate counts bypassed 1000 limit)
async function loadStats() {
    const stores = ['Lidl', 'PAM', 'Esselunga', 'Conad'];
    
    try {
        const counts = {};
        
        // Execute 4 parallel count queries for precision
        const countQueries = stores.map(async (store) => {
            const { count, error } = await sb
                .from('store_prices')
                .select('*', { count: 'exact', head: true })
                .eq('store_name', store);
            
            if (error) throw error;
            counts[store] = count || 0;
        });

        await Promise.all(countQueries);

        statsGrid.innerHTML = stores.map(store => `
            <div class="stat-card">
                <span class="stat-val">${counts[store].toLocaleString()}</span>
                <span class="stat-label">${store}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Stats error:', err);
    }
}

async function loadInventory() {
    const { data, error } = await sb
        .from('store_prices')
        .select(`
            id,
            price_eur,
            last_updated,
            store_name,
            products (name)
        `)
        .order('last_updated', { ascending: false })
        .limit(50);

    if (error) return console.error(error);

    inventoryBody.innerHTML = data.map(item => `
        <tr>
            <td style="font-weight: 600">${item.products?.name || 'Unknown Item'}</td>
            <td>${item.store_name}</td>
            <td><span style="color: var(--accent-emerald); font-weight: 700">€ ${item.price_eur.toFixed(2).replace('.', ',')}</span></td>
            <td>${new Date(item.last_updated).toLocaleDateString()}</td>
            <td>
                <button class="action-btn" onclick="editPrice('${item.id}', ${item.price_eur})">
                    <i data-lucide="edit-2" size="16"></i>
                </button>
                <button class="action-btn" onclick="deleteRecord('${item.id}')" style="color: var(--alert-red); margin-left:10px;">
                    <i data-lucide="trash-2" size="16"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    lucide.createIcons();
}

window.editPrice = async (id, currentPrice) => {
    const newPriceStr = prompt('Edit Price (EUR):', currentPrice);
    if (newPriceStr === null) return;
    
    const newPrice = parseFloat(newPriceStr.replace(',', '.'));
    if (isNaN(newPrice)) return alert('Invalid price');

    const { error } = await sb
        .from('store_prices')
        .update({ price_eur: newPrice, last_updated: new Date().toISOString() })
        .eq('id', id);

    if (error) alert('Update error: ' + error.message);
    else loadInventory();
};

window.deleteRecord = async (id) => {
    if (!confirm('Are you sure you want to remove this data point?')) return;

    const { error } = await sb
        .from('store_prices')
        .delete()
        .eq('id', id);

    if (error) alert('Delete error: ' + error.message);
    else {
        loadInventory();
        loadStats();
    }
};

// Initial check
checkSession();
