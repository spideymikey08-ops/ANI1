<?php

require __DIR__ . '/../config.php';

$summarySql = "SELECT
    COALESCE(SUM(CASE WHEN transaction_type='Expense' THEN amount ELSE 0 END),0) AS expenses,
    COALESCE(SUM(CASE WHEN transaction_type='Income' THEN amount ELSE 0 END),0) AS revenue
    FROM finance_transactions f
    JOIN plots p ON p.id=f.plot_id
    WHERE p.crop_type='Rice'";

$summary = $pdo->query($summarySql)->fetch();

$expenses = (float)$summary['expenses'];
$revenue = (float)$summary['revenue'];

$transactions = $pdo->query(
    "SELECT
        f.id,
        f.plot_id,
        f.transaction_type,
        f.category,
        f.amount,
        f.transaction_date,
        f.notes,
        p.name AS plot_name
     FROM finance_transactions f
     JOIN plots p ON p.id=f.plot_id
     WHERE p.crop_type='Rice'
     ORDER BY f.transaction_date DESC, f.id DESC"
)->fetchAll();

json_ok([
    'summary' => [
        'expenses' => $expenses,
        'revenue' => $revenue,
        'net' => $revenue - $expenses
    ],
    'transactions' => $transactions
]);
