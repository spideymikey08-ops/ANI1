<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid plot.');
}

$s = $pdo->prepare(
    'DELETE FROM plots WHERE id=?'
);

$s->execute([
    $id
]);

json_ok([
    'message' => 'Plot deleted.'
]);