<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
$done = !empty($d['done']) ? 1 : 0;

if (!$id) {
    json_error('Invalid task.');
}

$s = $pdo->prepare(
    'UPDATE watering_tasks SET done=?
     WHERE id=?
       AND plot_id IN (SELECT id FROM plots WHERE user_id <=> COALESCE(?, user_id))'
);

$s->execute([
    $done,
    $id,
    sid()
]);

json_ok([
    'message' => $done
        ? 'Task marked done.'
        : 'Task reopened.'
]);