<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid seed.');
}

$pdo
    ->prepare('DELETE FROM seeds WHERE id=? AND user_id <=> COALESCE(?, user_id)')
    ->execute([
        $id,
        sid()
    ]);

json_ok([
    'message' => 'Seed deleted.'
]);