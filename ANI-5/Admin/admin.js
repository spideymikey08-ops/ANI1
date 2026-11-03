/* ==========================================================================
   admin.js — Administrator Portal Logic
   ========================================================================== */

// 1. Guard check: only admins can access
const currentRole = localStorage.getItem('ani_role') || localStorage.getItem('aniya_role');
const currentUser = localStorage.getItem('ani_user') || localStorage.getItem('aniya_user');

if (!currentUser || currentRole !== 'admin') {
    alert('Access restricted. Please log in with administrator credentials.');
    window.location.href = urlFor('Auth/login.html');
}

// Global cached state
let allPlots = [];
let adminCalDate = new Date();

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
const views = {
    overview:    document.getElementById('viewOverview'),
    calendar:    document.getElementById('viewCalendar'),
    plots:       document.getElementById('viewPlots'),
    tasks:       document.getElementById('viewTasks'),
    inventory:   document.getElementById('viewInventory'),
    reports:     document.getElementById('viewReports'),
    users:       document.getElementById('viewUsers'),
    maintenance: document.getElementById('viewMaintenance')
};

const viewTitles = {
    overview:    ['Administrator Dashboard', 'System overview, farm operations, user accounts, and system maintenance.'],
    calendar:    ['Farm Calendar & Schedules', 'View and schedule farm tasks, plantings, and harvest dates.'],
    plots:       ['Plot Management', 'View, add, edit, or delete rice plots and planting assignments.'],
    tasks:       ['Task Management', 'Schedule farm activities across plots and update completion status.'],
    inventory:   ['Harvest Management', 'View and manage recorded palay harvests.'],
    reports:     ['Finance Management', 'Manage farm income, expenses, and financial reports.'],
    users:       ['User Management', 'View registered users, approve or reject farmer registrations, and manage account access.'],
    maintenance: ['System Maintenance', 'Backup database, view security audit trails, and review system logs.']
};

function switchView(viewName) {
    Object.keys(views).forEach(key => {
        if (views[key]) views[key].hidden = (key !== viewName);
    });

    document.querySelectorAll('.admin-nav button[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewTitles[viewName]) {
        document.getElementById('pageTitle').textContent = viewTitles[viewName][0];
        document.getElementById('pageSubtitle').textContent = viewTitles[viewName][1];
    }

    // Refresh data for the active view
    if (viewName === 'overview') loadOverviewData();
    if (viewName === 'calendar') loadAdminCalendar();
    if (viewName === 'plots') loadAdminPlots();
    if (viewName === 'tasks') loadAdminTasks();
    if (viewName === 'inventory') loadAdminInventory();
    if (viewName === 'reports') loadAdminReports();
    if (viewName === 'users') loadAdminUsers();
    if (viewName === 'maintenance') loadAdminLogs();
}

document.querySelectorAll('.admin-nav button[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.goto));
});

/* ==========================================================================
   Modals Management
   ========================================================================== */
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
}

document.addEventListener('click', e => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
        closeModal(closeBtn.dataset.close);
    }
    if (e.target.classList.contains('modal-overlay')) {
        e.target.hidden = true;
    }
});

/* ==========================================================================
   Helper Formatting
   ========================================================================== */
function money(val) {
    return '₱' + Number(val || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ==========================================================================
   1. OVERVIEW DASHBOARD
   ========================================================================== */
async function loadOverviewData() {
    try {
        const d = await api('Admin/get_admin_data.php');
        const ov = d.overview;

        // Dashboard Statistics
        document.getElementById('statUsers').textContent =
            ov.users.total_users || 0;

        document.getElementById('statPlots').textContent =
            ov.plots.total_plots || 0;

        document.getElementById('statActiveUsers').textContent =
            ov.users.active_users || 0;

        document.getElementById('statPendingUsers').textContent =
            ov.users.pending_users || 0;

    } catch (e) {
        toast(e.message, true);
    }
}

/* ==========================================================================
   2. CALENDAR VIEW
   ========================================================================== */
async function loadAdminCalendar() {
    const y = adminCalDate.getFullYear();
    const m = adminCalDate.getMonth() + 1;

    document.getElementById('calMonthTitle').textContent =
        new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    try {
        const d = await api(`Calendar/get_calendar.php?year=${y}&month=${m}`);
        const events = d.events || [];
        renderAdminCalendarGrid(y, m, events);
    } catch (e) {
        toast('Failed to load calendar events: ' + e.message, true);
    }
}

function renderAdminCalendarGrid(y, m, events) {
    const grid = document.getElementById('adminCalendarGrid');
    grid.innerHTML = '';

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(wd => {
        const h = document.createElement('div');
        h.style.cssText = 'font-weight: 600; text-align: center; padding: 8px; font-size: 12px; color: #6b7a70; background: #f7f9f6; border-radius: 6px; text-transform: uppercase; letter-spacing: .05em;';
        h.textContent = wd;
        grid.appendChild(h);
    });

    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const totalDays = new Date(y, m, 0).getDate();
    const prevMonthDays = new Date(y, m - 1, 0).getDate();

    for (let i = 0; i < 42; i++) {
        let dayNum = i - firstWeekday + 1;
        let inMonth = true;
        let cellYear = y;
        let cellMonth = m;

        if (dayNum < 1) {
            dayNum = prevMonthDays + dayNum;
            inMonth = false;
            cellMonth = m - 1;
            if (cellMonth === 0) { cellMonth = 12; cellYear = y - 1; }
        } else if (dayNum > totalDays) {
            dayNum -= totalDays;
            inMonth = false;
            cellMonth = m + 1;
            if (cellMonth === 13) { cellMonth = 1; cellYear = y + 1; }
        }

        const dateStr = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr);

        const cell = document.createElement('div');
        cell.style.cssText = `min-height: 80px; padding: 6px; border: 1px solid #e3dac5; border-radius: 6px; background: ${inMonth ? '#fff' : '#f9f6ed'}; opacity: ${inMonth ? '1' : '0.6'}; display: flex; flex-direction: column; gap: 4px;`;
        
        const isToday = dateStr === today();
        cell.innerHTML = `
            <div style="font-size: 12px; font-weight: ${isToday ? 'bold' : 'normal'}; color: ${isToday ? '#2b7650' : '#444'};">
                ${dayNum} ${isToday ? '(Today)' : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px;">
                ${dayEvents.map(ev => `
                    <span style="background: ${ev.type === 'watering' ? '#e3f2fd' : '#e8f5e9'}; color: ${ev.type === 'watering' ? '#1565c0' : '#2e7d32'}; padding: 2px 4px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(ev.title)}">
                        ${ev.done ? '<i class="fa-solid fa-check"></i> ' : ''}${escapeHtml(ev.title)}
                    </span>
                `).join('')}
            </div>
        `;
        grid.appendChild(cell);
    }
}

document.getElementById('calPrevMonth').addEventListener('click', () => {
    adminCalDate = new Date(adminCalDate.getFullYear(), adminCalDate.getMonth() - 1, 1);
    loadAdminCalendar();
});
document.getElementById('calNextMonth').addEventListener('click', () => {
    adminCalDate = new Date(adminCalDate.getFullYear(), adminCalDate.getMonth() + 1, 1);
    loadAdminCalendar();
});
document.getElementById('adminAddTaskBtn').addEventListener('click', () => openModal('taskModal'));

/* ==========================================================================
   3. PLOT MANAGEMENT
   ========================================================================== */
async function loadAdminPlots() {
    try {
        const d = await api('Plots/get_plots.php');
        allPlots = d.plots || [];
        populatePlotDropdowns(allPlots);

        const tbody = document.getElementById('plotsTableBody');
        if (!allPlots.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #777;">No rice plots recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = allPlots.map(p => {
            const statusDisplay = (p.status === 'Occupied' || (p.crop_name && p.status !== 'Maintenance')) ? 'Planted' : p.status;
            return `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td><span class="badge rice">${escapeHtml(p.crop_type)}</span></td>
                <td><span class="badge ${statusDisplay.toLowerCase()}">${escapeHtml(statusDisplay)}</span></td>
                <td>${p.crop_name ? escapeHtml(p.crop_name + (p.variety ? ' (' + p.variety + ')' : '')) : '<em>None</em>'}</td>
                <td>${p.planted_date || '—'}</td>
                <td>${p.expected_harvest_date || '—'}</td>
                <td>
                    <div class="btn-group">
                        <button type="button" class="btn-icon" onclick="openPlantModal(${p.id}, '${escapeHtml(p.name)}')">🌱 Plant</button>
                        <button type="button" class="btn-icon danger" onclick="deletePlot(${p.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `; }).join('');
    } catch (e) {
        toast('Failed to load plots: ' + e.message, true);
    }
}

function populatePlotDropdowns(plots) {
    const selects = ['taskPlotSelect', 'harvestPlotSelect', 'editHarvestPlotSelectAdmin', 'financePlotSelect', 'reportFilterPlot'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = (id === 'reportFilterPlot');
        const isFinance = (id === 'financePlotSelect');
        if (isFilter) {
            el.innerHTML = '<option value="0">All Plots &amp; Whole Farm</option><option value="whole_farm">Whole Farm</option>';
        } else if (isFinance) {
            el.innerHTML = '<option value="whole_farm">Whole Farm</option>';
        } else {
            el.innerHTML = '';
        }
        plots.forEach(p => {
            const statusDisplay = (p.status === 'Occupied' || (p.crop_name && p.status !== 'Maintenance')) ? 'Planted' : p.status;
            el.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (${statusDisplay})</option>`;
        });
    });
}



document.getElementById('adminPlotForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const fd = Object.fromEntries(new FormData(e.target));
        await post('Plots/add_plot.php', fd);
        toast('Plot added successfully.');
        closeModal('plotModal');
        e.target.reset();
        loadAdminPlots();
    } catch (err) {
        toast(err.message, true);
    }
});

window.openPlantModal = function(plotId, plotName) {
    document.getElementById('plantPlotId').value = plotId;
    document.getElementById('plantPlotName').textContent = plotName;
    document.getElementById('plantDateInput').value = today();
    openModal('plantPlotModal');
};

document.getElementById('adminPlantForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const fd = Object.fromEntries(new FormData(e.target));
        await post('Plots/add_planting.php', fd);
        toast('Planting recorded and plot marked planted.');
        closeModal('plantPlotModal');
        loadAdminPlots();
    } catch (err) {
        toast(err.message, true);
    }
});

window.deletePlot = async function(plotId) {
    if (!confirm('Are you sure you want to delete this plot and its associated task records?')) return;
    try {
        await post('Plots/delete_plot.php', { id: plotId });
        toast('Plot deleted.');
        loadAdminPlots();
    } catch (err) {
        toast(err.message, true);
    }
};

/* ==========================================================================
   4. TASK MANAGEMENT
   ========================================================================== */
async function loadAdminTasks() {
    try {
        const d = await api('Tasks/get_tasks.php');
        const tasks = d.tasks || [];
        const tbody = document.getElementById('tasksTableBody');

        if (!tasks.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #777;">No tasks scheduled yet.</td></tr>';
            return;
        }

        tbody.innerHTML = tasks.map(t => `
            <tr style="${t.done ? 'opacity: 0.7;' : ''}">
                <td>#${t.id}</td>
                <td><strong>${t.task_date}</strong></td>
                <td>${escapeHtml(t.plot_name)}</td>
                <td><span class="badge" style="background:#e0f2f1; color:#00695c;">${escapeHtml(t.task_type || 'Water')}</span></td>
                <td>
                    <span class="badge ${t.done ? 'done' : 'pending'}">${t.done ? 'Done' : 'Pending'}</span>
                </td>
                <td>${t.created_at ? t.created_at.slice(0, 10) : '—'}</td>
                <td>
                    <div class="btn-group">
                        <button type="button" class="btn-icon" onclick="toggleTaskStatus(${t.id}, ${t.done ? 0 : 1})">
                            ${t.done ? '<i class="fa-solid fa-rotate-left"></i> Reopen' : '<i class="fa-solid fa-check"></i> Mark Done'}
                        </button>
                        <button type="button" class="btn-icon danger" onclick="deleteTask(${t.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        toast('Failed to load tasks: ' + e.message, true);
    }
}



document.getElementById('adminTaskForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const fd = Object.fromEntries(new FormData(e.target));
        await post('Tasks/add_task.php', fd);
        toast('Task scheduled successfully.');
        closeModal('taskModal');
        e.target.reset();
        loadAdminTasks();
    } catch (err) {
        toast(err.message, true);
    }
});

window.toggleTaskStatus = async function(taskId, newDone) {
    try {
        await post('Tasks/mark_done.php', { id: taskId, done: newDone });
        toast(newDone ? 'Task marked done.' : 'Task reopened.');
        loadAdminTasks();
    } catch (err) {
        toast(err.message, true);
    }
};

window.deleteTask = async function(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
        await post('Tasks/delete_task.php', { id: taskId });
        toast('Task deleted.');
        loadAdminTasks();
    } catch (err) {
        toast(err.message, true);
    }
};

/* ==========================================================================
   5. CROP & INVENTORY MANAGEMENT
   ========================================================================== */
async function loadAdminInventory() {
    try {
        const [seedsRes, harvestsRes] = await Promise.all([
            api('Inventory/get_seeds.php'),
            api('Inventory/get_harvests.php')
        ]);

        // Seeds Table
        const seeds = seedsRes.seeds || [];
        const seedsTbody = document.getElementById('seedsTableBody');
        if (!seeds.length) {
            seedsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #777;">No seed varieties registered.</td></tr>';
        } else {
            seedsTbody.innerHTML = seeds.map(s => {
                const isLow = Number(s.quantity_g) <= Number(s.threshold_g);
                return `
                    <tr>
                        <td>#${s.id}</td>
                        <td><strong>${escapeHtml(s.seed_name)}</strong></td>
                        <td><span class="badge rice">${escapeHtml(s.crop_type)}</span></td>
                        <td><strong>${Number(s.quantity_g).toLocaleString()} g</strong></td>
                        <td>${Number(s.threshold_g).toLocaleString()} g</td>
                        <td><span class="badge ${isLow ? 'low' : 'done'}">${isLow ? 'Low Stock' : 'Adequate'}</span></td>
                        <td>
                            <div class="btn-group">
                                <button type="button" class="btn-icon" onclick="promptUpdateSeedStock(${s.id}, ${s.quantity_g}, ${s.threshold_g})">Update Qty</button>
                                <button type="button" class="btn-icon danger" onclick="deleteSeed(${s.id})">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Harvests Table
        const harvests = harvestsRes.harvests || [];
        window.cachedAdminHarvests = harvests;
        const harvestsTbody = document.getElementById('harvestsTableBody');
        if (!harvests.length) {
            harvestsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #777;">No harvest yields recorded yet.</td></tr>';
        } else {
            harvestsTbody.innerHTML = harvests.map(h => `
                <tr>
                    <td>#${h.id}</td>
                    <td><strong>${h.harvest_date}</strong></td>
                    <td>${escapeHtml(h.plot_name)}</td>
                    <td><strong style="color: #27ae60;">${Number(h.quantity).toLocaleString()} kg</strong></td>
                    <td>${escapeHtml(h.notes || '—')}</td>
                    <td>
                        <button type="button" class="btn-icon" onclick="openEditHarvestModal(${h.id})">Edit</button>
                        <button type="button" class="btn-icon danger" onclick="deleteHarvest(${h.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        toast('Failed to load inventory: ' + e.message, true);
    }
}

document.getElementById('openAddSeedModal').addEventListener('click', () => openModal('seedModal'));
document.getElementById('adminSeedForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const fd = Object.fromEntries(new FormData(e.target));
        await post('Inventory/add_seed.php', fd);
        toast('Seed variety added.');
        closeModal('seedModal');
        e.target.reset();
        loadAdminInventory();
    } catch (err) {
        toast(err.message, true);
    }
});

window.promptUpdateSeedStock = async function(id, currentQty, threshold) {
    const newQty = prompt('Enter new seed quantity in grams:', currentQty);
    if (newQty === null || isNaN(Number(newQty))) return;

    try {
        await post('Inventory/update_seed.php', {
            id,
            quantity_g: Number(newQty),
            threshold_g: threshold
        });
        toast('Seed stock updated.');
        loadAdminInventory();
    } catch (e) {
        toast(e.message, true);
    }
};

window.deleteSeed = async function(id) {
    if (!confirm('Delete this seed variety?')) return;
    try {
        await post('Inventory/delete_seed.php', { id });
        toast('Seed removed.');
        loadAdminInventory();
    } catch (e) {
        toast(e.message, true);
    }
};

document.getElementById('openAddHarvestModal').addEventListener('click', () => {
    document.getElementById('harvestDateInput').value = today();
    openModal('harvestModal');
});

document.getElementById('adminHarvestForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const fd = Object.fromEntries(new FormData(e.target));
        await post('Inventory/add_harvest.php', fd);
        toast('Harvest record logged.');
        closeModal('harvestModal');
        e.target.reset();
        loadAdminInventory();
    } catch (err) {
        toast(err.message, true);
    }
});

window.openEditHarvestModal = function(id) {
    const h = (window.cachedAdminHarvests || []).find(x => Number(x.id) === Number(id));
    if (!h) return;
    document.getElementById('editHarvestIdAdmin').value = h.id;
    document.getElementById('editHarvestPlotSelectAdmin').value = h.plot_id;
    document.getElementById('editHarvestDateInputAdmin').value = h.harvest_date;
    document.getElementById('editHarvestQtyInputAdmin').value = h.quantity;
    document.getElementById('editHarvestNotesAdmin').value = h.notes || '';
    openModal('editHarvestModalAdmin');
};

const adminEditHarvestForm = document.getElementById('adminEditHarvestForm');
if (adminEditHarvestForm) {
    adminEditHarvestForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const fd = Object.fromEntries(new FormData(e.target));
            await post('Inventory/update_harvest.php', fd);
            toast('Harvest record updated.');
            closeModal('editHarvestModalAdmin');
            loadAdminInventory();
        } catch (err) {
            toast(err.message, true);
        }
    });
}

window.deleteHarvest = async function(id) {
    if (!confirm('Delete this harvest record?')) return;
    try {
        await post('Inventory/delete_harvest.php', { id });
        toast('Harvest record deleted.');
        loadAdminInventory();
    } catch (e) {
        toast(e.message, true);
    }
};

/* ==========================================================================
   6. INCOME & EXPENSE / REPORTS
   ========================================================================== */
async function loadAdminReports() {
    const type = document.getElementById('reportFilterType').value;
    const start = document.getElementById('reportFilterStart').value;
    const end = document.getElementById('reportFilterEnd').value;
    const plotId = document.getElementById('reportFilterPlot').value;

    const params = new URLSearchParams({
        type,
        start_date: start,
        end_date: end,
        plot_id: plotId,
        format: 'json'
    });

    try {
        const d = await api(`Admin/reports.php?${params.toString()}`);
        const sm = d.summary;
        const txs = d.transactions || [];

        document.getElementById('reportTotalIncome').textContent = money(sm.income);
        document.getElementById('reportTotalExpense').textContent = money(sm.expense);
        document.getElementById('reportNetProfit').textContent = money(sm.net);
        document.getElementById('reportNetProfit').style.color = sm.net >= 0 ? '#27ae60' : '#c0392b';

        const tbody = document.getElementById('reportsTableBody');
        if (!txs.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #777;">No transactions found matching criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = txs.map(t => {
            const isInc = t.transaction_type === 'Income';
            return `
                <tr>
                    <td>${t.transaction_date}</td>
                    <td>${escapeHtml(t.plot_name)}</td>
                    <td><span class="badge ${isInc ? 'done' : 'maintenance'}">${t.transaction_type}</span></td>
                    <td><strong>${escapeHtml(t.category)}</strong></td>
                    <td style="font-weight: bold; color: ${isInc ? '#27ae60' : '#c0392b'};">
                        ${isInc ? '+' : '-'}${money(t.amount)}
                    </td>
                    <td>${escapeHtml(t.notes || '—')}</td>
                    <td>
                        <button type="button" class="btn-icon danger" onclick="deleteTransaction(${t.id})">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        toast('Failed to load report: ' + e.message, true);
    }
}

document.getElementById('applyReportFilters').addEventListener('click', loadAdminReports);
document.getElementById('resetReportFilters').addEventListener('click', () => {
    document.getElementById('reportFilterType').value = 'all';
    document.getElementById('reportFilterStart').value = '';
    document.getElementById('reportFilterEnd').value = '';
    document.getElementById('reportFilterPlot').value = '0';
    loadAdminReports();
});

// Export to Excel (CSV)
document.getElementById('exportExcelBtn').addEventListener('click', () => {
    const type = document.getElementById('reportFilterType').value;
    const start = document.getElementById('reportFilterStart').value;
    const end = document.getElementById('reportFilterEnd').value;
    const plotId = document.getElementById('reportFilterPlot').value;

    const params = new URLSearchParams({
        type,
        start_date: start,
        end_date: end,
        plot_id: plotId,
        format: 'csv'
    });

    window.location.href = urlFor(`Admin/reports.php?${params.toString()}`);
    toast('Preparing Excel CSV report download...');
});

// Print Report / Save as PDF
document.getElementById('printReportBtn').addEventListener('click', () => {
    const printHeader = document.getElementById('printHeader');
    const printMeta = document.getElementById('printMeta');
    const type = document.getElementById('reportFilterType').value;

    printMeta.textContent = `Type: ${type.toUpperCase()} | Generated: ${new Date().toLocaleString()}`;
    printHeader.style.display = 'block';

    window.print();

    setTimeout(() => {
        printHeader.style.display = 'none';
    }, 1000);
});

// Add Finance Transaction Modal
document.getElementById('openAddFinanceModal').addEventListener('click', () => {
    document.getElementById('financeDateInput').value = today();
    openModal('financeModal');
});

// Dynamic category change for finance modal
document.getElementById('finTypeSelect').addEventListener('change', e => {
    const sel = document.getElementById('finCategorySelect');
    if (e.target.value === 'Income') {
        sel.innerHTML = `
            <option value="Harvest Sale">Harvest Sale</option>
            <option value="Other Income">Other Income</option>
        `;
    } else {
        sel.innerHTML = `
            <option value="Seed">Seed</option>
            <option value="Fertilizer">Fertilizer</option>
            <option value="Pesticide">Pesticide</option>
            <option value="Labor">Labor</option>
            <option value="Fuel">Fuel</option>
            <option value="Other">Other</option>
        `;
    }
});

document.getElementById('adminFinanceForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const fd = Object.fromEntries(new FormData(e.target));
        await post('Finance/add_finance.php', fd);
        toast('Financial transaction saved.');
        closeModal('financeModal');
        e.target.reset();
        loadAdminReports();
    } catch (err) {
        toast(err.message, true);
    }
});

window.deleteTransaction = async function(id) {
    if (!confirm('Delete this finance transaction?')) return;
    try {
        await post('Finance/delete_finance.php', { id });
        toast('Transaction deleted.');
        loadAdminReports();
    } catch (e) {
        toast(e.message, true);
    }
};

/* ==========================================================================
   7. USER MANAGEMENT
   ========================================================================== */
async function loadAdminUsers() {
    try {
        const d = await api('Admin/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list' })
        });

        const users = d.users || [];
        const tbody = document.getElementById('usersTableBody');

        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #777;">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            let statusActions = '';

            if (u.role === 'user' && u.status === 'pending') {
                statusActions = `
                    <button type="button" class="btn-icon"
                        onclick="reviewFarmerAccount(${u.id}, 'approve')">
                        Approve
                    </button>
                    <button type="button" class="btn-icon danger"
                        onclick="reviewFarmerAccount(${u.id}, 'reject')">
                        Reject
                    </button>
                `;
            } else if (u.role === 'user' &&
                ['active', 'deactivated'].includes(u.status)) {
                statusActions = `
                    <button type="button" class="btn-icon"
                        onclick="toggleUserStatus(${u.id})">
                        ${u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                `;
            }

            return `
                <tr>
                    <td>#${u.id}</td>
                    <td><strong>${escapeHtml(u.full_name)}</strong></td>
                    <td><code>${escapeHtml(u.username)}</code></td>
                    <td>${escapeHtml(u.email || '—')}</td>
                    <td>${escapeHtml(u.phone || '—')}</td>
                    <td><span class="badge-role ${u.role}">${escapeHtml(u.role)}</span></td>
                    <td><span class="badge-status ${u.status}">${escapeHtml(u.status)}</span></td>
                    <td>${u.created_at ? u.created_at.slice(0, 10) : '—'}</td>
                    <td>
                        <div class="btn-group">
                            <button type="button" class="btn-icon"
                                onclick='openEditUserModal(${JSON.stringify(u)})'>
                                Edit
                            </button>

                            ${statusActions}

                            <button type="button" class="btn-icon"
                                onclick="openResetPasswordModal(${u.id}, '${escapeHtml(u.username)}')">
                                Pass
                            </button>

                            <button type="button" class="btn-icon danger"
                                onclick="deleteUserAccount(${u.id})">
                                Del
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        toast('Failed to load users: ' + e.message, true);
    }
}

document.getElementById('openAddUserModal').addEventListener('click', () => {
    document.getElementById('userForm').reset();
    document.getElementById('userFormAction').value = 'create';
    document.getElementById('userFormId').value = '';
    document.getElementById('userModalTitle').textContent = 'Add New User';
    document.getElementById('userPasswordGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    openModal('userModal');
});

window.openEditUserModal = function(u) {
    document.getElementById('userFormAction').value = 'update';
    document.getElementById('userFormId').value = u.id;
    document.getElementById('userFullName').value = u.full_name;
    document.getElementById('userEmail').value = u.email || '';
    document.getElementById('userPhone').value = u.phone || '';
    document.getElementById('userUsername').value = u.username;
    document.getElementById('userRole').value = u.role;
    document.getElementById('userModalTitle').textContent = `Edit User (#${u.id})`;

    // Hide password on edit (use dedicated reset modal instead)
    document.getElementById('userPasswordGroup').style.display = 'none';
    document.getElementById('userPassword').required = false;

    openModal('userModal');
};

document.getElementById('userForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    try {
        const r = await post('Admin/users.php', data);
        toast(r.message || 'User saved.');
        closeModal('userModal');
        loadAdminUsers();
        loadOverviewData();
    } catch (err) {
        toast(err.message, true);
    }
});

window.toggleUserStatus = async function(id) {
    try {
        const r = await post('Admin/users.php', { action: 'toggle_status', id });
        toast(r.message);
        loadAdminUsers();
        loadOverviewData();
    } catch (err) {
        toast(err.message, true);
    }
};

window.reviewFarmerAccount = async function(id, decision) {
    const actionText = decision === 'approve' ? 'approve' : 'reject';

    if (!confirm(`Are you sure you want to ${actionText} this farmer account?`)) {
        return;
    }

    try {
        const r = await post('Admin/users.php', {
            action: decision,
            id: id
        });

        toast(r.message || `Farmer account ${actionText}d successfully.`);
        loadAdminUsers();
        loadOverviewData();
    } catch (err) {
        toast(err.message, true);
    }
};

window.openResetPasswordModal = function(userId, username) {
    document.getElementById('resetPassUserId').value = userId;
    document.getElementById('resetPassUsername').textContent = username;
    document.getElementById('resetPassInput').value = '';
    openModal('resetPassModal');
};

document.getElementById('resetPassForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
        const r = await post('Admin/users.php', data);
        toast(r.message);
        closeModal('resetPassModal');
    } catch (err) {
        toast(err.message, true);
    }
});

window.deleteUserAccount = async function(id) {
    if (!confirm('Permanently delete this user account?')) return;
    try {
        const r = await post('Admin/users.php', { action: 'delete', id });
        toast(r.message);
        loadAdminUsers();
        loadOverviewData();
    } catch (err) {
        toast(err.message, true);
    }
};

/* ==========================================================================
   8. SYSTEM MAINTENANCE
   ========================================================================== */
async function loadAdminLogs() {
    try {
        const d = await api('Admin/logs.php');
        const logs = d.logs || [];
        const box = document.getElementById('fullAuditLogs');

        if (!logs.length) {
            box.innerHTML = '<p style="padding: 15px; color: #777;">No activity logs recorded yet.</p>';
            return;
        }

        box.innerHTML = logs.map(l => `
            <div class="log-item">
                <div>
                    <span class="log-user">${escapeHtml(l.username)}</span>
                    <span style="font-size: 11px; color: #888;">(${escapeHtml(l.ip_address || '127.0.0.1')})</span>:
                    <span class="log-action">${escapeHtml(l.action)}</span>
                    <div style="font-size: 12px; color: #555; margin-top: 2px;">${escapeHtml(l.details || '')}</div>
                </div>
                <span class="log-time">${l.created_at}</span>
            </div>
        `).join('');
    } catch (e) {
        toast('Failed to load logs: ' + e.message, true);
    }
}

document.getElementById('clearLogsBtn').addEventListener('click', async () => {
    if (!confirm('Clear all system audit logs?')) return;
    try {
        const r = await post('Admin/logs.php', { action: 'clear' });
        toast(r.message);
        loadAdminLogs();
    } catch (e) {
        toast(e.message, true);
    }
});

document.getElementById('downloadBackupBtn').addEventListener('click', () => {
    document.getElementById('backupConfirmMsg').hidden = false;
    setTimeout(() => {
        document.getElementById('backupConfirmMsg').hidden = true;
    }, 4000);
});

/* ==========================================================================
   Logout
   ========================================================================== */
document.getElementById('logoutBtn').addEventListener('click', async e => {
    e.preventDefault();
    try {
        await post('Auth/logout.php', {});
    } catch (err) { /* ignore */ }

    localStorage.removeItem('ani_user');
    localStorage.removeItem('ani_role');
    localStorage.removeItem('aniya_user');
    localStorage.removeItem('aniya_role');
    window.location.href = urlFor('Auth/login.html');
});

// Initial boot
loadOverviewData();
loadAdminPlots(); // pre-load plots for dropdowns
