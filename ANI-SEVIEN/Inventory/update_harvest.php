<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
$date = required($d, 'harvest_date');
$qty = (float)($d['quantity'] ?? 0);
$notes = trim((string)($d['notes'] ?? ''));
$plotId = (int)($d['plot_id'] ?? 0);

if (!$id || $qty <= 0) {
    json_error('Invalid harvest record: valid quantity is required.');
}

if ($plotId > 0 && !own_plot($pdo, $plotId)) {
    json_error('Invalid rice plot.');
}

if ($plotId > 0) {
    $s = $pdo->prepare(
        'UPDATE harvests
         SET plot_id=?, harvest_date=?, quantity=?, notes=?
         WHERE id=?
           AND plot_id IN (SELECT id FROM plots WHERE user_id <=> COALESCE(?, user_id))'
    );
    $s->execute([
        $plotId,
        $date,
        $qty,
        $notes ?: null,
        $id,
        sid()
    ]);
} else {
    $s = $pdo->prepare(
        'UPDATE harvests
         SET harvest_date=?, quantity=?, notes=?
         WHERE id=?
           AND plot_id IN (SELECT id FROM plots WHERE user_id <=> COALESCE(?, user_id))'
    );
    $s->execute([
        $date,
        $qty,
        $notes ?: null,
        $id,
        sid()
    ]);
}

$user = $_SESSION['username'] ?? 'User';
log_activity($pdo, $_SESSION['user_id'] ?? null, $user, 'Update Harvest', "Updated harvest ID $id ($qty kg on $date)");

json_ok([
    'message' => 'Harvest updated successfully.'
]);
