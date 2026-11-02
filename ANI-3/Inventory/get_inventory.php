<?php

require __DIR__ . '/../config.php';

$category = trim((string)($_GET['category'] ?? ''));

$sql = "SELECT * FROM farm_inventory";
$params = [];

if ($category && $category !== 'All') {
    $sql .= " WHERE category = ?";
    $params[] = $category;
}

$sql .= " ORDER BY id DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

// Calculate summary counts
$summary = [
    'total_items' => count($items),
    'seeds' => 0,
    'fertilizers' => 0,
    'pesticides' => 0,
    'supplies' => 0
];

$counts = $pdo->query("
    SELECT category, COUNT(*) as cnt 
    FROM farm_inventory 
    GROUP BY category
")->fetchAll();

foreach ($counts as $c) {
    $cat = $c['category'];
    $cnt = (int)$c['cnt'];
    if ($cat === 'Rice Seeds') $summary['seeds'] = $cnt;
    elseif ($cat === 'Fertilizers') $summary['fertilizers'] = $cnt;
    elseif ($cat === 'Pesticides') $summary['pesticides'] = $cnt;
    elseif ($cat === 'Other Supplies') $summary['supplies'] = $cnt;
}

// Fetch recent usage logs
$logsStmt = $pdo->query("
    SELECT 
        l.*,
        i.item_name,
        i.category,
        i.unit,
        p.name as plot_name
    FROM inventory_logs l
    JOIN farm_inventory i ON i.id = l.item_id
    LEFT JOIN plots p ON p.id = l.plot_id
    ORDER BY l.used_date DESC, l.id DESC
    LIMIT 30
");
$logs = $logsStmt->fetchAll();

json_ok([
    'items'   => $items,
    'summary' => $summary,
    'logs'    => $logs
]);
