/* Dashboard (needs core.js + layout.js; markup is in index.html) */

let dashboardData = null;

function listOrEmpty(container, nodes, emptyText) {
    if (nodes.length) {
        render(container, nodes);
        return;
    }
    render(container, [fill(cloneTemplate('tpl-empty'), { text: emptyText })]);
}

function taskIcon(type) {
    switch ((type || '').toLowerCase()) {
        case 'water': return '💧';
        case 'fertilize': return '🧪';
        case 'weed': return '🌿';
        case 'pest control': return '🧴';
        case 'inspect': return '🔍';
        default: return '📋';
    }
}

function taskItem(t) {
    const el = cloneTemplate('tpl-task-item');
    const row = el.querySelector('.task-row-item');
    const crop = t.crop_name ? ` (${t.crop_name})` : '';
    const taskType = t.task_type || 'Water';
    const isDone = Boolean(Number(t.done));

    row.dataset.id = t.id;
    row.classList.toggle('done-task', isDone);

    const checkbox = el.querySelector('input[type="checkbox"]');
    checkbox.checked = isDone;
    checkbox.dataset.id = t.id;

    const label = `${taskIcon(taskType)} ${taskType} — ${t.plot_name}${crop}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const sublabel = t.task_date === todayStr ? 'Due today' : `Scheduled: ${t.task_date}`;

    fill(el, { label, sublabel });

    const typeBadge = el.querySelector('[data-badge="task-type"]');
    if (typeBadge) {
        typeBadge.textContent = taskType;
        typeBadge.className = `badge task-type-badge ${taskType.toLowerCase().replace(/\s+/g, '-')}`;
    }

    setBadge(el, 'state', isDone ? 'Done' : 'Pending');
    return el;
}

function harvestItem(h) {
    return fill(cloneTemplate('tpl-harvest-item'), {
        label: `${h.plot_name} (${h.crop_type}) — ${h.harvest_date}`,
        quantity: `${number(h.quantity)} kg`
    });
}

function seedItem(s) {
    const el = fill(cloneTemplate('tpl-seed-item'), {
        name: s.seed_name,
        quantity: `${number(s.quantity_g)}g`
    });
    el.querySelector('[data-role="low"]').hidden = !s.low_stock;
    return el;
}

async function toggleTaskDone(id, done) {
    try {
        await post('Tasks/mark_done.php', { id, done: done ? 1 : 0 });
        toast(done ? 'Task marked as completed! ✅' : 'Task reopened.');
        loadDashboard();
    } catch (e) {
        toast(e.message, true);
    }
}

/* ---------- Modals & Quick Actions ---------- */

const modalHarvest = document.getElementById('modalQuickHarvest');
const modalExpense = document.getElementById('modalQuickExpense');
const modalSale = document.getElementById('modalQuickSale');
const modalTask = document.getElementById('modalQuickTask');

function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    const firstInput = modal.querySelector('input:not([type="hidden"]), select');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal(modal) {
    if (modal) modal.hidden = true;
}

function closeAllModals() {
    [modalHarvest, modalExpense, modalSale, modalTask].forEach(m => {
        if (m) m.hidden = true;
    });
}

function populatePlotDropdowns(plots) {
    // 1. Quick Harvest Plot select
    const harvestPlot = document.getElementById('quickHarvestPlot');
    if (harvestPlot) {
        harvestPlot.innerHTML = plots.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)} (${p.crop_name || p.crop_type})</option>`
        ).join('');
    }

    // 2. Quick Expense Plot select (with Whole Farm)
    const expensePlot = document.getElementById('quickExpensePlot');
    if (expensePlot) {
        const plotOpts = plots.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)} (${p.crop_name || p.crop_type})</option>`
        ).join('');
        expensePlot.innerHTML = `<option value="">Whole Farm (All plots)</option>` + plotOpts;
    }

    // 3. Quick Sale Plot select (with Whole Farm)
    const salePlot = document.getElementById('quickSalePlot');
    if (salePlot) {
        const plotOpts = plots.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)} (${p.crop_name || p.crop_type})</option>`
        ).join('');
        salePlot.innerHTML = `<option value="">Whole Farm (All plots)</option>` + plotOpts;
    }
}

function renderQuickTasksModal(tasks) {
    const container = document.getElementById('quickTasksContainer');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty">No tasks scheduled for today. All caught up! 🎉</div>';
        return;
    }

    container.innerHTML = tasks.map(t => {
        const isDone = Boolean(Number(t.done));
        return `
            <div class="quick-task-row ${isDone ? 'done' : ''}" data-id="${t.id}">
                <label class="task-check-wrap">
                    <input type="checkbox" data-action="quick-toggle" data-id="${t.id}" ${isDone ? 'checked' : ''}>
                    <span class="task-content">
                        <strong>${taskIcon(t.task_type)} ${escapeHtml(t.task_type)} — ${escapeHtml(t.plot_name)}</strong>
                        <small>${escapeHtml(t.crop_name || 'Rice')}</small>
                    </span>
                </label>
                <span class="badge ${isDone ? 'done' : 'pending'}">${isDone ? 'Done' : 'Pending'}</span>
            </div>
        `;
    }).join('');
}

async function loadDashboard() {
    const error = document.getElementById('dashError');

    try {
        const d = await api('Dashboard/get_dashboard_data.php');
        dashboardData = d;
        error.hidden = true;

        document.getElementById('statRice').textContent = d.stats.rice;
        document.getElementById('statTasks').textContent = d.stats.tasks_today;
        document.getElementById('statHarvests').textContent = d.stats.harvests_week;

        listOrEmpty(document.getElementById('plotGrid'), d.plots.map(plotCard), 'No plots yet.');
        listOrEmpty(
            document.getElementById('taskList'),
            d.tasks.map(taskItem),
            'No tasks due today (Watering, Fertilizing, Weeding).'
        );
        listOrEmpty(document.getElementById('harvestList'), d.harvests.slice(0, 3).map(harvestItem), 'No harvest records.');
        listOrEmpty(document.getElementById('seedList'), d.seeds.slice(0, 4).map(seedItem), 'No seed records.');

        populatePlotDropdowns(d.plots);
        renderQuickTasksModal(d.tasks);
        setDefaultDates();
    } catch (e) {
        error.textContent = e.message;
        error.hidden = false;
    }
}

/* ---------- Setup Event Listeners ---------- */

// 1. Task checkoff directly on dashboard task list
document.getElementById('taskList')?.addEventListener('change', e => {
    const target = e.target;
    if (target.dataset.action === 'toggle-task') {
        const id = target.dataset.id;
        toggleTaskDone(id, target.checked);
    }
});

// 2. Task checkoff inside the Quick Task modal
document.getElementById('quickTasksContainer')?.addEventListener('change', e => {
    const target = e.target;
    if (target.dataset.action === 'quick-toggle') {
        const id = target.dataset.id;
        toggleTaskDone(id, target.checked);
    }
});

// 3. Quick action buttons
document.getElementById('btnQuickHarvest')?.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('quickHarvestDate');
    if (dateInput) dateInput.value = today;
    openModal(modalHarvest);
});

document.getElementById('btnQuickExpense')?.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('quickExpenseDate');
    if (dateInput) dateInput.value = today;
    openModal(modalExpense);
});

document.getElementById('btnQuickSale')?.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('quickSaleDate');
    if (dateInput) dateInput.value = today;
    openModal(modalSale);
});

document.getElementById('btnQuickTickTask')?.addEventListener('click', () => {
    if (dashboardData && dashboardData.tasks) {
        renderQuickTasksModal(dashboardData.tasks);
    }
    openModal(modalTask);
});

// 4. Modal close handlers
document.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) {
        closeAllModals();
    } else if (e.target.classList.contains('modal')) {
        closeAllModals();
    }
});

// 5. Quick Forms Submission
document.getElementById('formQuickHarvest')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await post('Inventory/add_harvest.php', Object.fromEntries(new FormData(e.target)));
        toast('Harvest logged successfully! 🌾');
        e.target.reset();
        closeModal(modalHarvest);
        loadDashboard();
    } catch (err) {
        toast(err.message, true);
    }
});

document.getElementById('formQuickExpense')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await post('Finance/add_finance.php', Object.fromEntries(new FormData(e.target)));
        toast('Expense recorded successfully! 💸');
        e.target.reset();
        closeModal(modalExpense);
        loadDashboard();
    } catch (err) {
        toast(err.message, true);
    }
});

document.getElementById('formQuickSale')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await post('Finance/add_finance.php', Object.fromEntries(new FormData(e.target)));
        toast('Sale income recorded successfully! 💰');
        e.target.reset();
        closeModal(modalSale);
        loadDashboard();
    } catch (err) {
        toast(err.message, true);
    }
});

loadDashboard();
