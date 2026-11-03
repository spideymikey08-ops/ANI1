/* Watering Tasks page (needs core.js + layout.js; markup is in watering.html) */

const taskBody = document.getElementById('taskBody');
const taskForm = document.getElementById('taskForm');
const taskPlot = document.getElementById('taskPlot');
const taskDate = document.getElementById('taskDate');

function taskRow(t) {
    const row = cloneTemplate('tpl-task-row');
    row.dataset.id = t.id;
    row.classList.toggle('muted', Boolean(Number(t.done)));
    row.querySelector('input[type="checkbox"]').checked = Boolean(Number(t.done));

    fill(row, { plot: t.plot_name, task_type: t.task_type || 'Water', date: t.task_date });
    setBadge(row, 'crop', t.crop_type);
    return row;
}

async function load() {
    try {
        const [t, p] = await Promise.all([
            api('Tasks/get_tasks.php'),
            api('Plots/get_plots.php')
        ]);
        render(taskBody, t.tasks.map(taskRow));
        if (taskPlot) {
            fillPlotSelect(taskPlot, p.plots || [], 'Select a plot');
        }
        if (taskDate && !taskDate.value) {
            taskDate.value = today();
        }
    } catch (e) {
        toast(e.message, true);
    }
}

if (taskForm) {
    taskForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const fd = Object.fromEntries(new FormData(taskForm));
            await post('Tasks/add_task.php', fd);
            toast('Task scheduled.');
            taskForm.reset();
            if (taskDate) taskDate.value = today();
            load();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

async function toggleTask(id, done) {
    try {
        await post('Tasks/mark_done.php', { id, done });
        toast(done ? 'Task marked done.' : 'Task reopened.');
        load();
    } catch (e) {
        toast(e.message, true);
    }
}

async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;

    try {
        await post('Tasks/delete_task.php', { id });
        toast('Task deleted.');
        load();
    } catch (e) {
        toast(e.message, true);
    }
}

taskBody.addEventListener('change', e => {
    if (e.target.dataset.action !== 'toggle') return;
    toggleTask(e.target.closest('tr').dataset.id, e.target.checked);
});

taskBody.addEventListener('click', e => {
    const button = e.target.closest('button[data-action="delete"]');
    if (button) deleteTask(button.closest('tr').dataset.id);
});

load();
