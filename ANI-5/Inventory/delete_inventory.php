<?php
require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
if (!$id) {
    json_error('Invalid inventory item ID.');
}

$stmt = $pdo->prepare("SELECT item_name FROM inventory_items WHERE id = ?");
$stmt->execute([$id]);
$item = $stmt->fetch();

if (!$item) {
    json_error('Inventory item not found.');
}

$del = $pdo->prepare("DELETE FROM inventory_items WHERE id = ?");
$del->execute([$id]);

$user = $_SESSION['username'] ?? 'User';
log_activity($pdo, $_SESSION['user_id'] ?? null, $user, 'Delete Inventory Item', "Deleted {$item['item_name']}");

json_ok([
    'message' => 'Inventory item deleted successfully.'
]);
