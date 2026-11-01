<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid harvest.');
}

$pdo
    ->prepare('DELETE FROM harvests WHERE id=?')
    ->execute([
        $id
    ]);

json_ok([
    'message' => 'Harvest deleted.'
]);