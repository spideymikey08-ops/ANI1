<?php

require __DIR__ . '/../config.php';

$base = "SELECT
            w.*,
            p.name AS plot_name,
            p.crop_type
        FROM watering_tasks w
        JOIN plots p ON p.id = w.plot_id
        WHERE p.crop_type = 'Rice'";

$tasks = $pdo->query(
    $base . " AND w.done = 0
              ORDER BY w.task_date ASC, w.id ASC"
)->fetchAll();

$history = $pdo->query(
    $base . " AND w.done = 1
              ORDER BY w.task_date DESC, w.id DESC"
)->fetchAll();

json_ok([
    'tasks' => $tasks,
    'history' => $history
]);