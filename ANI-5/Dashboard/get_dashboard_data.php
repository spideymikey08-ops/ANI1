<?php

require __DIR__ . '/../config.php';

$today = date('Y-m-d');
$weekEnd = date(
    'Y-m-d',
    strtotime('+6 days')
);

$stats = [
    'rice' => (int)$pdo
        ->query(
            "SELECT COUNT(*)
             FROM plots
             WHERE crop_type='Rice'"
        )
        ->fetchColumn(),

    'tasks_today' => 0,
];

$s = $pdo->prepare(
    'SELECT COUNT(*)
     FROM watering_tasks
     WHERE task_date=? AND done=0'
);

$s->execute([
    $today
]);

$stats['tasks_today'] = (int)$s->fetchColumn();

$s = $pdo->prepare(
    "SELECT COUNT(*)
     FROM harvests h
     JOIN plots p ON p.id=h.plot_id
     WHERE h.harvest_date BETWEEN ? AND ?
       AND p.crop_type='Rice'"
);

$s->execute([
    $today,
    $weekEnd
]);

$stats['harvests_week'] = (int)$s->fetchColumn();

$plots = $pdo
    ->query(
        "SELECT
            p.*,
            pl.crop_name,
            pl.variety
         FROM plots p
         LEFT JOIN plantings pl
            ON pl.id=(
                SELECT MAX(id)
                FROM plantings
                WHERE plot_id=p.id
            )
         WHERE p.crop_type='Rice'
         ORDER BY p.id"
    )
    ->fetchAll();

$s = $pdo->prepare(
    "SELECT
        w.*,
        p.name plot_name,
        p.crop_type,
        pl.crop_name
     FROM watering_tasks w
     JOIN plots p ON p.id=w.plot_id
     LEFT JOIN plantings pl
        ON pl.id=(
            SELECT MAX(id)
            FROM plantings
            WHERE plot_id=p.id
        )
     WHERE w.task_date=?
       AND p.crop_type='Rice'
     ORDER BY w.id"
);

$s->execute([
    $today
]);

$tasks = $s->fetchAll();

$harvests = $pdo
    ->query(
        "SELECT
            h.*,
            p.name plot_name,
            p.crop_type
         FROM harvests h
         JOIN plots p ON p.id=h.plot_id
         WHERE p.crop_type='Rice'
         ORDER BY h.harvest_date DESC,h.id DESC
         LIMIT 5"
    )
    ->fetchAll();

$seeds = $pdo
    ->query(
        "SELECT *
         FROM seeds
         WHERE crop_type='Rice'
         ORDER BY id"
    )
    ->fetchAll();

foreach ($seeds as &$x) {
    $x['low_stock'] =
        (float)$x['quantity_g'] <=
        (float)$x['threshold_g'];
}
unset($x);

json_ok([
    'stats' => $stats,
    'plots' => $plots,
    'tasks' => $tasks,
    'harvests' => $harvests,
    'seeds' => $seeds
]);