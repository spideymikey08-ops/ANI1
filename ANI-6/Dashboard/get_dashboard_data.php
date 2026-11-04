<?php

require __DIR__ . '/../config.php';

$today = date('Y-m-d');
$weekEnd = date(
    'Y-m-d',
    strtotime('+6 days')
);

$uid = sid();

$s = $pdo->prepare(
    "SELECT COUNT(*)
     FROM plots
     WHERE crop_type='Rice' AND user_id <=> COALESCE(?, user_id)"
);
$s->execute([$uid]);

$stats = [
    'rice' => (int)$s->fetchColumn(),

    'tasks_today' => 0,
];

$s = $pdo->prepare(
    'SELECT COUNT(*)
     FROM watering_tasks w
     JOIN plots p ON p.id=w.plot_id
     WHERE w.task_date=? AND w.done=0
       AND p.user_id <=> COALESCE(?, p.user_id)'
);

$s->execute([
    $today,
    $uid
]);

$stats['tasks_today'] = (int)$s->fetchColumn();

$s = $pdo->prepare(
    "SELECT COUNT(*)
     FROM harvests h
     JOIN plots p ON p.id=h.plot_id
     WHERE h.harvest_date BETWEEN ? AND ?
       AND p.crop_type='Rice'
       AND p.user_id <=> COALESCE(?, p.user_id)"
);

$s->execute([
    $today,
    $weekEnd,
    $uid
]);

$stats['harvests_week'] = (int)$s->fetchColumn();

$s = $pdo
    ->prepare(
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
           AND p.user_id <=> COALESCE(?, p.user_id)
         ORDER BY p.id"
    );
$s->execute([$uid]);
$plots = $s->fetchAll();

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
       AND w.done=0
       AND p.crop_type='Rice'
       AND p.user_id <=> COALESCE(?, p.user_id)
     ORDER BY w.id"
);

$s->execute([
    $today,
    $uid
]);

$tasks = $s->fetchAll();

$s = $pdo
    ->prepare(
        "SELECT
            h.*,
            p.name plot_name,
            p.crop_type
         FROM harvests h
         JOIN plots p ON p.id=h.plot_id
         WHERE p.crop_type='Rice'
           AND p.user_id <=> COALESCE(?, p.user_id)
         ORDER BY h.harvest_date DESC,h.id DESC
         LIMIT 5"
    );
$s->execute([$uid]);
$harvests = $s->fetchAll();

$s = $pdo
    ->prepare(
        "SELECT *
         FROM seeds
         WHERE crop_type='Rice'
           AND user_id <=> COALESCE(?, user_id)
         ORDER BY id"
    );
$s->execute([$uid]);
$seeds = $s->fetchAll();

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