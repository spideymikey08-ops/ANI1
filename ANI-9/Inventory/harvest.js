/* Inventory > Harvest tab (needs core.js; markup is in inventory.html) */

let allHarvests = [];
let harvestPlotsList = [];

const harvestBody = document.getElementById('harvestBody');
const editHarvestModal = document.getElementById('editHarvestModal');
const editHarvestForm = document.getElementById('editHarvestForm');

function harvestRow(h) {
    const row = cloneTemplate('tpl-harvest-row');
    row.dataset.id = h.id;

    fill(row, {
        date: h.harvest_date,
        plot: h.plot_name,
        quantity: `${number(h.quantity)} kg`,
        notes: h.notes || '—'
    });
    setBadge(row, 'crop', h.crop_type);
    return row;
}

async function loadHarvests() {
    try {
        const [p, h] = await Promise.all([
            api('Plots/get_plots.php'),
            api('Inventory/get_harvests.php')
        ]);

        harvestPlotsList = p.plots || [];
        allHarvests = h.harvests || [];

        fillPlotSelect(document.getElementById('harvestPlot'), harvestPlotsList);

        const editSelect = document.getElementById('editHarvestPlot');
        if (editSelect) {
            fillPlotSelect(editSelect, harvestPlotsList);
        }

        render(harvestBody, allHarvests.length ? allHarvests.map(harvestRow) : [emptyRow('No harvests logged yet.')]);
        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

document.getElementById('harvestForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Inventory/add_harvest.php', Object.fromEntries(new FormData(e.target)));
        toast('Harvest logged successfully.');
        e.target.reset();
        setDefaultDates();
        loadHarvests();
    } catch (x) {
        toast(x.message, true);
    }
});

function openEditHarvest(id) {
    const h = allHarvests.find(x => Number(x.id) === Number(id));
    if (!h || !editHarvestModal) return;

    document.getElementById('editHarvestId').value = h.id;
    const plotSelect = document.getElementById('editHarvestPlot');
    if (plotSelect) {
        plotSelect.value = h.plot_id || '';
    }
    document.getElementById('editHarvestDate').value = h.harvest_date;
    document.getElementById('editHarvestQuantity').value = h.quantity;
    document.getElementById('editHarvestNotes').value = h.notes || '';

    editHarvestModal.hidden = false;
}

function closeEditHarvest() {
    if (editHarvestModal) editHarvestModal.hidden = true;
}

if (editHarvestForm) {
    editHarvestForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const fd = Object.fromEntries(new FormData(editHarvestForm));
            await post('Inventory/update_harvest.php', fd);
            toast('Harvest record updated successfully.');
            closeEditHarvest();
            loadHarvests();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

async function deleteHarvest(id) {
    if (!confirm('Delete this harvest record?')) return;

    try {
        await post('Inventory/delete_harvest.php', { id });
        toast('Harvest deleted.');
        loadHarvests();
    } catch (e) {
        toast(e.message, true);
    }
}

harvestBody.addEventListener('click', e => {
    const delBtn = e.target.closest('button[data-action="delete"]');
    if (delBtn) {
        deleteHarvest(delBtn.closest('tr').dataset.id);
        return;
    }

    const editBtn = e.target.closest('button[data-action="edit"]');
    if (editBtn) {
        openEditHarvest(editBtn.closest('tr').dataset.id);
    }
});

window.addEventListener('click', e => {
    if (e.target === editHarvestModal) closeEditHarvest();
});
