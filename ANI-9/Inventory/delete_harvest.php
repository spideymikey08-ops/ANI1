<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid harvest.');
}

$pdo
    ->prepare(
        'DELETE FROM harvests
         WHERE id=?
           AND plot_id IN (SELECT id FROM plots WHERE user_id <=> COALESCE(?, user_id))'
    )
    ->execute([
        $id,
        sid()
    ]);

json_ok([
    'message' => 'Harvest deleted.'
]);