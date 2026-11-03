/* Inventory > Farm Supplies & Materials logic (needs core.js; markup in inventory.html) */

let allSupplies = [];
let allPlotsList = [];
let currentFilterCategory = 'All';

const supplyBody = document.getElementById('supplyBody');
const usageLogsBody = document.getElementById('usageLogsBody');
const addSupplyForm = document.getElementById('addSupplyForm');

// Modals
const useModal = document.getElementById('useModal');
const useForm = document.getElementById('useForm');
const editItemModal = document.getElementById('editItemModal');
const editItemForm = document.getElementById('editItemForm');

function getCategoryBadgeClass(category) {
    switch (category) {
        case 'Rice Seeds': return 'cat-seeds';
        case 'Fertilizers': return 'cat-fertilizer';
        case 'Pesticides': return 'cat-pesticide';
        default: return 'cat-other';
    }
}

function supplyRow(item) {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;

    const catClass = getCategoryBadgeClass(item.category);
    const isLow = item.low_stock;
    const stockStatusBadge = isLow
        ? '<span class="badge low">Low Stock</span>'
        : '<span class="badge in-stock">In Stock</span>';

    tr.innerHTML = `
        <td><strong>${escapeHtml(item.item_name)}</strong></td>
        <td><span class="badge ${catClass}">${escapeHtml(item.category)}</span></td>
        <td><strong>${number(item.quantity)}</strong> <small style="color: #647368;">${escapeHtml(item.unit)}</small></td>
        <td>${escapeHtml(item.purchase_date)}</td>
        <td>${number(item.threshold)} ${escapeHtml(item.unit)}</td>
        <td>${stockStatusBadge}</td>
        <td>
            <button type="button" class="small use" data-action="use" title="Record usage of this item">Use</button>
            <button type="button" class="small edit" data-action="edit" title="Edit item details">Edit</button>
            <button type="button" class="small danger" data-action="delete" title="Delete item">Delete</button>
        </td>
    `;
    return tr;
}

function usageLogRow(log) {
    const tr = document.createElement('tr');
    const catClass = getCategoryBadgeClass(log.category);
    tr.innerHTML = `
        <td>${escapeHtml(log.used_date)}</td>
        <td>
            <strong>${escapeHtml(log.item_name)}</strong>
            <span class="badge ${catClass}" style="margin-left: 4px; font-size: 9px;">${escapeHtml(log.category)}</span>
        </td>
        <td><strong>${number(log.quantity_used)}</strong> ${escapeHtml(log.unit)}</td>
        <td>${escapeHtml(log.plot_name)}</td>
        <td>${escapeHtml(log.purpose || '—')}</td>
        <td><small style="color: #647368;">${escapeHtml(log.logged_by || 'Farmer')}</small></td>
    `;
    return tr;
}

function renderSuppliesTable() {
    if (!supplyBody) return;

    let filtered = allSupplies;
    if (currentFilterCategory !== 'All') {
        filtered = filtered.filter(x => x.category === currentFilterCategory);
    }

    const searchInput = document.getElementById('supplySearch');
    if (searchInput && searchInput.value.trim()) {
        const q = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(x =>
            x.item_name.toLowerCase().includes(q) ||
            x.category.toLowerCase().includes(q) ||
            (x.notes && x.notes.toLowerCase().includes(q))
        );
    }

    if (!filtered.length) {
        supplyBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #728276; padding: 28px; font-style: italic;">No farm supplies found for the selected filter.</td></tr>';
        return;
    }

    render(supplyBody, filtered.map(supplyRow));
}

function renderUsageLogs(logs) {
    if (!usageLogsBody) return;
    if (!logs || !logs.length) {
        usageLogsBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #728276; padding: 20px; font-style: italic;">No stock usage recorded yet. Click "Use" on an item to record field applications.</td></tr>';
        return;
    }
    render(usageLogsBody, logs.map(usageLogRow));
}

async function loadSupplies() {
    try {
        const [invRes, plotsRes] = await Promise.all([
            api('Inventory/get_inventory.php'),
            api('Plots/get_plots.php')
        ]);

        allSupplies = invRes.items || [];
        allPlotsList = plotsRes.plots || [];

        // Update stats
        if (invRes.stats) {
            document.getElementById('statTotalItems').textContent = invRes.stats.total || 0;
            document.getElementById('statRiceSeeds').textContent = invRes.stats.rice_seeds || 0;
            document.getElementById('statFertilizers').textContent = invRes.stats.fertilizers || 0;
            document.getElementById('statPesticides').textContent = invRes.stats.pesticides || 0;
            document.getElementById('statLowStock').textContent = invRes.stats.low_stock || 0;
        }

        renderSuppliesTable();
        renderUsageLogs(invRes.recent_usage || []);

        // Populate plot select inside Use Modal
        const usePlotSelect = document.getElementById('usePlotId');
        if (usePlotSelect) {
            usePlotSelect.innerHTML = '<option value="">Whole Farm / General Application</option>' +
                allPlotsList.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        }

        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

// Category filter buttons
document.querySelectorAll('.filter-btn[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilterCategory = btn.dataset.cat;
        renderSuppliesTable();
    });
});

const searchInput = document.getElementById('supplySearch');
if (searchInput) {
    searchInput.addEventListener('input', renderSuppliesTable);
}

// Add Supply Form
if (addSupplyForm) {
    addSupplyForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const fd = Object.fromEntries(new FormData(addSupplyForm));
            await post('Inventory/add_inventory.php', fd);
            toast('Farm supply added to inventory.');
            addSupplyForm.reset();
            const dateInput = addSupplyForm.querySelector('input[type="date"]');
            if (dateInput) dateInput.value = today();
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

// Table clicks: Use, Edit, Delete
if (supplyBody) {
    supplyBody.addEventListener('click', async e => {
        const row = e.target.closest('tr');
        if (!row || !row.dataset.id) return;
        const id = Number(row.dataset.id);
        const item = allSupplies.find(x => x.id === id);
        if (!item) return;

        // 1. Use action
        const useBtn = e.target.closest('button[data-action="use"]');
        if (useBtn) {
            openUseModal(item);
            return;
        }

        // 2. Edit action
        const editBtn = e.target.closest('button[data-action="edit"]');
        if (editBtn) {
            openEditItemModal(item);
            return;
        }

        // 3. Delete action
        const delBtn = e.target.closest('button[data-action="delete"]');
        if (delBtn) {
            if (!confirm(`Delete "${item.item_name}" from inventory?`)) return;
            try {
                await post('Inventory/delete_inventory.php', { id });
                toast('Item removed from inventory.');
                loadSupplies();
            } catch (err) {
                toast(err.message, true);
            }
        }
    });
}

// Use Stock Modal
function openUseModal(item) {
    if (!useModal) return;
    document.getElementById('useItemId').value = item.id;
    document.getElementById('useItemName').textContent = item.item_name;
    document.getElementById('useItemStock').textContent = `${number(item.quantity)} ${item.unit}`;
    document.getElementById('useQtyUnit').textContent = item.unit;

    const qtyInput = document.getElementById('useQuantity');
    qtyInput.value = '';
    qtyInput.max = item.quantity;

    const dateInput = document.getElementById('useDate');
    if (dateInput) dateInput.value = today();

    document.getElementById('usePurpose').value = '';
    useModal.hidden = false;
}

function closeUseModal() {
    if (useModal) useModal.hidden = true;
}

if (useForm) {
    useForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const fd = Object.fromEntries(new FormData(useForm));
            const r = await post('Inventory/use_inventory.php', fd);
            toast(r.message || 'Stock usage recorded.');
            closeUseModal();
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

// Edit Item Modal
function openEditItemModal(item) {
    if (!editItemModal) return;
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.item_name;
    document.getElementById('editItemCategory').value = item.category;
    document.getElementById('editItemQuantity').value = item.quantity;
    document.getElementById('editItemUnit').value = item.unit;
    document.getElementById('editItemPurchaseDate').value = item.purchase_date;
    document.getElementById('editItemThreshold').value = item.threshold;
    document.getElementById('editItemCost').value = item.cost !== null ? item.cost : '';
    document.getElementById('editItemNotes').value = item.notes || '';
    editItemModal.hidden = false;
}

function closeEditItemModal() {
    if (editItemModal) editItemModal.hidden = true;
}

if (editItemForm) {
    editItemForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const fd = Object.fromEntries(new FormData(editItemForm));
            await post('Inventory/update_inventory.php', fd);
            toast('Inventory item updated.');
            closeEditItemModal();
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

// Close buttons for modals
document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        const target = document.getElementById(modalId);
        if (target) target.hidden = true;
    });
});

window.addEventListener('click', e => {
    if (e.target === useModal) closeUseModal();
    if (e.target === editItemModal) closeEditItemModal();
});
