<?php

require __DIR__ . '/../config.php';

$d = input();

$type = trim((string)($d['transaction_type'] ?? ''));
$plotRaw = $d['plot_id'] ?? '';
$plot = ($plotRaw === 'whole_farm' || $plotRaw === '0' || $plotRaw === '' || $plotRaw === null) ? null : (int)$plotRaw;
$date = required($d, 'transaction_date');
$category = required($d, 'category');
$amount = (float)($d['amount'] ?? 0);
$notes = trim((string)($d['notes'] ?? ''));

if (!in_array($type, ['Expense', 'Income'], true)) {
    json_error('Invalid transaction type.');
}

if ($amount <= 0) {
    json_error('Enter an amount greater than zero.');
}

if ($plot !== null) {
    $plotCheck = $pdo->prepare(
        "SELECT COUNT(*) FROM plots WHERE id=? AND crop_type='Rice'"
    );
    $plotCheck->execute([$plot]);

    if (!(int)$plotCheck->fetchColumn()) {
        json_error('Invalid rice plot.');
    }
}

$expenseCategories = [
    'Seed',
    'Fertilizer',
    'Pesticide',
    'Labor',
    'Fuel',
    'Other'
];

$incomeCategories = [
    'Harvest Sale',
    'Other Income'
];

$allowed = $type === 'Income' ? $incomeCategories : $expenseCategories;

if (!in_array($category, $allowed, true)) {
    json_error('Invalid finance category.');
}

$stmt = $pdo->prepare(
    'INSERT INTO finance_transactions
        (plot_id, transaction_type, category, amount, transaction_date, notes)
     VALUES (?,?,?,?,?,?)'
);

$stmt->execute([
    $plot,
    $type,
    $category,
    $amount,
    $date,
    $notes ?: null
]);

$plotLabel = $plot ? "Plot #$plot" : 'Whole Farm';
$user = $_SESSION['username'] ?? 'User';
log_activity($pdo, $_SESSION['user_id'] ?? null, $user, 'Add Finance Transaction', "$type of ₱$amount for $category ($plotLabel)");

json_ok([
    'message' => 'Farm transaction added.'
]);
