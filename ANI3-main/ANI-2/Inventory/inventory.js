/* Inventory page: tab switching.
   The tabs themselves live in seeds.js and harvest.js (load order matters). */

// A single full-width row shown when a table has no data
function emptyRow(text) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = text;
    tr.appendChild(td);
    return tr;
}

const seedTab = document.getElementById('seedTab');
const harvestTab = document.getElementById('harvestTab');

function showTab(tab) {
    const isSeed = tab === 'seeds';

    seedTab.hidden = !isSeed;
    harvestTab.hidden = isSeed;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (isSeed) {
        loadSeeds();
    } else {
        loadHarvests();
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

showTab('seeds');
