<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid item ID.');
}

$stmt = $pdo->prepare("DELETE FROM farm_inventory WHERE id = ?");
$stmt->execute([$id]);

json_ok(['message' => 'Inventory item deleted successfully.']);
