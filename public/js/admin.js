const SUPABASE_URL = 'https://yeeborffffiwltoegbvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZWJvcmZmZmZpd2x0b2VnYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTcxMjcsImV4cCI6MjA5MzQ3MzEyN30.L85LtztEloiKS6qd00yGwEqyS-LV72tb2qwuCCZzx9I';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const statsGrid = document.getElementById('stats-grid');
const inventoryBody = document.getElementById('inventory-body');
const logoutBtn = document.getElementById('logout-btn');

// Check Session
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
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        alert('Login failed: ' + error.message);
    } else {
        showDashboard();
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    showLogin();
});

// Load Stats (Data Health)
async function loadStats() {
    const { data, error } = await sb
        .from('store_prices')
        .select('store_name', { count: 'exact' });

    if (error) return;

    const counts = data.reduce((acc, curr) => {
        acc[curr.store_name] = (acc[curr.store_name] || 0) + 1;
        return acc;
    }, {});

    const stores = ['Lidl', 'Pam', 'Esselunga', 'Conad'];
    statsGrid.innerHTML = stores.map(store => `
        <div class="stat-card">
            <span class="stat-val">${counts[store] || 0}</span>
            <span class="stat-label">${store}</span>
        </div>
    `).join('');
}

// Load Inventory
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

    if (error) {
        console.error(error);
        return;
    }

    inventoryBody.innerHTML = data.map(item => `
        <tr>
            <td>${item.products?.name || 'Unknown'}</td>
            <td>${item.store_name}</td>
            <td>€ ${item.price_eur.toFixed(2).replace('.', ',')}</td>
            <td>${new Date(item.last_updated).toLocaleDateString()}</td>
            <td>
                <button class="action-btn" onclick="editPrice('${item.id}', ${item.price_eur})">
                    <i data-lucide="edit-2" size="16"></i>
                </button>
                <button class="action-btn" onclick="deleteRecord('${item.id}')" style="color: var(--alert-red);">
                    <i data-lucide="trash-2" size="16"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    lucide.createIcons();
}

window.editPrice = async (id, currentPrice) => {
    const newPriceStr = prompt('Enter new price (e.g. 1.99):', currentPrice);
    if (newPriceStr === null) return;
    
    const newPrice = parseFloat(newPriceStr.replace(',', '.'));
    if (isNaN(newPrice)) return alert('Invalid price format');

    const { error } = await sb
        .from('store_prices')
        .update({ price_eur: newPrice, last_updated: new Date().toISOString() })
        .eq('id', id);

    if (error) alert('Update failed: ' + error.message);
    else loadInventory();
};

window.deleteRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const { error } = await sb
        .from('store_prices')
        .delete()
        .eq('id', id);

    if (error) alert('Delete failed: ' + error.message);
    else {
        loadInventory();
        loadStats();
    }
};

checkSession();
