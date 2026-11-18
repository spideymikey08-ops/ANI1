let plots = [];
let allTasks = [];

const plantModal = document.getElementById('plantModal');
const plantForm = document.getElementById('plantForm');
const detailModal = document.getElementById('detailModal');
const plotTasksModal = document.getElementById('plotTasksModal');
const isoTooltip = document.getElementById('isoTooltip');

const view3dBtn = document.getElementById('view3dBtn');
const viewGridBtn = document.getElementById('viewGridBtn');
const addGlobalTaskBtn = document.getElementById('addGlobalTaskBtn');
const isometricSection = document.getElementById('isometricSection');
const plotOverview = document.getElementById('plotOverview');
const isometricBoard = document.getElementById('isometricBoard');
const quickTaskPlotId = document.getElementById('quickTaskPlotId');

let currentId = null;        // plot currently shown in details modal
let currentTaskId = null;    // plot currently shown in tasks modal
let currentViewMode = localStorage.getItem('ani_plot_view') || (window.innerWidth <= 768 ? 'grid' : '3d');

/* ---------- View Mode Toggle ---------- */

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('ani_plot_view', mode);

    if (mode === '3d') {
        if (view3dBtn) view3dBtn.classList.add('active');
        if (viewGridBtn) viewGridBtn.classList.remove('active');
        if (isometricSection) isometricSection.hidden = false;
        if (plotOverview) plotOverview.hidden = true;
    } else {
        if (viewGridBtn) viewGridBtn.classList.add('active');
        if (view3dBtn) view3dBtn.classList.remove('active');
        if (isometricSection) isometricSection.hidden = true;
        if (plotOverview) plotOverview.hidden = false;
    }
}

if (view3dBtn) view3dBtn.addEventListener('click', () => setViewMode('3d'));
if (viewGridBtn) viewGridBtn.addEventListener('click', () => setViewMode('grid'));

if (addGlobalTaskBtn) {
    addGlobalTaskBtn.addEventListener('click', () => {
        const targetId = currentId || (plots.length > 0 ? plots[0].id : null);
        if (targetId) openPlotTasks(targetId, true);
        else toast('Please create a plot first.');
    });
}

/* ---------- Utility Functions ---------- */

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

function getPlotVisualStatus(p) {
    if (p.status === 'Maintenance') {
        return 'Maintenance';
    }
    if (p.status === 'Planted' || p.planting_id) {
        return 'Planted';
    }
    return 'Available';
}

function getTaskIcon(type) {
    const icons = {
        'Water': '💧',
        'Fertilize': '🌾',
        'Weed': '🌿',
        'Pest Control': '🐛',
        'Inspect': '🔍',
        'Other': '📝'
    };
    return icons[type] || '📝';
}

function getTaskDueMeta(dateStr) {
    if (!dateStr) return { label: '', cls: '' };
    const t = today();
    if (dateStr === t) return { label: 'Due Today', cls: 'due-today' };
    if (dateStr < t) return { label: `Overdue (${dateStr})`, cls: 'due-overdue' };
    return { label: `Due ${dateStr}`, cls: 'due-future' };
}

/* ---------- 2.5D Isometric SVG Generator ---------- */

function createIsoPlotTile(p) {
    const visualStatus = getPlotVisualStatus(p);
    const wrap = document.createElement('div');
    wrap.className = 'iso-tile-wrap';
    wrap.dataset.id = p.id;
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('aria-label', `${p.name} — ${visualStatus}`);

    let grassTopColor = '#388309';
    let grassBotColor = '#4ea134';

    if (visualStatus === 'Available') {
        grassTopColor = '#095683';
        grassBotColor = '#095683';
    } else if (visualStatus === 'Maintenance') {
        grassTopColor = '#856B52';
        grassBotColor = '#5C442D';
    } else {
        grassTopColor = '#569F29';
        grassBotColor = '#2E7817';
    }

    const taskCount = Number(p.pending_tasks || 0);
    let topCornerMarkup = '';

    if (taskCount > 0) {
        topCornerMarkup = `
            <g class="iso-pin-interactive" data-plot-id="${p.id}" title="${taskCount} pending tasks — click to manage">
                <circle cx="234" cy="50" r="14" fill="#AC4244" class="iso-pin-pulse" />
                <path d="M 234,66 C 228,58 224,53 224,47 C 224,41 228.5,37 234,37 C 239.5,37 244,41 244,47 C 244,53 240,58 234,66 Z" 
                      fill="#AC4244" filter="url(#pillShadow-${p.id})" />
                <circle cx="234" cy="47" r="5" fill="#ffffff" />
                <text x="234" y="50" text-anchor="middle" fill="#AC4244" font-size="8.5" font-weight="bold" font-family="'Inter', system-ui, sans-serif">${taskCount}</text>
            </g>
        `;
    } else {
        topCornerMarkup = `
            <g class="iso-quick-add-btn" data-plot-id="${p.id}" title="Quick tasks for ${escapeHtml(p.name)}">
                <circle cx="234" cy="50" r="13" fill="#ffffff" filter="url(#pillShadow-${p.id})" />
                <circle cx="234" cy="50" r="10" fill="#f0fdf4" stroke="#429A4C" stroke-width="2" />
                <circle cx="234" cy="50" r="5" fill="#ffffff" stroke="#429A4C" stroke-width="1.5" />
            </g>
        `;
    }

    const varietyText = p.variety ? escapeHtml(p.variety) : '';
    const nameText = escapeHtml(p.name);

    wrap.innerHTML = `
        <svg viewBox="0 0 280 185" class="iso-tile-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="pillShadow-${p.id}" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="rgba(0,0,0,0.18)"/>
                </filter>
                <linearGradient id="soilGrad-${p.id}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#613F1C"/>
                    <stop offset="45%" stop-color="#4E3315"/>
                    <stop offset="100%" stop-color="#3A220E"/>
                </linearGradient>
                <linearGradient id="grassGrad-${p.id}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${grassTopColor}"/>
                    <stop offset="100%" stop-color="${grassBotColor}"/>
                </linearGradient>
            </defs>

            <ellipse cx="140" cy="154" rx="118" ry="18" fill="rgba(0,0,0,0.14)" />
            <path d="M 17,114 L 263,114 L 263,138 Q 263,146 254,146 L 26,146 Q 17,146 17,138 Z" fill="url(#soilGrad-${p.id})" />
            <path d="M 22,143 Q 140,147 258,143" stroke="rgba(0,0,0,0.22)" stroke-width="2" fill="none" />
            <path d="M 30,36 L 250,36 Q 258,36 260,42 L 263,108 Q 264,114 256,114 L 24,114 Q 16,114 17,108 L 20,42 Q 22,36 30,36 Z" 
                  fill="url(#grassGrad-${p.id})" />
            <path d="M 40,48 L 240,48 Q 245,48 247,53 L 250,98 Q 251,104 244,104 L 36,104 Q 29,104 30,98 L 33,53 Q 35,48 40,48 Z" 
                  stroke="#ffffff" stroke-width="2" stroke-dasharray="5,4" stroke-opacity="0.85" fill="none" />
            <g transform="translate(0, 0)">
                <rect x="68" y="58" width="144" height="36" rx="18" fill="#ffffff" filter="url(#pillShadow-${p.id})" />
                <text x="140" y="${varietyText ? 74 : 81}" text-anchor="middle" fill="#1A1C1E" font-size="14.5" font-weight="800" font-family="'Inter', system-ui, sans-serif" letter-spacing="0.5">${nameText}</text>
                ${varietyText ? `<text x="140" y="87" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="600" font-family="'Inter', system-ui, sans-serif">${varietyText}</text>` : ''}
            </g>
            ${topCornerMarkup}
        </svg>
    `;

    wrap.addEventListener('click', e => {
        const quickAdd = e.target.closest('.iso-quick-add-btn');
        if (quickAdd) {
            e.stopPropagation();
            openPlotTasks(p.id, true);
            return;
        }

        const pin = e.target.closest('.iso-pin-interactive');
        if (pin) {
            e.stopPropagation();
            openPlotTasks(p.id, false);
            return;
        }

        showDetails(p);
    });

    wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showDetails(p);
        }
    });

    wrap.addEventListener('mouseenter', e => showTooltip(e, p, visualStatus));
    wrap.addEventListener('mousemove', e => moveTooltip(e));
    wrap.addEventListener('mouseleave', hideTooltip);

    return wrap;
}

/* ---------- Tooltip Helpers ---------- */

function showTooltip(e, p, visualStatus) {
    if (!isoTooltip) return;

    const daysPlanted = p.days_planted !== null && p.days_planted !== undefined ? `${p.days_planted} days` : 'Not planted';
    const harvestCountdown = p.days_to_harvest !== null && p.days_to_harvest !== undefined
        ? (Number(p.days_to_harvest) >= 0 ? `~${p.days_to_harvest} days left` : `${Math.abs(p.days_to_harvest)} days overdue`)
        : '—';

    isoTooltip.innerHTML = `
        <strong>${escapeHtml(p.name)}</strong>
        <div class="tt-row"><span>Status:</span><span class="tt-val">${visualStatus}</span></div>
        <div class="tt-row"><span>Crop:</span><span class="tt-val">Rice${p.variety ? ' (' + escapeHtml(p.variety) + ')' : ''}</span></div>
        <div class="tt-row"><span>Planted:</span><span class="tt-val">${daysPlanted}</span></div>
        <div class="tt-row"><span>Harvest:</span><span class="tt-val">${harvestCountdown}</span></div>
        <div class="tt-row"><span>Tasks:</span><span class="tt-val">${p.pending_tasks || 0} pending</span></div>
        <div class="tt-row" style="margin-top:6px; font-size:11px; color:#86efac;"><span>💡 Click ＋ to schedule a task</span></div>
    `;

    moveTooltip(e);
    isoTooltip.hidden = false;
}

function moveTooltip(e) {
    if (!isoTooltip || isoTooltip.hidden) return;
    const x = e.clientX + 14;
    const y = e.clientY + 14;
    isoTooltip.style.left = `${Math.min(x, window.innerWidth - 260)}px`;
    isoTooltip.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
}

function hideTooltip() {
    if (isoTooltip) isoTooltip.hidden = true;
}

/* ---------- Enhanced Grid Section ---------- */

function createGridCard(p) {
    const plotTasks = allTasks.filter(t => t.plot_id == p.id && !Number(t.done));
    const visualStatus = getPlotVisualStatus(p);

    const card = document.createElement('div');
    card.className = 'plot-card enhanced-card';
    card.dataset.id = p.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', `${p.name} — ${visualStatus}`);

    let tasksContent = '';
    if (plotTasks.length > 0) {
        const taskItems = plotTasks.slice(0, 3).map(task => {
            const due = getTaskDueMeta(task.task_date);
            const typeIcon = getTaskIcon(task.task_type);
            const typeClass = (task.task_type || 'Other').replace(/\s+/g, '-');
            return `
                <div class="inset-task-item">
                    <div class="task-item-lead">
                        <div class="task-icon-cube ${typeClass}">${typeIcon}</div>
                        <div class="task-item-text">
                            <div class="task-name">${escapeHtml(task.task_type)}</div>
                            <span class="task-due-chip ${due.cls}">
                                <i class="fa-regular fa-clock"></i> ${due.label}
                            </span>
                        </div>
                    </div>
                    <button type="button" class="task-btn-complete" data-task-id="${task.id}" title="Mark task completed">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
            `;
        }).join('');

        const moreLabel = plotTasks.length > 3 
            ? `<div class="grid-tasks-more" data-plot-id="${p.id}">+${plotTasks.length - 3} more pending...</div>` 
            : '';

        tasksContent = `<div class="inset-tasks-list">${taskItems}${moreLabel}</div>`;
    } else {
        tasksContent = `<div class="inset-empty-tasks"><span>All caught up! No pending tasks.</span></div>`;
    }

    card.innerHTML = `
        <div class="task-card-header">
            <div class="task-card-title-row">
                <h3 class="task-card-title">${escapeHtml(p.name)}</h3>
                <span class="plot-status-pill status-${visualStatus.toLowerCase()}">
                    <span class="status-dot"></span>
                    ${visualStatus}
                </span>
            </div>
            <div class="task-card-crop-sub">
                <span class="crop-icon">🌱</span>
                <span>${p.planting_id ? 'Rice' + (p.variety ? ' (' + escapeHtml(p.variety) + ')' : '') : 'No current planting'}</span>
            </div>
        </div>

        <div class="task-card-inset">
            <div class="inset-header">
                <div class="inset-title">
                    <span class="inset-icon-box"><i class="fa-solid fa-list-check"></i></span>
                    <span class="inset-heading">Pending Tasks</span>
                </div>
                <span class="pending-pill ${plotTasks.length ? 'has-pending' : 'all-done'}">
                    ${plotTasks.length ? `${plotTasks.length} Pending` : 'All Done'}
                </span>
            </div>
            ${tasksContent}
        </div>

        <div class="task-card-footer">
            <button type="button" class="btn-card-add-task" data-plot-id="${p.id}">+ Add Task</button>
            <button type="button" class="btn-card-view-tasks" data-plot-id="${p.id}">
                <i class="fa-regular fa-square-check"></i> Tasks (${plotTasks.length})
            </button>
            <button type="button" class="btn-card-details" data-plot-id="${p.id}">
                <i class="fa-solid fa-gear"></i> Details
            </button>
        </div>
    `;

    card.querySelectorAll('.task-btn-complete').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            try {
                await post('Tasks/mark_done.php', { id: btn.dataset.taskId, done: 1 });
                toast('Task completed.');
                loadPlots();
            } catch (err) {
                toast(err.message, true);
            }
        });
    });

    card.querySelector('.btn-card-add-task').addEventListener('click', e => {
        e.stopPropagation();
        openPlotTasks(p.id, true);
    });

    card.querySelector('.btn-card-view-tasks').addEventListener('click', e => {
        e.stopPropagation();
        openPlotTasks(p.id, false);
    });

    const moreBtn = card.querySelector('.grid-tasks-more');
    if (moreBtn) {
        moreBtn.addEventListener('click', e => {
            e.stopPropagation();
            openPlotTasks(p.id, false);
        });
    }

    card.querySelector('.btn-card-details').addEventListener('click', e => {
        e.stopPropagation();
        showDetails(p);
    });

    card.addEventListener('click', e => {
        if (e.target.closest('button, .grid-tasks-more')) return;
        showDetails(p);
    });

    return card;
}

/* ---------- Load and Render Plots & Tasks ---------- */

async function loadPlots() {
    try {
        const [plotsData, tasksData] = await Promise.all([
            api('Plots/get_plots.php'),
            api('Tasks/get_tasks.php')
        ]);

        plots = plotsData.plots || [];
        allTasks = tasksData.tasks || [];

        plotOverview.innerHTML = '';
        if (plots.length === 0) {
            plotOverview.innerHTML = `
                <div class="empty-plots-callout">
                    <p>No plots found. Create your first plot to start tracking crops!</p>
                    <button type="button" class="small-btn" onclick="openPlotModal()">＋ Add Plot</button>
                </div>
            `;
        } else {
            plots.forEach(p => plotOverview.appendChild(createGridCard(p)));
        }

        isometricBoard.innerHTML = '';
        if (plots.length === 0) {
            isometricBoard.innerHTML = `
                <div class="empty-plots-callout">
                    <p>No plots found. Create your first plot to start tracking crops!</p>
                    <button type="button" class="small-btn" onclick="openPlotModal()">＋ Add Plot</button>
                </div>
            `;
        } else {
            plots.forEach(p => isometricBoard.appendChild(createIsoPlotTile(p)));
        }

        if (!detailModal.hidden && currentId) {
            const p = plots.find(x => x.id == currentId);
            p ? showDetails(p) : closeDetails();
        }

        if (!plotTasksModal.hidden && currentTaskId) {
            const p = plots.find(x => x.id == currentTaskId);
            p ? refreshPlotTasks(p.id) : closePlotTasks();
        }
    } catch (e) {
        toast(e.message, true);
    }
}

/* ---------- Modals (Add Plot, Details, Planting, Tasks) ---------- */

function openPlotModal() {
    plotModal.hidden = false;
    plotModal.querySelector('input[name="name"]').focus();
}

function closePlotModal() {
    plotModal.hidden = true;
}

const addPlotBtn = document.getElementById('addPlotBtn');
if (addPlotBtn) addPlotBtn.addEventListener('click', openPlotModal);

const plotClose = document.getElementById('plotClose');
if (plotClose) plotClose.addEventListener('click', closePlotModal);

const plotFormEl = document.getElementById('plotForm');
if (plotFormEl) {
    plotFormEl.addEventListener('submit', async e => {
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
}

function showDetails(p) {
    currentId = p.id;
    document.getElementById('detailName').value = p.name;
    document.getElementById('detailStatus').value = p.status;

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

    const taskCountBadge = document.getElementById('detailTasksBadge');
    if (taskCountBadge) taskCountBadge.textContent = p.pending_tasks || 0;

    detailModal.hidden = false;
}

function closeDetails() {
    detailModal.hidden = true;
    currentId = null;
}

const detailClose = document.getElementById('detailClose');
if (detailClose) detailClose.addEventListener('click', closeDetails);

const detailTasksBtn = document.getElementById('detailTasksBtn');
if (detailTasksBtn) {
    detailTasksBtn.addEventListener('click', () => {
        const id = currentId;
        closeDetails();
        openPlotTasks(id, false);
    });
}

async function savePlot() {
    try {
        await post('Plots/update_plot.php', {
            id: currentId,
            name: document.getElementById('detailName').value,
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

const detailSave = document.getElementById('detailSave');
if (detailSave) detailSave.addEventListener('click', savePlot);

const detailDelete = document.getElementById('detailDelete');
if (detailDelete) detailDelete.addEventListener('click', () => deletePlot(currentId));

const detailPlant = document.getElementById('detailPlant');
if (detailPlant) {
    detailPlant.addEventListener('click', () => {
        const id = currentId;
        closeDetails();
        openPlanting(id);
    });
}

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

const plantClose = document.getElementById('plantClose');
if (plantClose) plantClose.addEventListener('click', closePlanting);

if (plantForm) {
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
}

async function refreshPlotTasks(plotId) {
    try {
        const d = await api('Tasks/get_tasks.php');
        allTasks = d.tasks || [];
        const plotTasks = allTasks.filter(t => t.plot_id == plotId && !Number(t.done));

        const listEl = document.getElementById('plotTasksList');
        const badgeEl = document.getElementById('plotTasksBadge');
        badgeEl.textContent = `${plotTasks.length} Pending`;

        if (plotTasks.length === 0) {
            listEl.innerHTML = `<div class="task-empty-state"><p>All caught up! No pending tasks for this plot.</p></div>`;
            return;
        }

        listEl.innerHTML = '';
        plotTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'task-item';
            const icon = getTaskIcon(task.task_type);
            const iconClass = (task.task_type || 'Other').replace(/\s+/g, '-');
            const due = getTaskDueMeta(task.task_date);

            item.innerHTML = `
                <div class="task-item-left">
                    <div class="task-type-icon ${iconClass}">${icon}</div>
                    <div>
                        <div class="task-item-title">${escapeHtml(task.task_type)}</div>
                        <div class="task-item-due ${due.cls}">${due.label}</div>
                    </div>
                </div>
                <button type="button" class="task-done-btn" data-task-id="${task.id}">✓ Mark Done</button>
            `;

            item.querySelector('.task-done-btn').addEventListener('click', async () => {
                try {
                    await post('Tasks/mark_done.php', { id: task.id, done: 1 });
                    toast('Task marked done.');
                    refreshPlotTasks(plotId);
                    loadPlots();
                } catch (err) {
                    toast(err.message, true);
                }
            });

            listEl.appendChild(item);
        });
    } catch (err) {
        toast(err.message, true);
    }
}

function openPlotTasks(plotId, focusAdd = false) {
    const p = plots.find(x => x.id == plotId);
    if (!p) return;

    currentTaskId = plotId;
    document.getElementById('plotTasksTitle').textContent = p.name;
    const plotIdInput = document.getElementById('quickTaskPlotId');
    if (plotIdInput) plotIdInput.value = p.id;
    document.getElementById('quickTaskDate').value = today();

    refreshPlotTasks(plotId);
    plotTasksModal.hidden = false;
}

function closePlotTasks() {
    plotTasksModal.hidden = true;
    currentTaskId = null;
}

const plotTasksClose = document.getElementById('plotTasksClose');
if (plotTasksClose) plotTasksClose.addEventListener('click', closePlotTasks);

const plotQuickTaskForm = document.getElementById('plotQuickTaskForm');
if (plotQuickTaskForm) {
    plotQuickTaskForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const formData = Object.fromEntries(new FormData(e.target));
            await post('Tasks/add_task.php', formData);
            toast('Task scheduled.');
            refreshPlotTasks(formData.plot_id || currentTaskId);
            loadPlots();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!plotTasksModal.hidden) closePlotTasks();
    else if (!plantModal.hidden) closePlanting();
    else if (!plotModal.hidden) closePlotModal();
    else if (!detailModal.hidden) closeDetails();
});

setViewMode(currentViewMode);
loadPlots();