<?php

require __DIR__ . '/../config.php';

$d = input();

$id    = (int)($d['id'] ?? 0);
$plot  = (int)($d['plot_id'] ?? 0);
$date  = required($d, 'harvest_date');
$qty   = (float)($d['quantity'] ?? 0);
$notes = trim((string)($d['notes'] ?? ''));

if (!$id || $qty <= 0) {
    json_error('Invalid harvest data.');
}

if ($plot > 0) {
    $s = $pdo->prepare(
        'UPDATE harvests
         SET plot_id=?, harvest_date=?, quantity=?, notes=?
         WHERE id=?'
    );
    $s->execute([$plot, $date, $qty, $notes ?: null, $id]);
} else {
    $s = $pdo->prepare(
        'UPDATE harvests
         SET harvest_date=?, quantity=?, notes=?
         WHERE id=?'
    );
    $s->execute([$date, $qty, $notes ?: null, $id]);
}

json_ok(['message' => 'Harvest updated successfully.']);
