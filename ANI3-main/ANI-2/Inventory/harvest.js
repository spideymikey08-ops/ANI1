/* Inventory > Harvest tab (needs core.js; markup is in inventory.html) */

const harvestBody = document.getElementById('harvestBody');

function harvestRow(h) {
    const row = cloneTemplate('tpl-harvest-row');
    row.dataset.id = h.id;

    fill(row, {
        date: h.harvest_date,
        plot: h.plot_name,
        quantity: `${number(h.quantity)} kg`,
        notes: h.notes || ''
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

        fillPlotSelect(document.getElementById('harvestPlot'), p.plots);
        render(harvestBody, h.harvests.length ? h.harvests.map(harvestRow) : [emptyRow('No harvests logged yet.')]);
        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

document.getElementById('harvestForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Inventory/add_harvest.php', Object.fromEntries(new FormData(e.target)));
        toast('Harvest logged.');
        e.target.reset();
        setDefaultDates();
        loadHarvests();
    } catch (x) {
        toast(x.message, true);
    }
});

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
    const button = e.target.closest('button[data-action="delete"]');
    if (button) deleteHarvest(button.closest('tr').dataset.id);
});
