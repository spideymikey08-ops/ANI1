<?php

require __DIR__ . '/../config.php';

$sql = "SELECT
            p.*,
            pl.id AS planting_id,
            pl.variety,
            pl.planted_date,
            pl.expected_harvest_date,
            pl.notes AS planting_notes,
            u.username AS owner,
            (SELECT COUNT(*) FROM watering_tasks wt WHERE wt.plot_id = p.id AND wt.done = 0) AS pending_tasks,
            CASE WHEN pl.planted_date IS NOT NULL THEN DATEDIFF(CURRENT_DATE, pl.planted_date) ELSE NULL END AS days_planted,
            CASE WHEN pl.expected_harvest_date IS NOT NULL THEN DATEDIFF(pl.expected_harvest_date, CURRENT_DATE) ELSE NULL END AS days_to_harvest
        FROM plots p
        LEFT JOIN users u ON u.id=p.user_id
        LEFT JOIN plantings pl
            ON pl.plot_id=p.id
            AND pl.id=(
                SELECT MAX(p2.id)
                FROM plantings p2
                WHERE p2.plot_id=p.id
            )
        WHERE p.user_id <=> COALESCE(?, p.user_id)
        ORDER BY p.id";

$stmt = $pdo->prepare($sql);
$stmt->execute([sid()]);

json_ok([
    'plots' => $stmt->fetchAll()
]);