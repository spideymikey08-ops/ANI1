/* ==========================================================================
   finance.js
   Farm Finance page logic: dynamic filtering by date range & plot,
   real-time totals calculation, category selection, transaction CRUD.
   ========================================================================== */

const expenseCategories = [
    ['🌱', 'Seed'],
    ['🧪', 'Fertilizer'],
    ['🧴', 'Pesticide'],
    ['👷', 'Labor'],
    ['⛽', 'Fuel'],
    ['📦', 'Other']
];

const incomeCategories = [
    ['🌾', 'Harvest Sale'],
    ['💵', 'Other Income']
];

let allTransactions = [];
let plotsList = [];

const financeForm = document.getElementById('financeForm');
const categoryInput = document.getElementById('financeCategory');
const categoryHolder = document.getElementById('financeCategories');
const financeList = document.getElementById('financeList');
const dateFilter = document.getElementById('financeDateFilter');
const plotFilter = document.getElementById('financePlotFilter');
const clearFilterBtn = document.getElementById('clearFinanceFilters');

function money(value) {
    const num = Number(value || 0);
    const sign = num < 0 ? '-' : '';
    const formatted = Math.abs(num).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return sign + '₱' + formatted;
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function currentType() {
    return financeForm.querySelector('input[name="transaction_type"]:checked')?.value || 'Expense';
}

/* ---------- Category chips ---------- */

function selectCategory(name) {
    categoryInput.value = name;
    categoryHolder.querySelectorAll('.finance-category').forEach(chip => {
        chip.classList.toggle('selected', chip.dataset.category === name);
    });
}

function renderCategories() {
    const type = currentType();
    const categories = type === 'Income' ? incomeCategories : expenseCategories;

    document.getElementById('financeCategoryLabel').textContent =
        type === 'Income' ? 'Income Category' : 'Expense Category';

    render(categoryHolder, categories.map(([icon, name]) => {
        const chip = fill(cloneTemplate('tpl-category-chip'), { icon, name });
        chip.dataset.category = name;
        return chip;
    }));

    selectCategory(categories[0][1]);

    financeForm.querySelector('.expense-choice').classList.toggle('active', type === 'Expense');
    financeForm.querySelector('.income-choice').classList.toggle('active', type === 'Income');
}

categoryHolder.addEventListener('click', e => {
    const chip = e.target.closest('.finance-category');
    if (chip) selectCategory(chip.dataset.category);
});

financeForm.querySelectorAll('input[name="transaction_type"]').forEach(input => {
    input.addEventListener('change', renderCategories);
});

/* ---------- Filtering & Summary Calculation ---------- */

function matchesDateFilter(dateStr, range) {
    if (!range || range === 'all') return true;
    if (!dateStr) return false;

    const parts = dateStr.split('-');
    if (parts.length < 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    const txDate = new Date(y, m, d, 12, 0, 0);
    const now = new Date();
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

    if (range === 'week') {
        // Monday to Sunday of current week
        const dayOfWeek = todayNoon.getDay(); // 0 is Sun, 1 is Mon...
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const startOfWeek = new Date(todayNoon);
        startOfWeek.setDate(todayNoon.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return txDate >= startOfWeek && txDate <= endOfWeek;
    }

    if (range === 'month') {
        // Current calendar month & year
        return y === now.getFullYear() && m === now.getMonth();
    }

    if (range === 'year') {
        // Current calendar year
        return y === now.getFullYear();
    }

    return true;
}

function financeItem(x) {
    const isIncome = x.transaction_type === 'Income';
    const kind = isIncome ? 'income' : 'expense';
    const sign = isIncome ? '+' : '-';

    const metaParts = [x.plot_name || 'Unassigned Plot', formatShortDate(x.transaction_date)];
    if (x.notes && x.notes.trim()) {
        metaParts.push(x.notes.trim());
    }

    const item = fill(cloneTemplate('tpl-finance-item'), {
        category: x.category,
        type: x.transaction_type,
        meta: metaParts.join(' · '),
        amount: sign + money(x.amount)
    });

    item.dataset.id = x.id;

    const pill = item.querySelector('.finance-pill');
    if (pill) pill.classList.add(kind);

    const amtEl = item.querySelector('.finance-item-amount');
    if (amtEl) amtEl.classList.add(kind);

    return item;
}

function applyFilters() {
    const selectedRange = dateFilter?.value || 'all';
    const selectedPlot = plotFilter?.value || 'all';

    const filtered = allTransactions.filter(tx => {
        const dateOk = matchesDateFilter(tx.transaction_date, selectedRange);
        const plotOk = (selectedPlot === 'all') || (String(tx.plot_id) === String(selectedPlot));
        return dateOk && plotOk;
    });

    let totalExpenses = 0;
    let totalRevenue = 0;

    for (const tx of filtered) {
        const amt = parseFloat(tx.amount) || 0;
        if (tx.transaction_type === 'Expense') {
            totalExpenses += amt;
        } else if (tx.transaction_type === 'Income') {
            totalRevenue += amt;
        }
    }

    const netProfit = totalRevenue - totalExpenses;

    document.getElementById('totalExpenses').textContent = money(totalExpenses);
    document.getElementById('totalRevenue').textContent = money(totalRevenue);

    const netEl = document.getElementById('netProfit');
    netEl.textContent = money(netProfit);
    netEl.classList.toggle('loss', netProfit < 0);
    netEl.classList.toggle('profit', netProfit >= 0);

    const countBadge = document.getElementById('transactionCount');
    if (countBadge) {
        countBadge.textContent = `${filtered.length} record${filtered.length === 1 ? '' : 's'}`;
    }

    render(
        financeList,
        filtered.length
            ? filtered.map(financeItem)
            : [cloneTemplate('tpl-finance-empty')]
    );
}

function populatePlotFilter(plots) {
    if (!plotFilter) return;
    const currentVal = plotFilter.value || 'all';

    plotFilter.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All plots';
    plotFilter.appendChild(allOpt);

    plots.forEach(p => {
        const opt = document.createElement('option');
        opt.value = String(p.id);
        opt.textContent = p.name;
        plotFilter.appendChild(opt);
    });

    if ([...plotFilter.options].some(o => o.value === currentVal)) {
        plotFilter.value = currentVal;
    } else {
        plotFilter.value = 'all';
    }
}

async function loadFinance() {
    try {
        const [plotsResponse, financeResponse] = await Promise.all([
            api('Plots/get_plots.php'),
            api('Finance/get_finance.php')
        ]);

        plotsList = plotsResponse.plots || [];
        allTransactions = financeResponse.transactions || [];

        fillPlotSelect(
            document.getElementById('financePlot'),
            plotsList,
            plotsList.length ? 'Select a plot' : 'No rice plots available'
        );

        populatePlotFilter(plotsList);
        applyFilters();
        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

/* ---------- Filter Event Listeners ---------- */

if (dateFilter) {
    dateFilter.addEventListener('change', applyFilters);
}

if (plotFilter) {
    plotFilter.addEventListener('change', applyFilters);
}

if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
        if (dateFilter) dateFilter.value = 'all';
        if (plotFilter) plotFilter.value = 'all';
        applyFilters();
        toast('Filters cleared.');
    });
}

/* ---------- Form Handling ---------- */

function resetFinanceForm() {
    financeForm.reset();
    financeForm.querySelector('input[name="transaction_type"][value="Expense"]').checked = true;
    renderCategories();
    setDefaultDates();
}

financeForm.addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('Finance/add_finance.php', Object.fromEntries(new FormData(financeForm)));
        toast('Farm transaction added.');
        resetFinanceForm();
        await loadFinance();
    } catch (x) {
        toast(x.message, true);
    }
});

document.getElementById('resetFinance').addEventListener('click', () => {
    resetFinanceForm();
    toast('Form cleared.');
});

/* ---------- Delete Transaction ---------- */

financeList.addEventListener('click', async e => {
    const button = e.target.closest('button[data-action="delete"]');
    if (!button) return;

    const item = button.closest('.finance-item');
    if (!item) return;

    if (!confirm('Delete this farm transaction?')) return;

    try {
        await post('Finance/delete_finance.php', { id: item.dataset.id });
        toast('Transaction deleted.');
        await loadFinance();
    } catch (err) {
        toast(err.message, true);
    }
});

renderCategories();
loadFinance();
