/* Plots page (needs core.js + layout.js; markup is in plots.html) */

let plots = [];

const plotsBody = document.getElementById('plotsBody');
const plantModal = document.getElementById('plantModal');
const plantForm = document.getElementById('plantForm');

/* ---------- Rendering ---------- */

function plotRow(p) {
    const row = cloneTemplate('tpl-plot-row');
    row.dataset.id = p.id;

    row.querySelector('[data-role="name"]').value = p.name;
    row.querySelector('[data-role="status"]').value = p.status;

    const planting = p.crop_name
        ? p.crop_name + (p.variety ? ' — ' + p.variety : '')
        : '—';
    fill(row, { planting });

    return row;
}

async function loadPlots() {
    try {
        const d = await api('Plots/get_plots.php');
        plots = d.plots;

        render(document.getElementById('plotOverview'), plots.map(plotCard));
        render(plotsBody, plots.map(plotRow));
    } catch (e) {
        toast(e.message, true);
    }
}

/* ---------- Add a plot ---------- */

document.getElementById('plotForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Plots/add_plot.php', Object.fromEntries(new FormData(e.target)));
        e.target.reset();
        toast('Plot added.');
        loadPlots();
    } catch (x) {
        toast(x.message, true);
    }
});

/* ---------- Row actions: save / plant / delete ---------- */

async function savePlot(row) {
    try {
        await post('Plots/update_plot.php', {
            id: row.dataset.id,
            name: row.querySelector('[data-role="name"]').value,
            crop_type: 'Rice',
            status: row.querySelector('[data-role="status"]').value
        });
        toast('Plot updated.');
        loadPlots();
    } catch (e) {
        toast(e.message, true);
    }
}

async function deletePlot(id) {
    if (!confirm('Delete this plot and its related records?')) return;

    try {
        await post('Plots/delete_plot.php', { id });
        toast('Plot deleted.');
        loadPlots();
    } catch (e) {
        toast(e.message, true);
    }
}

plotsBody.addEventListener('click', e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const row = button.closest('tr');
    const id = row.dataset.id;

    if (button.dataset.action === 'save') savePlot(row);
    if (button.dataset.action === 'plant') openPlanting(id);
    if (button.dataset.action === 'delete') deletePlot(id);
});

/* ---------- Planting modal ---------- */

function openPlanting(id) {
    const p = plots.find(x => x.id == id);
    if (!p) return;

    plantForm.reset();
    document.getElementById('plantTitle').textContent = p.name;

    const f = plantForm.elements;
    f.plot_id.value = p.id;
    f.planting_id.value = p.planting_id || 0;
    f.variety.value = p.variety || '';
    f.planted_date.value = p.planted_date || today();
    f.expected_harvest_date.value = p.expected_harvest_date || '';
    f.notes.value = p.planting_notes || '';

    plantModal.hidden = false;
}

function closePlanting() {
    plantModal.hidden = true;
}

document.getElementById('plantClose').addEventListener('click', closePlanting);

plantModal.addEventListener('click', e => {
    if (e.target === plantModal) closePlanting();   // click on the dark backdrop
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !plantModal.hidden) closePlanting();
});

plantForm.addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Plots/add_planting.php', Object.fromEntries(new FormData(plantForm)));
        toast('Planting saved.');
        closePlanting();
        loadPlots();
    } catch (x) {
        toast(x.message, true);
    }
});

loadPlots();
