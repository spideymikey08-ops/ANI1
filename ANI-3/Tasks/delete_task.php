<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid task.');
}

$pdo
    ->prepare('DELETE FROM watering_tasks WHERE id=?')
    ->execute([
        $id
    ]);

json_ok([
    'message' => 'Task deleted.'
]);