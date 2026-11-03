<?php
require __DIR__ . '/../config.php';

$d = input();

$itemId = (int)($d['item_id'] ?? 0);
$qtyUsed = (float)($d['quantity_used'] ?? 0);
$usedDate = required($d, 'used_date');
$plotRaw = $d['plot_id'] ?? '';
$plotId = ($plotRaw === '' || $plotRaw === '0' || $plotRaw === 'whole_farm') ? null : (int)$plotRaw;
$purpose = trim((string)($d['purpose'] ?? ''));

if (!$itemId || $qtyUsed <= 0) {
    json_error('Please specify the item and enter a quantity used greater than 0.');
}

$stmt = $pdo->prepare("SELECT * FROM inventory_items WHERE id = ?");
$stmt->execute([$itemId]);
$item = $stmt->fetch();

if (!$item) {
    json_error('Inventory item not found.');
}

$currentStock = (float)$item['quantity'];
if ($qtyUsed > $currentStock) {
    json_error("Cannot use {$qtyUsed} {$item['unit']}. Current stock is only {$currentStock} {$item['unit']}.");
}

$pdo->beginTransaction();

try {
    $newStock = max(0, $currentStock - $qtyUsed);
    $up = $pdo->prepare("UPDATE inventory_items SET quantity = ? WHERE id = ?");
    $up->execute([$newStock, $itemId]);

    $user = $_SESSION['username'] ?? 'User';

    $insLog = $pdo->prepare(
        "INSERT INTO inventory_usage_logs
            (item_id, quantity_used, used_date, plot_id, purpose, logged_by)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $insLog->execute([
        $itemId,
        $qtyUsed,
        $usedDate,
        $plotId,
        $purpose ?: 'Field application',
        $user
    ]);

    log_activity(
        $pdo,
        $_SESSION['user_id'] ?? null,
        $user,
        'Use Inventory Stock',
        "Used {$qtyUsed} {$item['unit']} of {$item['item_name']} (Remaining: {$newStock} {$item['unit']})"
    );

    $pdo->commit();

    json_ok([
        'message' => "Stock updated! Deducted {$qtyUsed} {$item['unit']} of {$item['item_name']}.",
        'remaining_stock' => $newStock,
        'unit' => $item['unit']
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    json_error('Failed to record stock usage: ' . $e->getMessage());
}
