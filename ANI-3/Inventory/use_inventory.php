<?php

require __DIR__ . '/../config.php';

$d = input();

$itemId       = (int)($d['item_id'] ?? 0);
$quantityUsed = (float)($d['quantity_used'] ?? 0);
$usedDate     = required($d, 'used_date');
$plotId       = !empty($d['plot_id']) ? (int)$d['plot_id'] : null;
$notes        = trim((string)($d['notes'] ?? ''));

if (!$itemId || $quantityUsed <= 0) {
    json_error('Please specify a valid item and quantity greater than zero.');
}

// Fetch current item
$stmt = $pdo->prepare("SELECT id, item_name, quantity, unit FROM farm_inventory WHERE id = ?");
$stmt->execute([$itemId]);
$item = $stmt->fetch();

if (!$item) {
    json_error('Inventory item not found.');
}

$currentQty = (float)$item['quantity'];
if ($quantityUsed > $currentQty) {
    json_error("Cannot use {$quantityUsed} {$item['unit']}. Only {$currentQty} {$item['unit']} in stock.");
}

$newQty = $currentQty - $quantityUsed;

$pdo->beginTransaction();
try {
    // 1. Update item quantity
    $updateStmt = $pdo->prepare("UPDATE farm_inventory SET quantity = ? WHERE id = ?");
    $updateStmt->execute([$newQty, $itemId]);

    // 2. Insert into inventory_logs
    $logStmt = $pdo->prepare("
        INSERT INTO inventory_logs (item_id, action_type, quantity, used_date, plot_id, notes)
        VALUES (?, 'Used', ?, ?, ?, ?)
    ");
    $logStmt->execute([
        $itemId,
        $quantityUsed,
        $usedDate,
        $plotId,
        $notes ?: null
    ]);

    $pdo->commit();

    json_ok([
        'message'      => "Used {$quantityUsed} {$item['unit']} of {$item['item_name']}. Remaining: {$newQty} {$item['unit']}.",
        'new_quantity' => $newQty
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    json_error('Failed to record stock usage: ' . $e->getMessage());
}
