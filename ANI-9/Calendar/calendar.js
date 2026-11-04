/* Calendar page (needs core.js + layout.js; markup is in calendar.html) */

let calDate = new Date();
let calendarEvents = [];
let selectedDate = today();

const grid = document.getElementById('calendar');
const checklist = document.getElementById('checklist');

const KIND_LABELS = {
    expected: 'Expected harvest',
    harvest: 'Harvest recorded'
};

const isDone = e => Number(e.done) === 1;

function pad(n) {
    return String(n).padStart(2, '0');
}

/* ---------- Month navigation ---------- */

function moveMonth(n) {
    // Always step from the 1st so Jan 31 + 1 month lands in February, not March.
    calDate = new Date(calDate.getFullYear(), calDate.getMonth() + n, 1);
    loadCal();
}

function goToday() {
    calDate = new Date();
    selectedDate = today();
    loadCal();
}

document.getElementById('prevMonth').addEventListener('click', () => moveMonth(-1));
document.getElementById('nextMonth').addEventListener('click', () => moveMonth(1));
document.getElementById('todayBtn').addEventListener('click', goToday);

/* ---------- Month grid ---------- */

function dayCell(date, dayNumber, inMonth) {
    const cell = cloneTemplate('tpl-day');
    const isToday = date === today();

    cell.dataset.date = date;
    cell.setAttribute('aria-label', date);
    cell.classList.toggle('other', !inMonth);
    cell.classList.toggle('today', isToday);
    cell.classList.toggle('selected', date === selectedDate);

    const numberBox = cell.querySelector('.day-number');
    if (isToday) {
        fill(cell, { 'today-number': dayNumber });
    } else {
        numberBox.textContent = dayNumber;
    }

    const eventsBox = cell.querySelector('.day-events');
    calendarEvents
        .filter(e => e.date === date)
        .forEach(e => {
            const chip = fill(cloneTemplate('tpl-day-event'), { title: e.title });
            chip.title = e.title;
            chip.classList.add(e.type);
            chip.classList.toggle('completed', isDone(e));
            eventsBox.appendChild(chip);
        });

    return cell;
}

function buildGrid(y, m) {
    const first = new Date(y, m - 1, 1).getDay();      // weekday of the 1st
    const days = new Date(y, m, 0).getDate();           // days in this month
    const prev = new Date(y, m - 1, 0).getDate();       // days in previous month
    const cells = [];

    for (let i = 0; i < 42; i++) {
        let day = i - first + 1;
        let cellYear = y;
        let cellMonth = m;
        let inMonth = true;

        if (day < 1) {
            day = prev + day;
            inMonth = false;
            cellMonth = m - 1;
            if (cellMonth === 0) { cellMonth = 12; cellYear = y - 1; }
        } else if (day > days) {
            day -= days;
            inMonth = false;
            cellMonth = m + 1;
            if (cellMonth === 13) { cellMonth = 1; cellYear = y + 1; }
        }

        const date = `${cellYear}-${pad(cellMonth)}-${pad(day)}`;
        cells.push(dayCell(date, day, inMonth));
    }

    // keep the weekday header row, replace only the day cells
    grid.querySelectorAll('.day').forEach(d => d.remove());
    grid.append(...cells);
}

async function loadCal() {
    const y = calDate.getFullYear();
    const m = calDate.getMonth() + 1;
    const notice = document.getElementById('calNotice');

    try {
        const d = await api(`Calendar/get_calendar.php?year=${y}&month=${m}`);
        calendarEvents = d.events || [];

        document.getElementById('monthTitle').textContent =
            new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

        notice.hidden = true;
        buildGrid(y, m);
    } catch (e) {
        notice.textContent = e.message;
        notice.hidden = false;
    }

    renderDayTasks(selectedDate);
}

/* ---------- Selecting a date ---------- */

function selectDate(date) {
    selectedDate = date;

    const [year, month] = date.split('-').map(Number);

    // Clicked a greyed-out day from another month: jump to that month
    if (calDate.getFullYear() !== year || calDate.getMonth() !== month - 1) {
        calDate = new Date(year, month - 1, 1);
        loadCal();
        return;
    }

    grid.querySelectorAll('.day').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.date === date);
    });

    renderDayTasks(date);

    document.getElementById('dayTasksCard')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

grid.addEventListener('click', e => {
    const cell = e.target.closest('.day');
    if (cell) selectDate(cell.dataset.date);
});

/* ---------- Day details ---------- */

function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function checklistItem(task) {
    const done = isDone(task);
    const item = fill(cloneTemplate('tpl-checklist-item'), {
        title: task.title,
        crop: task.crop_type || 'Crop',
        status: done ? 'Completed' : 'Pending'
    });

    item.dataset.id = task.id;
    item.classList.toggle('checked', done);
    item.querySelector('input').checked = done;
    return item;
}

function renderDayTasks(date) {
    const pretty = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    const events = calendarEvents.filter(e => e.date === date);
    const tasks = events.filter(e => e.type === 'watering');
    const others = events.filter(e => e.type !== 'watering');
    const remaining = tasks.filter(e => !isDone(e)).length;

    document.getElementById('selectedDateTitle').textContent = `Tasks for ${pretty}`;
    document.getElementById('selectedDateSubtitle').textContent = tasks.length
        ? `${plural(remaining, 'task')} remaining · task types are shown on the calendar`
        : 'No farm tasks scheduled for this day.';
    document.getElementById('taskCount').textContent = plural(tasks.length, 'task');

    // checklist, or the "nothing to check off" message
    render(checklist, tasks.map(checklistItem));
    checklist.hidden = !tasks.length;
    document.getElementById('checklistEmpty').hidden = tasks.length > 0;

    // harvests etc.
    document.getElementById('otherEvents').hidden = !others.length;
    render(
        document.getElementById('otherEventsList'),
        others.map(e => {
            const row = fill(cloneTemplate('tpl-scheduled-event'), {
                title: e.title,
                kind: KIND_LABELS[e.type] || e.type
            });
            row.classList.add(e.type);
            return row;
        })
    );
}

/* ---------- Ticking a watering task ---------- */

async function toggleWateringTask(id, done) {
    try {
        const result = await post('Tasks/mark_done.php', { id, done: done ? 1 : 0 });

        const event = calendarEvents.find(e => Number(e.id) === Number(id) && e.type === 'watering');
        if (event) event.done = done ? 1 : 0;

        renderDayTasks(selectedDate);
        loadCal();
        toast(result.message || 'Task updated.');
    } catch (e) {
        toast(e.message, true);
        renderDayTasks(selectedDate);
    }
}

checklist.addEventListener('change', e => {
    if (e.target.dataset.action !== 'toggle') return;
    toggleWateringTask(e.target.closest('.checklist-item').dataset.id, e.target.checked);
});

loadCal();
