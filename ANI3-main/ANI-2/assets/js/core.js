/* ==========================================================================
   core.js — shared helpers used by every page
   Load this script first on every page.
   ========================================================================== */

// Project root = two folders above this file (assets/js/ -> project root)
const ROOT = new URL('../../', document.currentScript.src).href;

// <body data-page="..."> tells us which page we are on
const page = document.body.dataset.page;

/* ---------- URLs & API ---------- */

function urlFor(path) {
    const [p, q] = path.split('?');
    const enc = p.split('/').map(encodeURIComponent).join('/');
    return ROOT + enc + (q ? '?' + q : '');
}

async function api(url, options = {}) {
    const r = await fetch(urlFor(url), options);
    let x;

    try {
        x = await r.json();
    } catch (e) {
        throw new Error('Invalid server response');
    }

    if (r.status === 401) {
        window.location.href = urlFor('Auth/login.html');
        throw new Error('Please log in.');
    }

    if (!r.ok || x.success === false) {
        throw new Error(x.message || 'Request failed');
    }

    return x;
}

function post(file, data) {
    return api(file, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

/* ---------- Toast ---------- */

let toastTimer;

function toast(msg, error = false) {
    const t = document.getElementById('toast');
    if (!t) return;

    t.textContent = msg;
    t.className = 'toast show' + (error ? ' error' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

/* ---------- Dates ---------- */

// Local date as YYYY-MM-DD.
// (toISOString() is UTC, which gives *yesterday* in the Philippines before 8 AM.)
function today() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function setDefaultDates() {
    document.querySelectorAll('input[type=date]').forEach(x => {
        if (!x.value) x.value = today();
    });
}

/* ---------- Templates (HTML lives in the .html files, not in JS) ---------- */

// Clone the first element inside <template id="...">.
function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

// Set text on every [data-field="key"] inside el (and on el itself).
// Uses textContent, so values are always safe to display.
function fill(el, values) {
    for (const [key, value] of Object.entries(values)) {
        const text = value ?? '';
        const targets = [...el.querySelectorAll(`[data-field="${key}"]`)];
        if (el.matches(`[data-field="${key}"]`)) targets.push(el);
        targets.forEach(n => { n.textContent = text; });
    }
    return el;
}

// Fill a [data-badge="key"] element with text and a CSS class (e.g. "occupied").
function setBadge(el, key, text, cls = text) {
    const badge = el.querySelector(`[data-badge="${key}"]`);
    if (!badge) return;
    badge.textContent = text;
    badge.classList.add(String(cls).toLowerCase());
}

// Replace the children of a container with the given nodes.
function render(container, nodes) {
    container.replaceChildren(...nodes);
}

// Fill a <select> with plots.
function fillPlotSelect(select, plots, placeholder = null) {
    const options = plots.map(p => new Option(`${p.name} (${p.crop_type})`, p.id));
    if (placeholder !== null) options.unshift(new Option(placeholder, ''));
    select.replaceChildren(...options);
}

/* ---------- Formatting ---------- */

function number(value) {
    return Number(value).toLocaleString();
}

/* ---------- Shared UI builders ---------- */

// A plot summary card. Needs <template id="tpl-plot-card"> on the page
// (used by the Dashboard and Plots pages).
function plotCard(p) {
    const el = cloneTemplate('tpl-plot-card');
    fill(el, {
        name: p.name,
        crop: p.crop_name || 'No current planting'
    });
    setBadge(el, 'crop', p.crop_type);
    setBadge(el, 'status', p.status);
    return el;
}

/* ==========================================================================
   AUTO THEME + ICONS  (paste at the very bottom of assets/js/core.js)
   - loads Inter font, Font Awesome and theme.css on every page
   - replaces emojis with Font Awesome icons (also for content built by JS)
   ========================================================================== */
(function () {
    // 1) Load font, icons and theme
    const links = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
        ROOT + 'assets/css/theme.css?v=1'
    ];
    links.forEach(href => {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
    });

    // 2) Emoji -> icon map (add more lines here any time)
    const MAP = {
        '👤': 'fa-circle-user',
        '🚪': 'fa-right-from-bracket',
        '🌱': 'fa-seedling',
        '🌿': 'fa-leaf',
        '🌾': 'fa-wheat-awn',
        '🫘': 'fa-seedling',
        '🧺': 'fa-wheat-awn',
        '💾': 'fa-floppy-disk',
        '📊': 'fa-chart-pie',
        '📅': 'fa-calendar-days',
        '📋': 'fa-list-check',
        '💰': 'fa-peso-sign',
        '👥': 'fa-users',
        '⚙': 'fa-gear',
        '🛡': 'fa-shield-halved',
        '📄': 'fa-file-lines',
        '🖨': 'fa-print',
        '✏': 'fa-pen',
        '🗑': 'fa-trash',
        '🔑': 'fa-key',
        '💧': 'fa-droplet',
        '✅': 'fa-circle-check',
        '✓': 'fa-check',
        '✕': 'fa-xmark',
        '⚠': 'fa-triangle-exclamation',
        '🔔': 'fa-bell',
        '🔍': 'fa-magnifying-glass',
        '📦': 'fa-box-open',
        '🚜': 'fa-tractor',
        '☀': 'fa-sun',
        '🌧': 'fa-cloud-rain',
        '＋': 'fa-plus',
        '💸': 'fa-money-bill-wave',
        '💵': 'fa-money-bill-wave',
        '💴': 'fa-money-bill-wave',
        '💳': 'fa-credit-card',
        '🧪': 'fa-flask',
        '🧴': 'fa-spray-can',
        '🐛': 'fa-bug',
        '🪲': 'fa-bug',
        '👨‍🌾': 'fa-person-digging',
        '👩‍🌾': 'fa-person-digging',
        '🧑‍🌾': 'fa-person-digging',
        '👷': 'fa-helmet-safety',
        '⛽': 'fa-gas-pump',
        '🧰': 'fa-toolbox',
        '🗃': 'fa-box-archive',
        '💬': 'fa-comment-dots',
        '🤖': 'fa-robot',
        '↻': 'fa-rotate-right'
    };

    const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
    const RE = new RegExp('(' + keys.join('|') + ')\\uFE0F?', 'g');
    const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'TITLE', 'CODE', 'PRE', 'NOSCRIPT']);

    function swapNode(textNode) {
        const text = textNode.nodeValue;
        RE.lastIndex = 0;
        if (!RE.test(text)) return;
        RE.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = RE.exec(text)) !== null) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const i = document.createElement('i');
            i.className = 'fa-solid ' + MAP[m[1]];
            frag.appendChild(i);
            last = m.index + m[0].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        textNode.parentNode.replaceChild(frag, textNode);
    }

    function scan(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode;
                return p && !SKIP.has(p.nodeName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(swapNode);
    }

    // 3) Run now and whenever JS adds new content
    let queued = false;
    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            scan(document.body);
        });
    }

    function start() {
        scan(document.body);
        new MutationObserver(schedule).observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();

/* ==========================================================================
   SIDEBAR SLIDING HIGHLIGHT v3  (paste at the very bottom of assets/js/core.js)
   - the lighter box starts gliding the moment you click a menu item
   - the next page opens right after, with the box already in place
   ========================================================================== */
(function () {
    const KEY = 'aniyaNavPos';

    const style = document.createElement('style');
    style.textContent = `
        @media (min-width: 901px) {
            .sidebar nav { position: relative; }
            .sidebar nav a,
            .sidebar nav button { position: relative; z-index: 1; }

            .sidebar nav a.active,
            .sidebar nav button.active {
                background: transparent !important;
                box-shadow: none !important;
            }

            .nav-indicator {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 0;
                border-radius: 10px;
                background: rgba(126, 211, 155, .18);
                box-shadow: inset 3px 0 0 #c99738;
                z-index: 0;
                pointer-events: none;
                will-change: transform;
            }
            .nav-indicator.animate {
                transition: transform .28s cubic-bezier(.22, .9, .3, 1.1),
                            height .2s ease;
            }
        }
        @media (max-width: 900px) {
            .nav-indicator { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
            .nav-indicator.animate { transition: none; }
        }
    `;
    document.head.appendChild(style);

    let indicator = null;
    let last = null;
    let ready = false;

    function save(pos) {
        try { sessionStorage.setItem(KEY, JSON.stringify(pos)); } catch (e) { /* ignore */ }
    }

    function load() {
        try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; }
    }

    function move(item) {
        const pos = { top: item.offsetTop, height: item.offsetHeight };
        save(pos);
        if (last && last.top === pos.top && last.height === pos.height) return;
        indicator.style.height = pos.height + 'px';
        indicator.style.transform = 'translateY(' + pos.top + 'px)';
        last = pos;
    }

    function place() {
        if (window.innerWidth <= 900) return;

        const nav = document.querySelector('.sidebar nav');
        if (!nav) return;

        const active = nav.querySelector('a.active, button.active');
        if (!active) return;

        if (!indicator || !nav.contains(indicator)) {
            ready = false;
            indicator = document.createElement('div');
            indicator.className = 'nav-indicator';
            nav.insertBefore(indicator, nav.firstChild);

            const from = load() || { top: active.offsetTop, height: active.offsetHeight };
            indicator.style.height = from.height + 'px';
            indicator.style.transform = 'translateY(' + from.top + 'px)';
            last = from;

            void indicator.offsetWidth; // lock in the start position

            // no waiting: switch on the animation and glide right away
            ready = true;
            indicator.classList.add('animate');
            void indicator.offsetWidth;
            move(active);
            return;
        }

        if (!ready) return;
        move(active);
    }

    // Farmer pages: glide on click, THEN open the page
    document.addEventListener('click', function (e) {
        const a = e.target.closest('.sidebar nav a[data-path]');
        if (!a || !indicator || !ready) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.target === '_blank' || a.classList.contains('active')) return;

        const href = a.href;
        if (!href) return;

        e.preventDefault();
        move(a); // box starts sliding to the clicked item now
        setTimeout(function () { window.location.href = href; }, 200);
    });

    let queued = false;
    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
            queued = false;
            place();
        });
    }

    function start() {
        place();
        new MutationObserver(schedule).observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        window.addEventListener('resize', schedule);
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();