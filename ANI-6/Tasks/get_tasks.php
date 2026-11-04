<?php

require __DIR__ . '/../config.php';

$sql = "SELECT
            w.*,
            p.name AS plot_name,
            p.crop_type
        FROM watering_tasks w
        JOIN plots p ON p.id = w.plot_id
        WHERE p.crop_type = 'Rice'
          AND p.user_id <=> COALESCE(?, p.user_id)
        ORDER BY w.task_date DESC, w.id DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute([sid()]);

json_ok(['tasks' => $stmt->fetchAll()]);
