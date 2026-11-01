/* Dashboard (needs core.js + layout.js; markup is in index.html) */

function listOrEmpty(container, nodes, emptyText) {
    if (nodes.length) {
        render(container, nodes);
        return;
    }
    render(container, [fill(cloneTemplate('tpl-empty'), { text: emptyText })]);
}

function taskItem(t) {
    const el = cloneTemplate('tpl-task-item');
    const crop = t.crop_name ? ` (${t.crop_name})` : '';
    const taskType = t.task_type || 'Water';
    fill(el, { label: `${taskType} ${t.plot_name}${crop}` });
    setBadge(el, 'state', t.done ? 'Done' : 'Pending');
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

async function loadDashboard() {
    const error = document.getElementById('dashError');

    try {
        const d = await api('Dashboard/get_dashboard_data.php');

        error.hidden = true;

        document.getElementById('statRice').textContent = d.stats.rice;
        document.getElementById('statTasks').textContent = d.stats.tasks_today;
        document.getElementById('statHarvests').textContent = d.stats.harvests_week;

        listOrEmpty(document.getElementById('plotGrid'), d.plots.map(plotCard), 'No plots yet.');
        listOrEmpty(document.getElementById('taskList'), d.tasks.map(taskItem), 'No watering tasks due today.');
        listOrEmpty(document.getElementById('harvestList'), d.harvests.slice(0, 2).map(harvestItem), 'No harvest records.');
        listOrEmpty(document.getElementById('seedList'), d.seeds.slice(0, 4).map(seedItem), 'No seed records.');
    } catch (e) {
        error.textContent = e.message;
        error.hidden = false;
    }
}

loadDashboard();
