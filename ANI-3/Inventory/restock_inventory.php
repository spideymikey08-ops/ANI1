<?php

require __DIR__ . '/../config.php';

$d = input();

$itemId        = (int)($d['item_id'] ?? 0);
$quantityAdded = (float)($d['quantity_added'] ?? 0);
$restockDate   = required($d, 'restock_date');
$notes         = trim((string)($d['notes'] ?? ''));

if (!$itemId || $quantityAdded <= 0) {
    json_error('Please specify a valid item and quantity greater than zero.');
}

$stmt = $pdo->prepare("SELECT id, item_name, quantity, unit FROM farm_inventory WHERE id = ?");
$stmt->execute([$itemId]);
$item = $stmt->fetch();

if (!$item) {
    json_error('Inventory item not found.');
}

$newQty = (float)$item['quantity'] + $quantityAdded;

$pdo->beginTransaction();
try {
    $updateStmt = $pdo->prepare("UPDATE farm_inventory SET quantity = ? WHERE id = ?");
    $updateStmt->execute([$newQty, $itemId]);

    $logStmt = $pdo->prepare("
        INSERT INTO inventory_logs (item_id, action_type, quantity, used_date, notes)
        VALUES (?, 'Restocked', ?, ?, ?)
    ");
    $logStmt->execute([
        $itemId,
        $quantityAdded,
        $restockDate,
        $notes ?: null
    ]);

    $pdo->commit();

    json_ok([
        'message'      => "Restocked {$quantityAdded} {$item['unit']} of {$item['item_name']}. Total: {$newQty} {$item['unit']}.",
        'new_quantity' => $newQty
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    json_error('Failed to restock item: ' . $e->getMessage());
}
