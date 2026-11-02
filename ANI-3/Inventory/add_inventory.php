<?php

require __DIR__ . '/../config.php';

$d = input();

$itemName     = required($d, 'item_name');
$category     = required($d, 'category');
$quantity     = (float)($d['quantity'] ?? 0);
$unit         = trim((string)($d['unit'] ?? 'kg'));
$purchaseDate = required($d, 'purchase_date');
$unitCost     = (float)($d['unit_cost'] ?? 0);
$supplier     = trim((string)($d['supplier'] ?? ''));
$notes        = trim((string)($d['notes'] ?? ''));

$validCategories = ['Rice Seeds', 'Fertilizers', 'Pesticides', 'Other Supplies'];
if (!in_array($category, $validCategories, true)) {
    json_error('Invalid category. Must be Rice Seeds, Fertilizers, Pesticides, or Other Supplies.');
}

if ($quantity < 0) {
    json_error('Quantity cannot be negative.');
}

$stmt = $pdo->prepare("
    INSERT INTO farm_inventory (item_name, category, quantity, unit, purchase_date, unit_cost, supplier, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    $itemName,
    $category,
    $quantity,
    $unit ?: 'kg',
    $purchaseDate,
    $unitCost,
    $supplier ?: null,
    $notes ?: null
]);

$newItemId = $pdo->lastInsertId();

// Optionally log the initial purchase / stock addition
if ($quantity > 0) {
    $logStmt = $pdo->prepare("
        INSERT INTO inventory_logs (item_id, action_type, quantity, used_date, notes)
        VALUES (?, 'Restocked', ?, ?, 'Initial purchase stock')
    ");
    $logStmt->execute([$newItemId, $quantity, $purchaseDate]);
}

json_ok([
    'id'      => $newItemId,
    'message' => 'Farm supply item added to inventory.'
]);
