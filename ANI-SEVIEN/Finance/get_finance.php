<?php

require __DIR__ . '/../config.php';

$summarySql = "SELECT
    COALESCE(SUM(CASE WHEN f.transaction_type='Expense' THEN f.amount ELSE 0 END),0) AS expenses,
    COALESCE(SUM(CASE WHEN f.transaction_type='Income' THEN f.amount ELSE 0 END),0) AS revenue
    FROM finance_transactions f
    LEFT JOIN plots p ON p.id=f.plot_id
    WHERE (p.crop_type='Rice' OR f.plot_id IS NULL)
      AND f.user_id <=> COALESCE(?, f.user_id)";

$stmt = $pdo->prepare($summarySql);
$stmt->execute([sid()]);
$summary = $stmt->fetch();

$expenses = (float)$summary['expenses'];
$revenue = (float)$summary['revenue'];

$stmt = $pdo->prepare(
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
       AND f.user_id <=> COALESCE(?, f.user_id)
     ORDER BY f.transaction_date DESC, f.id DESC"
);
$stmt->execute([sid()]);
$transactions = $stmt->fetchAll();

json_ok([
    'summary' => [
        'expenses' => $expenses,
        'revenue' => $revenue,
        'net' => $revenue - $expenses
    ],
    'transactions' => $transactions
]);
