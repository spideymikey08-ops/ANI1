<?php

require __DIR__ . '/../config.php';

$stmt = $pdo->prepare(
    "SELECT *
     FROM seeds
     WHERE crop_type='Rice'
       AND user_id <=> COALESCE(?, user_id)
     ORDER BY seed_name"
);
$stmt->execute([sid()]);
$rows = $stmt->fetchAll();

foreach ($rows as &$r) {
    $r['low_stock'] =
        (float)$r['quantity_g'] <=
        (float)$r['threshold_g'];
}
unset($r);

json_ok([
    'seeds' => $rows
]);