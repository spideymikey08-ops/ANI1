<?php
// Ani - Database Backup Generator
require __DIR__ . '/../config.php';
require_admin();

$timestamp = date('Y-m-d_H-i-s');
$filename = "aniyatrack_backup_{$timestamp}.sql";

$tables = [
    'plots',
    'plantings',
    'watering_tasks',
    'harvests',
    'seeds',
    'finance_transactions',
    'users',
    'activity_logs'
];

$sqlDump = "-- Ani Database Backup\n";
$sqlDump .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
$sqlDump .= "-- Host: {$host} | Database: {$db}\n";
$sqlDump .= "-- --------------------------------------------------------\n\n";
$sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n";
$sqlDump .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
$sqlDump .= "START TRANSACTION;\n";
$sqlDump .= "SET time_zone = '+08:00';\n\n";

foreach ($tables as $table) {
    // Check if table exists
    $chk = $pdo->query("SHOW TABLES LIKE '{$table}'")->fetch();
    if (!$chk) continue;

    $sqlDump .= "--\n-- Table structure for table `{$table}`\n--\n";
    $sqlDump .= "DROP TABLE IF EXISTS `{$table}`;\n";

    $createTable = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch();
    $sqlDump .= $createTable['Create Table'] . ";\n\n";

    // Table data
    $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll();
    if ($rows) {
        $sqlDump .= "--\n-- Dumping data for table `{$table}`\n--\n";
        $columns = array_keys($rows[0]);
        $colNames = implode('`, `', $columns);

        foreach ($rows as $row) {
            $values = [];
            foreach ($row as $val) {
                if ($val === null) {
                    $values[] = 'NULL';
                } else {
                    $values[] = $pdo->quote((string)$val);
                }
            }
            $sqlDump .= "INSERT INTO `{$table}` (`{$colNames}`) VALUES (" . implode(', ', $values) . ");\n";
        }
        $sqlDump .= "\n";
    }
}

$sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";
$sqlDump .= "COMMIT;\n";

// Log the backup activity
log_activity(
    $pdo,
    (int)$_SESSION['user_id'],
    $_SESSION['username'],
    'Database Backup',
    "Generated backup file: {$filename}"
);

// Send file download headers
header('Content-Description: File Transfer');
header('Content-Type: application/sql; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . strlen($sqlDump));

echo $sqlDump;
exit;
