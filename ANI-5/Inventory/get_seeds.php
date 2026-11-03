<?php

require __DIR__ . '/../config.php';

$rows = $pdo
    ->query(
        "SELECT *
         FROM seeds
         WHERE crop_type='Rice'
         ORDER BY seed_name"
    )
    ->fetchAll();

foreach ($rows as &$r) {
    $r['low_stock'] =
        (float)$r['quantity_g'] <=
        (float)$r['threshold_g'];
}
unset($r);

json_ok([
    'seeds' => $rows
]);