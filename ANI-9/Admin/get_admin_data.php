<?php
require __DIR__ . '/../config.php';
require_admin();

$today = date('Y-m-d');

// User statistics (farmer accounts only)
$userStats = $pdo->query(
    "SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_users
     FROM users
     WHERE role='user'"
)->fetch();

// Plot statistics
$plotStats = $pdo->query(
    "SELECT
        COUNT(*) AS total_plots,
        SUM(CASE WHEN status IN ('Planted','Occupied') THEN 1 ELSE 0 END) AS planted_plots,
        SUM(CASE WHEN status IN ('Planted','Occupied') THEN 1 ELSE 0 END) AS occupied_plots,
        SUM(CASE WHEN status='Available' THEN 1 ELSE 0 END) AS available_plots,
        SUM(CASE WHEN status='Maintenance' THEN 1 ELSE 0 END) AS maintenance_plots
     FROM plots WHERE crop_type='Rice'"
)->fetch();

// Task statistics
$taskStats = $pdo->query(
    "SELECT
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN done=0 THEN 1 ELSE 0 END) AS pending_tasks,
        SUM(CASE WHEN done=1 THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(CASE WHEN task_date='$today' AND done=0 THEN 1 ELSE 0 END) AS due_today
     FROM watering_tasks"
)->fetch();

// Harvest statistics
$harvestStats = $pdo->query(
    "SELECT
        COUNT(*) AS total_harvests,
        COALESCE(SUM(quantity), 0) AS total_kg
     FROM harvests"
)->fetch();

// Seed inventory statistics
$seedStats = $pdo->query(
    "SELECT
        COUNT(*) AS total_seeds,
        SUM(CASE WHEN quantity_g <= threshold_g THEN 1 ELSE 0 END) AS low_stock_count
     FROM seeds"
)->fetch();

// Financial statistics
$finStats = $pdo->query(
    "SELECT
        COALESCE(SUM(CASE WHEN transaction_type='Income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN transaction_type='Expense' THEN amount ELSE 0 END), 0) AS total_expenses
     FROM finance_transactions"
)->fetch();

$income = (float)$finStats['total_income'];
$expenses = (float)$finStats['total_expenses'];
$net = $income - $expenses;

// Recent Activity Logs (last 30)
$logs = $pdo->query(
    "SELECT id, username, action, details, ip_address, created_at
     FROM activity_logs
     ORDER BY id DESC
     LIMIT 30"
)->fetchAll();

// Registered Users list
$users = $pdo->query(
    "SELECT id, full_name, email, phone, username, role, status, created_at
     FROM users
     ORDER BY id DESC"
)->fetchAll();

json_ok([
    'overview' => [
        'users'        => $userStats,
        'plots'        => $plotStats,
        'tasks'        => $taskStats,
        'harvests'     => $harvestStats,
        'seeds'        => $seedStats,
        'finances'     => [
            'income'   => $income,
            'expenses' => $expenses,
            'net'      => $net
        ]
    ],
    'users' => $users,
    'logs'  => $logs
]);
