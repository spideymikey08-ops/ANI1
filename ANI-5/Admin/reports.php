<?php
require __DIR__ . '/../config.php';
require_admin();

$type      = trim((string)($_GET['type'] ?? 'all'));
$start     = trim((string)($_GET['start_date'] ?? ''));
$end       = trim((string)($_GET['end_date'] ?? ''));
$plotRaw   = trim((string)($_GET['plot_id'] ?? ''));
$format    = trim((string)($_GET['format'] ?? 'json'));

$where = ["(p.crop_type='Rice' OR f.plot_id IS NULL)"];
$params = [];

if ($type === 'expense') {
    $where[] = "f.transaction_type = 'Expense'";
} elseif ($type === 'income') {
    $where[] = "f.transaction_type = 'Income'";
}

if ($start !== '') {
    $where[] = "f.transaction_date >= ?";
    $params[] = $start;
}
if ($end !== '') {
    $where[] = "f.transaction_date <= ?";
    $params[] = $end;
}
if ($plotRaw === 'whole_farm' || $plotRaw === '-1') {
    $where[] = "f.plot_id IS NULL";
} elseif (is_numeric($plotRaw) && (int)$plotRaw > 0) {
    $where[] = "f.plot_id = ?";
    $params[] = (int)$plotRaw;
}

$whereClause = implode(' AND ', $where);

$query = "SELECT
            f.id,
            f.transaction_date,
            COALESCE(p.name, 'Whole Farm') AS plot_name,
            f.transaction_type,
            f.category,
            f.amount,
            f.notes
          FROM finance_transactions f
          LEFT JOIN plots p ON p.id = f.plot_id
          WHERE {$whereClause}
          ORDER BY f.transaction_date DESC, f.id DESC";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Calculate totals
$totalIncome = 0;
$totalExpense = 0;

foreach ($rows as $r) {
    if ($r['transaction_type'] === 'Income') {
        $totalIncome += (float)$r['amount'];
    } else {
        $totalExpense += (float)$r['amount'];
    }
}
$netProfit = $totalIncome - $totalExpense;

// CSV export for Excel
if ($format === 'csv') {
    log_activity(
        $pdo,
        (int)$_SESSION['user_id'],
        $_SESSION['username'],
        'Export Report',
        "Exported {$type} report as CSV/Excel"
    );

    $filename = "farm_finance_report_" . date('Y-m-d') . ".csv";

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $output = fopen('php://output', 'w');
    // Output UTF-8 BOM so Excel opens special characters correctly
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

    // Summary headers
    fputcsv($output, ['ANI FARM FINANCIAL REPORT']);
    fputcsv($output, ['Generated Date', date('Y-m-d H:i:s')]);
    fputcsv($output, ['Report Type', ucfirst($type)]);
    fputcsv($output, ['Total Income', number_format($totalIncome, 2)]);
    fputcsv($output, ['Total Expense', number_format($totalExpense, 2)]);
    fputcsv($output, ['Net Profit/Loss', number_format($netProfit, 2)]);
    fputcsv($output, []); // Blank line

    // Column Headers
    fputcsv($output, ['ID', 'Date', 'Plot', 'Type', 'Category', 'Amount (PHP)', 'Notes']);

    foreach ($rows as $r) {
        fputcsv($output, [
            $r['id'],
            $r['transaction_date'],
            $r['plot_name'],
            $r['transaction_type'],
            $r['category'],
            $r['amount'],
            $r['notes'] ?? ''
        ]);
    }
    fclose($output);
    exit;
}

// JSON response for interactive table & print/PDF rendering
json_ok([
    'summary' => [
        'income'   => $totalIncome,
        'expense'  => $totalExpense,
        'net'      => $netProfit,
        'count'    => count($rows)
    ],
    'transactions' => $rows
]);
