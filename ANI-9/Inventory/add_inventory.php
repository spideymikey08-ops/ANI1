<?php
require __DIR__ . '/../config.php';

$d = input();

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
    "INSERT INTO inventory_items
        (user_id, item_name, category, quantity, unit, purchase_date, threshold, cost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

$stmt->execute([
    uid(),
    $itemName,
    $category,
    $quantity,
    $unit ?: 'kg',
    $purchaseDate,
    $threshold,
    $cost,
    $notes ?: null
]);

$newId = (int)$pdo->lastInsertId();

// If this is a rice seed, also sync with seeds table for backward compatibility
if ($category === 'Rice Seeds') {
    try {
        $chk = $pdo->prepare("SELECT id FROM seeds WHERE seed_name=? AND user_id <=> COALESCE(?, user_id)");
        $chk->execute([$itemName, uid()]);
        if (!$chk->fetchColumn()) {
            $qtyG = $unit === 'kg' ? $quantity * 1000 : $quantity;
            $threshG = $unit === 'kg' ? $threshold * 1000 : $threshold;
            $insSeed = $pdo->prepare("INSERT INTO seeds (user_id, seed_name, crop_type, quantity_g, threshold_g) VALUES (?, ?, 'Rice', ?, ?)");
            $insSeed->execute([uid(), $itemName, $qtyG, $threshG]);
        }
    } catch (Exception $e) {}
}

$user = $_SESSION['username'] ?? 'User';
log_activity($pdo, $_SESSION['user_id'] ?? null, $user, 'Add Inventory Item', "Added $itemName ($category: $quantity $unit)");

json_ok([
    'id' => $newId,
    'message' => 'Inventory item added successfully.'
]);
