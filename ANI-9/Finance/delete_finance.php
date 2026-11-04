<?php

require __DIR__ . '/../config.php';

$d = input();
$id = (int)($d['id'] ?? 0);

if (!$id) {
    json_error('Invalid finance transaction.');
}

$stmt = $pdo->prepare(
    'DELETE FROM finance_transactions WHERE id=? AND user_id <=> COALESCE(?, user_id)'
);
$stmt->execute([$id, sid()]);

json_ok([
    'message' => 'Transaction deleted.'
]);
