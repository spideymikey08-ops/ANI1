<?php

require __DIR__ . '/../config.php';

$sql = "SELECT
            p.*,
            pl.id AS planting_id,
            pl.crop_name,
            pl.variety,
            pl.planted_date,
            pl.expected_harvest_date,
            pl.notes AS planting_notes,
            u.username AS owner
        FROM plots p
        LEFT JOIN users u ON u.id=p.user_id
        LEFT JOIN plantings pl
            ON pl.plot_id=p.id
            AND pl.id=(
                SELECT MAX(p2.id)
                FROM plantings p2
                WHERE p2.plot_id=p.id
            )
        WHERE p.crop_type='Rice'
          AND p.user_id <=> COALESCE(?, p.user_id)
        ORDER BY p.id";

$stmt = $pdo->prepare($sql);
$stmt->execute([sid()]);

json_ok([
    'plots' => $stmt->fetchAll()
]);