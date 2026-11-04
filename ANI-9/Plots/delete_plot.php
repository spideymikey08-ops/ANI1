<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid plot.');
}

$s = $pdo->prepare(
    'DELETE FROM plots WHERE id=? AND user_id <=> COALESCE(?, user_id)'
);

$s->execute([
    $id,
    sid()
]);

if ($s->rowCount() === 0) {
    json_error('Plot not found.', 404);
}

json_ok([
    'message' => 'Plot deleted.'
]);