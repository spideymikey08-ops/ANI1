/* Inventory > Seeds tab (needs core.js; markup is in inventory.html) */

const seedBody = document.getElementById('seedBody');

function seedRow(s) {
    const row = cloneTemplate('tpl-seed-row');
    row.dataset.id = s.id;
    row.dataset.threshold = s.threshold_g;      // keep the raw value for saving

    row.querySelector('.qty').value = s.quantity_g;

    fill(row, {
        name: s.seed_name,
        threshold: number(s.threshold_g)
    });
    setBadge(row, 'crop', s.crop_type);
    setBadge(row, 'stock', s.low_stock ? 'Low' : 'OK', s.low_stock ? 'low' : 'done');
    return row;
}

async function loadSeeds() {
    try {
        const d = await api('Inventory/get_seeds.php');
        render(seedBody, d.seeds.length ? d.seeds.map(seedRow) : [emptyRow('No seeds added yet.')]);
    } catch (e) {
        toast(e.message, true);
    }
}

document.getElementById('seedForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Inventory/add_seed.php', Object.fromEntries(new FormData(e.target)));
        toast('Seed added.');
        e.target.reset();
        loadSeeds();
    } catch (x) {
        toast(x.message, true);
    }
});

async function saveSeed(row) {
    try {
        await post('Inventory/update_seed.php', {
            id: row.dataset.id,
            quantity_g: row.querySelector('.qty').value,
            threshold_g: row.dataset.threshold
        });
        toast('Seed inventory updated.');
        loadSeeds();
    } catch (e) {
        toast(e.message, true);
    }
}

async function deleteSeed(id) {
    if (!confirm('Delete this seed entry?')) return;

    try {
        await post('Inventory/delete_seed.php', { id });
        toast('Seed deleted.');
        loadSeeds();
    } catch (e) {
        toast(e.message, true);
    }
}

seedBody.addEventListener('click', e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const row = button.closest('tr');
    if (button.dataset.action === 'save') saveSeed(row);
    if (button.dataset.action === 'delete') deleteSeed(row.dataset.id);
});
