<?php

require __DIR__ . '/../config.php';

$sql = "SELECT
            h.*,
            p.name plot_name,
            p.crop_type
        FROM harvests h
        JOIN plots p ON p.id=h.plot_id
        WHERE p.crop_type='Rice'
          AND p.user_id <=> COALESCE(?, p.user_id)
        ORDER BY h.harvest_date DESC,h.id DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute([sid()]);

json_ok([
    'harvests' => $stmt->fetchAll()
]);