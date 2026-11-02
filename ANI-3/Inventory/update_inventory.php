<?php

require __DIR__ . '/../config.php';

$d = input();

$id           = (int)($d['id'] ?? 0);
$itemName     = required($d, 'item_name');
$category     = required($d, 'category');
$quantity     = (float)($d['quantity'] ?? 0);
$unit         = trim((string)($d['unit'] ?? 'kg'));
$purchaseDate = required($d, 'purchase_date');
$unitCost     = (float)($d['unit_cost'] ?? 0);
$supplier     = trim((string)($d['supplier'] ?? ''));
$notes        = trim((string)($d['notes'] ?? ''));

if (!$id) {
    json_error('Invalid item ID.');
}

$validCategories = ['Rice Seeds', 'Fertilizers', 'Pesticides', 'Other Supplies'];
if (!in_array($category, $validCategories, true)) {
    json_error('Invalid category.');
}

if ($quantity < 0) {
    json_error('Quantity cannot be negative.');
}

$stmt = $pdo->prepare("
    UPDATE farm_inventory
    SET item_name=?, category=?, quantity=?, unit=?, purchase_date=?, unit_cost=?, supplier=?, notes=?
    WHERE id=?
");

$stmt->execute([
    $itemName,
    $category,
    $quantity,
    $unit ?: 'kg',
    $purchaseDate,
    $unitCost,
    $supplier ?: null,
    $notes ?: null,
    $id
]);

json_ok(['message' => 'Inventory item updated successfully.']);
