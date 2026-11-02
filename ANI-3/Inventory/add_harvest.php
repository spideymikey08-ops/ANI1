<?php

require __DIR__ . '/../config.php';

$d = input();

$plot = (int)($d['plot_id'] ?? 0);
$date = required($d, 'harvest_date');
$qty = (float)($d['quantity'] ?? 0);
$notes = trim((string)($d['notes'] ?? ''));

if (!$plot || $qty <= 0) {
    json_error(
        'Select a plot and enter a quantity greater than zero.'
    );
}

$s = $pdo->prepare(
    'INSERT INTO harvests(plot_id,harvest_date,quantity,notes)
     VALUES(?,?,?,?)'
);

$s->execute([
    $plot,
    $date,
    $qty,
    $notes ?: null
]);

json_ok([
    'message' => 'Harvest logged.'
]);