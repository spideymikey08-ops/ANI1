<?php
require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
if (!$id) {
    json_error('Invalid inventory item ID.');
}

$stmt = $pdo->prepare("SELECT item_name FROM inventory_items WHERE id = ? AND user_id <=> COALESCE(?, user_id)");
$stmt->execute([$id, sid()]);
$item = $stmt->fetch();

if (!$item) {
    json_error('Inventory item not found.');
}

$del = $pdo->prepare("DELETE FROM inventory_items WHERE id = ? AND user_id <=> COALESCE(?, user_id)");
$del->execute([$id, sid()]);

$user = $_SESSION['username'] ?? 'User';
log_activity($pdo, $_SESSION['user_id'] ?? null, $user, 'Delete Inventory Item', "Deleted {$item['item_name']}");

json_ok([
    'message' => 'Inventory item deleted successfully.'
]);
