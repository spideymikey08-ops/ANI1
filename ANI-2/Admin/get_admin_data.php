<?php

require __DIR__ . '/../config.php';
require_admin();

// Count registered farmer accounts
$userStats = $pdo->query("
    SELECT
        COUNT(*) AS total_users,
        COALESCE(SUM(status = 'active'), 0) AS active_users,
        COALESCE(SUM(status = 'deactivated'), 0) AS deactivated_users
    FROM users
    WHERE role = 'user'
")->fetch(PDO::FETCH_ASSOC);

// Count all registered plots
$plotStats = $pdo->query("
    SELECT COUNT(*) AS total_plots
    FROM plots
")->fetch(PDO::FETCH_ASSOC);

// Get registered users for User Management
$users = $pdo->query("
    SELECT
        id,
        full_name,
        email,
        phone,
        username,
        role,
        status,
        created_at
    FROM users
    ORDER BY id DESC
")->fetchAll(PDO::FETCH_ASSOC);

// Get recent activity logs
$logs = $pdo->query("
    SELECT
        id,
        username,
        action,
        details,
        ip_address,
        created_at
    FROM activity_logs
    ORDER BY id DESC
    LIMIT 30
")->fetchAll(PDO::FETCH_ASSOC);

// Return dashboard information
json_ok([
    'overview' => [
        'users' => [
            'total_users' => (int) $userStats['total_users'],
            'active_users' => (int) $userStats['active_users'],
            'deactivated_users' => (int) $userStats['deactivated_users']
        ],

        'plots' => [
            'total_plots' => (int) $plotStats['total_plots']
        ]
    ],

    'users' => $users,
    'logs' => $logs
]);