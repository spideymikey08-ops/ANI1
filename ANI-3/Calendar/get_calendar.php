<?php

require __DIR__ . '/../config.php';

$month = (int)($_GET['month'] ?? date('n'));
$year = (int)($_GET['year'] ?? date('Y'));

if (
    $month < 1 ||
    $month > 12 ||
    $year < 2000 ||
    $year > 2100
) {
    json_error('Invalid month.');
}

$firstDay = sprintf(
    '%04d-%02d-01',
    $year,
    $month
);

// The 42-day calendar grid in calendar.js displays edge days from adjacent months.
// Start from Sunday on or before the 1st and query the full 42-cell view (6 weeks).
$firstWeekday = (int)date('w', strtotime($firstDay));
$start = date('Y-m-d', strtotime("-{$firstWeekday} days", strtotime($firstDay)));
$end = date('Y-m-d', strtotime('+41 days', strtotime($start)));

$s = $pdo->prepare(
    "SELECT
        w.id,
        w.task_date date,
        'watering' type,
        w.task_type,
        CONCAT(w.task_type, ' — ', p.name) title,
        p.crop_type,
        w.done
     FROM watering_tasks w
     JOIN plots p ON p.id=w.plot_id
     WHERE w.task_date BETWEEN ? AND ?
       AND p.crop_type='Rice'"
);

$s->execute([
    $start,
    $end
]);

$events = $s->fetchAll();

$s = $pdo->prepare(
    "SELECT
        pl.id,
        pl.expected_harvest_date date,
        'expected' type,
        CONCAT('Expected Harvest — ',p.name) title,
        p.crop_type
     FROM plantings pl
     JOIN plots p ON p.id=pl.plot_id
     WHERE pl.expected_harvest_date BETWEEN ? AND ?
       AND p.crop_type='Rice'"
);

$s->execute([
    $start,
    $end
]);

$events = array_merge(
    $events,
    $s->fetchAll()
);

$s = $pdo->prepare(
    "SELECT
        h.id,
        h.harvest_date date,
        'harvest' type,
        CONCAT('Harvest — ',p.name) title,
        p.crop_type
     FROM harvests h
     JOIN plots p ON p.id=h.plot_id
     WHERE h.harvest_date BETWEEN ? AND ?
       AND p.crop_type='Rice'"
);

$s->execute([
    $start,
    $end
]);

$events = array_merge(
    $events,
    $s->fetchAll()
);

json_ok([
    'year' => $year,
    'month' => $month,
    'events' => $events
]);