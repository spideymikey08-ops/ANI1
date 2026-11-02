/* ==========================================================================
   supplies.js — Farm Supplies & Materials Inventory Module
   Handles tracking of Rice Seeds, Fertilizers, Pesticides, and Other Supplies.
   Supports stock updates on item usage, restocking, editing, and usage logs.
   ========================================================================== */

let allSupplies = [];
let allUsageLogs = [];
let supplyPlots = [];
let activeCategoryFilter = 'All';

const supplyBody = document.getElementById('supplyBody');
const usageBody = document.getElementById('usageBody');
const supplyForm = document.getElementById('supplyForm');

// Modals
const modalUseStock = document.getElementById('modalUseStock');
const formUseStock = document.getElementById('formUseStock');

const modalRestock = document.getElementById('modalRestock');
const formRestock = document.getElementById('formRestock');

const modalEditSupply = document.getElementById('modalEditSupply');
const formEditSupply = document.getElementById('formEditSupply');

function supplyCategoryClass(cat) {
    switch (cat) {
        case 'Rice Seeds': return 'rice';
        case 'Fertilizers': return 'fertilize';
        case 'Pesticides': return 'pest';
        case 'Other Supplies': return 'inspect';
        default: return 'other';
    }
}

function supplyRow(item) {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;

    const qty = parseFloat(item.quantity) || 0;
    const isLow = qty <= 5;

    tr.innerHTML = `
        <td>
            <strong>${escapeHtml(item.item_name)}</strong>
            ${item.notes ? `<br><small class="text-muted">${escapeHtml(item.notes)}</small>` : ''}
        </td>
        <td>
            <span class="badge ${supplyCategoryClass(item.category)}">${escapeHtml(item.category)}</span>
        </td>
        <td>
            <span class="stock-qty ${isLow ? 'low-stock-text' : ''}">
                <strong>${number(qty)}</strong> ${escapeHtml(item.unit)}
            </span>
            ${isLow ? '<span class="badge low" style="margin-left: 5px;">Low</span>' : ''}
        </td>
        <td>${escapeHtml(item.purchase_date)}</td>
        <td>
            ${parseFloat(item.unit_cost) > 0 ? '₱' + number(item.unit_cost) : '—'}
            ${item.supplier ? `<br><small class="text-muted">${escapeHtml(item.supplier)}</small>` : ''}
        </td>
        <td>
            <div class="row-actions">
                <button type="button" class="small btn-action-use" data-action="use" title="Use / Deduct Stock">📉 Use</button>
                <button type="button" class="small btn-action-restock" data-action="restock" title="Restock">📈 Add</button>
                <button type="button" class="small" data-action="edit" title="Edit Item">Edit</button>
                <button type="button" class="small danger" data-action="delete" title="Delete Item">Delete</button>
            </div>
        </td>
    `;
    return tr;
}

function usageRow(log) {
    const tr = document.createElement('tr');
    const isUsed = log.action_type === 'Used';

    tr.innerHTML = `
        <td>${escapeHtml(log.used_date)}</td>
        <td>
            <strong>${escapeHtml(log.item_name)}</strong>
            <span class="badge ${supplyCategoryClass(log.category)}" style="font-size: 10px; margin-left: 4px;">${escapeHtml(log.category)}</span>
        </td>
        <td>
            <span class="badge ${isUsed ? 'maintenance' : 'planted'}">
                ${isUsed ? 'Used / Applied' : 'Restocked'}
            </span>
        </td>
        <td>
            <strong style="color: ${isUsed ? '#c0392b' : '#27ae60'};">
                ${isUsed ? '-' : '+'}${number(log.quantity)} ${escapeHtml(log.unit || '')}
            </strong>
        </td>
        <td>${escapeHtml(log.plot_name || 'Whole Farm')}</td>
        <td>${escapeHtml(log.notes || '—')}</td>
    `;
    return tr;
}

async function loadSupplies() {
    try {
        const [plotsResp, invResp] = await Promise.all([
            api('Plots/get_plots.php'),
            api('Inventory/get_inventory.php')
        ]);

        supplyPlots = plotsResp.plots || [];
        allSupplies = invResp.items || [];
        allUsageLogs = invResp.logs || [];

        // Update summary tiles
        if (invResp.summary) {
            document.getElementById('sumTotalItems') && (document.getElementById('sumTotalItems').textContent = invResp.summary.total_items);
            document.getElementById('sumSeeds') && (document.getElementById('sumSeeds').textContent = invResp.summary.seeds);
            document.getElementById('sumFertilizers') && (document.getElementById('sumFertilizers').textContent = invResp.summary.fertilizers);
            document.getElementById('sumPesticides') && (document.getElementById('sumPesticides').textContent = invResp.summary.pesticides);
            document.getElementById('sumOther') && (document.getElementById('sumOther').textContent = invResp.summary.supplies);
        }

        renderFilteredSupplies();
        renderUsageLogs();
        populatePlotsInModals();
        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

function renderFilteredSupplies() {
    if (!supplyBody) return;

    let filtered = allSupplies;
    if (activeCategoryFilter !== 'All') {
        filtered = allSupplies.filter(s => s.category === activeCategoryFilter);
    }

    if (filtered.length) {
        supplyBody.replaceChildren(...filtered.map(supplyRow));
    } else {
        supplyBody.replaceChildren(emptyRow('No farm supplies recorded in this category.'));
    }
}

function renderUsageLogs() {
    if (!usageBody) return;
    if (allUsageLogs.length) {
        usageBody.replaceChildren(...allUsageLogs.map(usageRow));
    } else {
        usageBody.replaceChildren(emptyRow('No stock usage records yet. When you use items, records will appear here.'));
    }
}

function populatePlotsInModals() {
    const usePlotSelect = document.getElementById('useStockPlot');
    if (usePlotSelect) {
        const opts = supplyPlots.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)} (${p.crop_name || p.crop_type})</option>`
        ).join('');
        usePlotSelect.innerHTML = `<option value="">Whole Farm (Entire Farm)</option>` + opts;
    }
}

/* Category Filter Pills */
document.getElementById('categoryFilters')?.addEventListener('click', e => {
    const btn = e.target.closest('.cat-pill');
    if (!btn) return;

    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategoryFilter = btn.dataset.category;
    renderFilteredSupplies();
});

/* Form: Add Supply */
if (supplyForm) {
    supplyForm.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            await post('Inventory/add_inventory.php', Object.fromEntries(new FormData(supplyForm)));
            toast('Farm supply added to inventory! 📦');
            supplyForm.reset();
            setDefaultDates();
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

/* Modal: Use / Deduct Stock */
function openUseModal(id) {
    const item = allSupplies.find(s => String(s.id) === String(id));
    if (!item || !modalUseStock) return;

    document.getElementById('useStockId').value = item.id;
    document.getElementById('useStockItemName').textContent = item.item_name;
    document.getElementById('useStockAvailable').textContent = `${number(item.quantity)} ${item.unit}`;
    document.getElementById('useStockUnit').textContent = item.unit;

    const qtyInput = document.getElementById('useStockQty');
    qtyInput.max = item.quantity;
    qtyInput.value = '';

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('useStockDate').value = today;
    document.getElementById('useStockNotes').value = '';

    modalUseStock.hidden = false;
    setTimeout(() => qtyInput.focus(), 50);
}

if (formUseStock) {
    formUseStock.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            const data = {
                item_id: document.getElementById('useStockId').value,
                quantity_used: document.getElementById('useStockQty').value,
                used_date: document.getElementById('useStockDate').value,
                plot_id: document.getElementById('useStockPlot').value,
                notes: document.getElementById('useStockNotes').value
            };

            const r = await post('Inventory/use_inventory.php', data);
            toast(r.message || 'Stock deducted.');
            modalUseStock.hidden = true;
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

/* Modal: Restock */
function openRestockModal(id) {
    const item = allSupplies.find(s => String(s.id) === String(id));
    if (!item || !modalRestock) return;

    document.getElementById('restockId').value = item.id;
    document.getElementById('restockItemName').textContent = item.item_name;
    document.getElementById('restockUnit').textContent = item.unit;

    const qtyInput = document.getElementById('restockQty');
    qtyInput.value = '';

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('restockDate').value = today;
    document.getElementById('restockNotes').value = '';

    modalRestock.hidden = false;
    setTimeout(() => qtyInput.focus(), 50);
}

if (formRestock) {
    formRestock.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            const data = {
                item_id: document.getElementById('restockId').value,
                quantity_added: document.getElementById('restockQty').value,
                restock_date: document.getElementById('restockDate').value,
                notes: document.getElementById('restockNotes').value
            };

            const r = await post('Inventory/restock_inventory.php', data);
            toast(r.message || 'Item restocked.');
            modalRestock.hidden = true;
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

/* Modal: Edit Supply */
function openEditSupplyModal(id) {
    const item = allSupplies.find(s => String(s.id) === String(id));
    if (!item || !modalEditSupply) return;

    document.getElementById('editSupplyId').value = item.id;
    document.getElementById('editSupplyName').value = item.item_name;
    document.getElementById('editSupplyCategory').value = item.category;
    document.getElementById('editSupplyQuantity').value = item.quantity;
    document.getElementById('editSupplyUnit').value = item.unit;
    document.getElementById('editSupplyDate').value = item.purchase_date;
    document.getElementById('editSupplyCost').value = item.unit_cost || '';
    document.getElementById('editSupplySupplier').value = item.supplier || '';
    document.getElementById('editSupplyNotes').value = item.notes || '';

    modalEditSupply.hidden = false;
}

if (formEditSupply) {
    formEditSupply.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            const data = {
                id: document.getElementById('editSupplyId').value,
                item_name: document.getElementById('editSupplyName').value,
                category: document.getElementById('editSupplyCategory').value,
                quantity: document.getElementById('editSupplyQuantity').value,
                unit: document.getElementById('editSupplyUnit').value,
                purchase_date: document.getElementById('editSupplyDate').value,
                unit_cost: document.getElementById('editSupplyCost').value,
                supplier: document.getElementById('editSupplySupplier').value,
                notes: document.getElementById('editSupplyNotes').value
            };

            await post('Inventory/update_inventory.php', data);
            toast('Farm supply updated successfully!');
            modalEditSupply.hidden = true;
            loadSupplies();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

/* Delete Supply */
async function deleteSupply(id) {
    if (!confirm('Are you sure you want to delete this farm supply from inventory?')) return;

    try {
        await post('Inventory/delete_inventory.php', { id });
        toast('Item deleted.');
        loadSupplies();
    } catch (e) {
        toast(e.message, true);
    }
}

/* Supply Table Action Click Delegator */
supplyBody?.addEventListener('click', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;

    if (e.target.closest('[data-action="use"]')) {
        openUseModal(id);
    } else if (e.target.closest('[data-action="restock"]')) {
        openRestockModal(id);
    } else if (e.target.closest('[data-action="edit"]')) {
        openEditSupplyModal(id);
    } else if (e.target.closest('[data-action="delete"]')) {
        deleteSupply(id);
    }
});

/* Modal Close Event Listener for all Inventory Modals */
document.addEventListener('click', e => {
    if (e.target.matches('[data-close]') || e.target.classList.contains('modal')) {
        [modalUseStock, modalRestock, modalEditSupply, document.getElementById('modalEditHarvest')].forEach(m => {
            if (m) m.hidden = true;
        });
    }
});
