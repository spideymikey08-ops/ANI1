/* ==========================================================================
   layout.js — sidebar, logout and "current user" for every logged-in page
   Needs core.js. The sidebar markup lives in partials/sidebar.html.
   ========================================================================== */

// Replace the whole old loadSidebar() function in assets/js/layout.js with this.
// (Keep escapeHtml(), the logout code and the loadSidebar(); line at the bottom.)

const SIDEBAR_CACHE_KEY = 'aniya_sidebar_html';

// Everything that needs the sidebar to exist: links, active item, admin link, user box
function setupSidebar(slot) {
    slot.querySelectorAll('nav a[data-path]').forEach(link => {
        link.href = urlFor(link.dataset.path);
        link.classList.toggle('active', link.dataset.page === page);
    });

    const role = localStorage.getItem('aniya_role');
    const adminLink = slot.querySelector('#adminSidebarLink');
    if (adminLink && role === 'admin') {
        adminLink.style.display = 'flex';
    }

    const name = localStorage.getItem('aniya_user');
    const userBox = document.getElementById('sidebarUser');
    if (name && userBox) {
        const userIcon = page === 'inventory'
            ? '<span class="user-avatar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>'
            : '👤';
        userBox.innerHTML = `${userIcon} ${escapeHtml(name)} ${role === 'admin' ? '<span style="background: #c99738; color: #123728; padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: bold; margin-left: 4px;">Admin</span>' : ''}`;
        userBox.hidden = false;
    }

    // If an Admin is on a farmer page, show an easy shortcut to the Admin Dashboard
    if (role === 'admin' && page !== 'admin') {
        const header = document.querySelector('.page-header');
        if (header && !document.getElementById('adminSwitchBanner')) {
            const banner = document.createElement('div');
            banner.id = 'adminSwitchBanner';
            banner.style.cssText = 'background: #fdf6e7; border: 1px solid #ebd39b; color: #7d570e; padding: 10px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';
            banner.innerHTML = `
                <span>🛡️ <strong>Administrator Mode Active:</strong> You are currently viewing the Farmer interface.</span>
                <a href="${urlFor('Admin/index.html')}" style="background: #c99738; color: #123728; padding: 5px 14px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;">
                    Open Admin Dashboard &rarr;
                </a>
            `;
            header.insertAdjacentElement('afterend', banner);
        }
    }
}

async function loadSidebar() {
    const slot = document.getElementById('sidebar');
    if (!slot) return;

    // 1) Show the remembered sidebar immediately (no waiting, no pop-in)
    let cached = null;
    try { cached = sessionStorage.getItem(SIDEBAR_CACHE_KEY); } catch (e) { /* ignore */ }

    if (cached) {
        slot.innerHTML = cached;
        setupSidebar(slot);
    }

    // 2) Quietly check for a newer version in the background
    try {
        const res = await fetch(urlFor('partials/sidebar.html?v=' + Date.now()));
        if (!res.ok) throw new Error('Sidebar not found');
        const fresh = await res.text();

        try { sessionStorage.setItem(SIDEBAR_CACHE_KEY, fresh); } catch (e) { /* ignore */ }

        // Only redraw if it actually changed (or if nothing was cached yet)
        if (fresh !== cached) {
            slot.innerHTML = fresh;
            setupSidebar(slot);
        }
    } catch (e) {
        if (!cached) toast('Could not load the menu.', true);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Logout (the button is inside the header)
document.addEventListener('click', async e => {
    if (!e.target.closest('#logoutBtn')) return;
    e.preventDefault();

    try {
        await post('Auth/logout.php', {});
    } catch (err) { /* already logged out */ }

    localStorage.removeItem('aniya_user');
    localStorage.removeItem('aniya_role');
    window.location.href = urlFor('Auth/login.html');
});

loadSidebar();
