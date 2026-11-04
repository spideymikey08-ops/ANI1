/* ==========================================================================
   admin.js — Administrator Portal Logic
   (Task, Harvest, Finance and Calendar management removed)
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

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
const views = {
    overview:    document.getElementById('viewOverview'),
    plots:       document.getElementById('viewPlots'),
    users:       document.getElementById('viewUsers'),
    maintenance: document.getElementById('viewMaintenance')
};

const viewTitles = {
    overview:    ['Administrator Dashboard', 'System overview, user accounts, and system maintenance.'],
    plots:       ['Plot Management', 'View, add, edit, or delete rice plots and planting assignments.'],
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
    if (viewName === 'plots') loadAdminPlots();
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
   2. PLOT MANAGEMENT
   ========================================================================== */
async function loadAdminPlots() {
    try {
        const d = await api('Plots/get_plots.php');
        allPlots = d.plots || [];

        const tbody = document.getElementById('plotsTableBody');
        if (!allPlots.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #777;">No rice plots recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = allPlots.map((p, i) => {
            const statusDisplay = (p.status === 'Occupied' || (p.crop_name && p.status !== 'Maintenance')) ? 'Planted' : p.status;
            return `
            <tr>
                <td><strong>${i + 1}</strong></td>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${escapeHtml(p.owner || '—')}</td>
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
    if (!confirm('Are you sure you want to delete this plot and its associated records?')) return;
    try {
        await post('Plots/delete_plot.php', { id: plotId });
        toast('Plot deleted.');
        loadAdminPlots();
    } catch (err) {
        toast(err.message, true);
    }
};

/* ==========================================================================
   3. USER MANAGEMENT
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

        tbody.innerHTML = users.map((u, i) => {
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
                    <td>${users.length - i}</td>
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
    document.getElementById('userModalTitle').textContent = `Edit User`;

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
   4. SYSTEM MAINTENANCE
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
loadAdminPlots();