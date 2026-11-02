/* Inventory > Harvest tab (needs core.js; markup is in inventory.html) */

const harvestBody = document.getElementById('harvestBody');
const modalEditHarvest = document.getElementById('modalEditHarvest');
const formEditHarvest = document.getElementById('formEditHarvest');

let harvestsList = [];
let harvestPlots = [];

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

        harvestPlots = p.plots || [];
        harvestsList = h.harvests || [];

        fillPlotSelect(document.getElementById('harvestPlot'), harvestPlots);
        render(harvestBody, harvestsList.length ? harvestsList.map(harvestRow) : [emptyRow('No harvests logged yet.')]);
        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

document.getElementById('harvestForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Inventory/add_harvest.php', Object.fromEntries(new FormData(e.target)));
        toast('Harvest logged successfully! 🌾');
        e.target.reset();
        setDefaultDates();
        loadHarvests();
    } catch (x) {
        toast(x.message, true);
    }
});

function openEditHarvestModal(id) {
    const record = harvestsList.find(x => String(x.id) === String(id));
    if (!record || !modalEditHarvest) return;

    // Fill plots in edit dropdown
    const editPlotSelect = document.getElementById('editHarvestPlot');
    if (editPlotSelect) {
        fillPlotSelect(editPlotSelect, harvestPlots);
        editPlotSelect.value = record.plot_id;
    }

    document.getElementById('editHarvestId').value = record.id;
    document.getElementById('editHarvestDate').value = record.harvest_date;
    document.getElementById('editHarvestQty').value = record.quantity;
    document.getElementById('editHarvestNotes').value = record.notes || '';

    modalEditHarvest.hidden = false;
}

if (formEditHarvest) {
    formEditHarvest.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            await post('Inventory/update_harvest.php', {
                id: document.getElementById('editHarvestId').value,
                plot_id: document.getElementById('editHarvestPlot').value,
                harvest_date: document.getElementById('editHarvestDate').value,
                quantity: document.getElementById('editHarvestQty').value,
                notes: document.getElementById('editHarvestNotes').value
            });

            toast('Harvest updated successfully! 🌾');
            modalEditHarvest.hidden = true;
            loadHarvests();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

async function deleteHarvest(id) {
    if (!confirm('Are you sure you want to delete this harvest record?')) return;

    try {
        await post('Inventory/delete_harvest.php', { id });
        toast('Harvest deleted.');
        loadHarvests();
    } catch (e) {
        toast(e.message, true);
    }
}

harvestBody.addEventListener('click', e => {
    const deleteBtn = e.target.closest('button[data-action="delete"]');
    if (deleteBtn) {
        deleteHarvest(deleteBtn.closest('tr').dataset.id);
        return;
    }

    const editBtn = e.target.closest('button[data-action="edit"]');
    if (editBtn) {
        openEditHarvestModal(editBtn.closest('tr').dataset.id);
    }
});
