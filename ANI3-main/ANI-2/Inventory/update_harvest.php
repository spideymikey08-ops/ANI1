<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
$date = required($d, 'harvest_date');
$qty = (float)($d['quantity'] ?? 0);
$notes = trim((string)($d['notes'] ?? ''));

if (!$id || $qty <= 0) {
    json_error('Invalid harvest.');
}

$s = $pdo->prepare(
    'UPDATE harvests
     SET harvest_date=?,quantity=?,notes=?
     WHERE id=?'
);

$s->execute([
    $date,
    $qty,
    $notes ?: null,
    $id
]);

json_ok([
    'message' => 'Harvest updated.'
]);