/* Inventory page: tab switching between Farm Supplies & Harvest. */

function emptyRow(text) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 7;
    td.textContent = text;
    tr.appendChild(td);
    return tr;
}

const suppliesTab = document.getElementById('suppliesTab');
const harvestTab = document.getElementById('harvestTab');

function showTab(tab) {
    const isSupplies = tab === 'supplies' || tab === 'seeds';

    if (suppliesTab) suppliesTab.hidden = !isSupplies;
    if (harvestTab) harvestTab.hidden = isSupplies;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnTab = btn.dataset.tab;
        btn.classList.toggle('active', isSupplies ? (btnTab === 'supplies' || btnTab === 'seeds') : (btnTab === 'harvest'));
    });

    if (isSupplies) {
        if (typeof loadSupplies === 'function') loadSupplies();
    } else {
        if (typeof loadHarvests === 'function') loadHarvests();
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

showTab('supplies');
