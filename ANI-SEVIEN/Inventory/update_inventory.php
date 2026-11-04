<?php
require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
if (!$id) {
    json_error('Invalid inventory item ID.');
}

$itemName = required($d, 'item_name');
$category = required($d, 'category');
$quantity = (float)($d['quantity'] ?? 0);
$unit = trim((string)($d['unit'] ?? 'kg'));
$purchaseDate = required($d, 'purchase_date');
$threshold = (float)($d['threshold'] ?? 0);
$cost = isset($d['cost']) && $d['cost'] !== '' ? (float)$d['cost'] : null;
$notes = trim((string)($d['notes'] ?? ''));

$allowedCategories = ['Rice Seeds', 'Fertilizers', 'Pesticides', 'Other Supplies'];
if (!in_array($category, $allowedCategories, true)) {
    json_error('Select a valid inventory category.');
}

if ($quantity < 0) {
    json_error('Quantity cannot be negative.');
}

if ($threshold < 0) {
    json_error('Threshold cannot be negative.');
}

$stmt = $pdo->prepare(
    "UPDATE inventory_items
     SET item_name = ?,
         category = ?,
         quantity = ?,
         unit = ?,
         purchase_date = ?,
         threshold = ?,
         cost = ?,
         notes = ?
     WHERE id = ? AND user_id <=> COALESCE(?, user_id)"
);

$stmt->execute([
    $itemName,
    $category,
    $quantity,
    $unit ?: 'kg',
    $purchaseDate,
    $threshold,
    $cost,
    $notes ?: null,
    $id,
    sid()
]);

if ($stmt->rowCount() === 0) {
    $own = $pdo->prepare('SELECT COUNT(*) FROM inventory_items WHERE id = ? AND user_id <=> COALESCE(?, user_id)');
    $own->execute([$id, sid()]);
    if (!(int)$own->fetchColumn()) {
        json_error('Inventory item not found.', 404);
    }
}

$user = $_SESSION['username'] ?? 'User';
log_activity($pdo, $_SESSION['user_id'] ?? null, $user, 'Update Inventory Item', "Updated $itemName (Stock: $quantity $unit)");

json_ok([
    'message' => 'Inventory item updated successfully.'
]);
