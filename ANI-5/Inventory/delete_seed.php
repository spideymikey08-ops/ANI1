<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid seed.');
}

$pdo
    ->prepare('DELETE FROM seeds WHERE id=?')
    ->execute([
        $id
    ]);

json_ok([
    'message' => 'Seed deleted.'
]);