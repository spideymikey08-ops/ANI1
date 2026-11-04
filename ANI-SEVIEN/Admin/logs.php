<?php
require __DIR__ . '/../config.php';
require_admin();

$d = input();
$action = trim((string)($d['action'] ?? $_GET['action'] ?? 'list'));

if ($action === 'clear') {
    $pdo->query('TRUNCATE TABLE activity_logs');
    log_activity(
        $pdo,
        (int)$_SESSION['user_id'],
        $_SESSION['username'],
        'Clear Logs',
        'Cleared all activity logs'
    );
    json_ok(['message' => 'Activity logs cleared.']);
}

$search = trim((string)($_GET['q'] ?? ''));
$limit = min(200, max(10, (int)($_GET['limit'] ?? 50)));

if ($search !== '') {
    $s = $pdo->prepare(
        "SELECT id, username, action, details, ip_address, created_at
         FROM activity_logs
         WHERE username LIKE ? OR action LIKE ? OR details LIKE ?
         ORDER BY id DESC
         LIMIT {$limit}"
    );
    $term = "%{$search}%";
    $s->execute([$term, $term, $term]);
    $logs = $s->fetchAll();
} else {
    $logs = $pdo->query(
        "SELECT id, username, action, details, ip_address, created_at
         FROM activity_logs
         ORDER BY id DESC
         LIMIT {$limit}"
    )->fetchAll();
}

json_ok(['logs' => $logs]);
