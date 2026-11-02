/* Inventory page: tab switching.
   The tabs themselves live in supplies.js, harvest.js, and seeds.js. */

function emptyRow(text) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = text;
    tr.appendChild(td);
    return tr;
}

const suppliesTab = document.getElementById('suppliesTab');
const harvestTab = document.getElementById('harvestTab');
const usageTab = document.getElementById('usageTab');
const seedTab = document.getElementById('seedTab');

function showTab(tab) {
    if (suppliesTab) suppliesTab.hidden = (tab !== 'supplies');
    if (harvestTab) harvestTab.hidden = (tab !== 'harvest');
    if (usageTab) usageTab.hidden = (tab !== 'usage');
    if (seedTab) seedTab.hidden = (tab !== 'seeds');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (tab === 'supplies' || tab === 'usage') {
        if (typeof loadSupplies === 'function') loadSupplies();
    } else if (tab === 'harvest') {
        if (typeof loadHarvests === 'function') loadHarvests();
    } else if (tab === 'seeds') {
        if (typeof loadSeeds === 'function') loadSeeds();
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// Default to Farm Supplies & Materials tab
showTab('supplies');
