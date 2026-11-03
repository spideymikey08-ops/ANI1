let plots = [];
 
const plantModal = document.getElementById('plantModal');
const plantForm = document.getElementById('plantForm');
const detailModal = document.getElementById('detailModal');

let currentId = null;   // plot currently shown in the details modal
 
/* ---------- Rendering ---------- */
 
/* A plot card that opens the details modal when clicked */
function overviewCard(p) {
    const card = plotCard(p);
    card.dataset.id = p.id;
    card.classList.add('clickable');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    return card;
}
 
async function loadPlots() {
    try {
        const d = await api('Plots/get_plots.php');
        plots = d.plots;
 
        render(document.getElementById('plotOverview'), plots.map(overviewCard));
 
        // keep the details modal in sync after a save / planting update
        if (!detailModal.hidden) {
            const p = plots.find(x => x.id == currentId);
            p ? showDetails(p) : closeDetails();
        }
    } catch (e) {
        toast(e.message, true);
    }
}

/* ---------- Add a plot (button opens a popup form) ---------- */
 
function openPlotModal() {
    plotModal.hidden = false;
    plotModal.querySelector('input[name="name"]').focus();
}
 
function closePlotModal() {
    plotModal.hidden = true;
}
 
document.getElementById('addPlotBtn').addEventListener('click', openPlotModal);
document.getElementById('plotClose').addEventListener('click', closePlotModal);
 
plotModal.addEventListener('click', e => {
    if (e.target === plotModal) closePlotModal();
});
 
document.getElementById('plotForm').addEventListener('submit', async e => {
    e.preventDefault();
 
    try {
        await post('Plots/add_plot.php', Object.fromEntries(new FormData(e.target)));
        e.target.reset();
        closePlotModal();
        toast('Plot added.');
        loadPlots();
    } catch (x) {
        toast(x.message, true);
    }
});
 
/* ---------- Plot details (click a plot card) ---------- */
 
function showDetails(p) {
    currentId = p.id;
 
    document.getElementById('detailName').value = p.name;
    document.getElementById('detailStatus').value = (p.status === 'Occupied' ? 'Planted' : p.status);
 
    const planting = p.crop_name
        ? p.crop_name + (p.variety ? ' — ' + p.variety : '')
        : 'No current planting';
 
    const set = (key, text) => {
        detailModal.querySelector(`[data-detail="${key}"]`).textContent = text || '—';
    };
    set('planting', planting);
    set('planted', p.planted_date);
    set('harvest', p.expected_harvest_date);
    set('notes', p.planting_notes);
 
    detailModal.hidden = false;
}
 
function closeDetails() {
    detailModal.hidden = true;
    currentId = null;
}
 
document.getElementById('plotOverview').addEventListener('click', e => {
    const card = e.target.closest('.plot-card');
    if (!card) return;
    const p = plots.find(x => x.id == card.dataset.id);
    if (p) showDetails(p);
});
 
document.getElementById('plotOverview').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.plot-card');
    if (!card) return;
    e.preventDefault();
    card.click();
});
 
document.getElementById('detailClose').addEventListener('click', closeDetails);
 
detailModal.addEventListener('click', e => {
    if (e.target === detailModal) closeDetails();
});
 
/* ---------- Details actions: save / plant / delete ---------- */
 
async function savePlot() {
    try {
        await post('Plots/update_plot.php', {
            id: currentId,
            name: document.getElementById('detailName').value,
            crop_type: 'Rice',
            status: document.getElementById('detailStatus').value
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
        closeDetails();
        loadPlots();
    } catch (e) {
        toast(e.message, true);
    }
}
 
document.getElementById('detailSave').addEventListener('click', savePlot);
document.getElementById('detailDelete').addEventListener('click', () => deletePlot(currentId));
document.getElementById('detailPlant').addEventListener('click', () => {
    const id = currentId;
    closeDetails();
    openPlanting(id);
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
    if (e.key !== 'Escape') return;
    if (!plantModal.hidden) closePlanting();
    else if (!detailModal.hidden) closeDetails();

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
