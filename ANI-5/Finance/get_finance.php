<?php

require __DIR__ . '/../config.php';

$summarySql = "SELECT
    COALESCE(SUM(CASE WHEN f.transaction_type='Expense' THEN f.amount ELSE 0 END),0) AS expenses,
    COALESCE(SUM(CASE WHEN f.transaction_type='Income' THEN f.amount ELSE 0 END),0) AS revenue
    FROM finance_transactions f
    LEFT JOIN plots p ON p.id=f.plot_id
    WHERE (p.crop_type='Rice' OR f.plot_id IS NULL)";

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
        COALESCE(p.name, 'Whole Farm') AS plot_name
     FROM finance_transactions f
     LEFT JOIN plots p ON p.id=f.plot_id
     WHERE (p.crop_type='Rice' OR f.plot_id IS NULL)
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
