<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
$qty = (float)($d['quantity_g'] ?? 0);
$threshold = (float)($d['threshold_g'] ?? 0);

if (
    !$id ||
    $qty < 0 ||
    $threshold < 0
) {
    json_error('Invalid seed values.');
}

$s = $pdo->prepare(
    'UPDATE seeds
     SET quantity_g=?,threshold_g=?
     WHERE id=?'
);

$s->execute([
    $qty,
    $threshold,
    $id
]);

json_ok([
    'message' => 'Seed inventory updated.'
]);