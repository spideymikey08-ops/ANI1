<?php
require __DIR__ . '/../config.php';

// Fetch all inventory items
$items = $pdo->query(
    "SELECT
        id,
        item_name,
        category,
        quantity,
        unit,
        purchase_date,
        threshold,
        cost,
        notes,
        created_at
     FROM inventory_items
     ORDER BY category ASC, item_name ASC"
)->fetchAll();

$lowStockCount = 0;
$counts = [
    'Rice Seeds' => 0,
    'Fertilizers' => 0,
    'Pesticides' => 0,
    'Other Supplies' => 0
];

foreach ($items as &$it) {
    $it['quantity'] = (float)$it['quantity'];
    $it['threshold'] = (float)$it['threshold'];
    $it['cost'] = $it['cost'] !== null ? (float)$it['cost'] : null;
    $it['low_stock'] = $it['quantity'] <= $it['threshold'];
    if ($it['low_stock']) {
        $lowStockCount++;
    }
    if (isset($counts[$it['category']])) {
        $counts[$it['category']]++;
    }
}
unset($it);

// Fetch recent stock usage logs
$usage = $pdo->query(
    "SELECT
        u.id,
        u.item_id,
        u.quantity_used,
        u.used_date,
        u.plot_id,
        u.purpose,
        u.logged_by,
        u.created_at,
        i.item_name,
        i.category,
        i.unit,
        COALESCE(p.name, 'Whole Farm / General') AS plot_name
     FROM inventory_usage_logs u
     JOIN inventory_items i ON i.id = u.item_id
     LEFT JOIN plots p ON p.id = u.plot_id
     ORDER BY u.used_date DESC, u.id DESC
     LIMIT 20"
)->fetchAll();

json_ok([
    'items' => $items,
    'stats' => [
        'total' => count($items),
        'rice_seeds' => $counts['Rice Seeds'],
        'fertilizers' => $counts['Fertilizers'],
        'pesticides' => $counts['Pesticides'],
        'other_supplies' => $counts['Other Supplies'],
        'low_stock' => $lowStockCount
    ],
    'recent_usage' => $usage
]);
