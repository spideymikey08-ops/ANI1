<?php
// Ani - Rice Farm Management System
// Shared bootstrap: session, database connection and JSON helpers.
// Every endpoint requires this file.

// Set secure session cookie parameters before session_start()
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

// Global uncaught exception handler: output clean JSON instead of HTML fatal error pages
set_exception_handler(function(Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
});

// Use Philippine time so "today" matches the farmer's calendar (not UTC).
date_default_timezone_set('Asia/Manila');

// ---------------------------------------------------------------------
// Settings
// Override anything here by copying config.local.example.php to
// config.local.php (that file is ignored by git, so secrets stay private).
// ---------------------------------------------------------------------
$host    = 'localhost';
$db      = 'ani';
$user    = 'root';
$pass    = '';
$charset = 'utf8mb4';

if (is_file(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

// Chatbot: set ANTHROPIC_API_KEY in config.local.php (or as an environment
// variable) to enable AI answers. Leave it empty to use the built-in answers.
if (!defined('ANTHROPIC_API_KEY')) {
    define('ANTHROPIC_API_KEY', getenv('ANTHROPIC_API_KEY') ?: '');
}
// define('ANTHROPIC_MODEL', 'claude-3-5-haiku-20241022');

// ---------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    try {
        $serverPdo = new PDO("mysql:host=$host;charset=$charset", $user, $pass, $options);
        $dbs = $serverPdo->query("SHOW DATABASES LIKE 'ani%'")->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($dbs)) {
            $pdo = new PDO("mysql:host=$host;dbname={$dbs[0]};charset=$charset", $user, $pass, $options);
            $db = $dbs[0];
        }
    } catch (Exception $e2) {
        // Fallback failed
    }

    if (!isset($pdo)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed. Start XAMPP MySQL and import ani.sql.']);
        exit;
    }
}

// Auto-migrate schema updates safely
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS farm_inventory (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            item_name VARCHAR(150) NOT NULL,
            category ENUM('Rice Seeds','Fertilizers','Pesticides','Other Supplies') NOT NULL DEFAULT 'Other Supplies',
            quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
            unit VARCHAR(30) NOT NULL DEFAULT 'kg',
            purchase_date DATE NOT NULL,
            unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
            supplier VARCHAR(150) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_inv_category (category),
            INDEX idx_inv_date (purchase_date)
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS inventory_logs (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            item_id INT UNSIGNED NOT NULL,
            action_type ENUM('Used','Restocked','Adjustment') NOT NULL DEFAULT 'Used',
            quantity DECIMAL(10,2) NOT NULL,
            used_date DATE NOT NULL,
            plot_id INT UNSIGNED DEFAULT NULL,
            notes VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    ");
    $pdo->exec("ALTER TABLE finance_transactions MODIFY COLUMN plot_id INT UNSIGNED DEFAULT NULL;");
} catch (Exception $migrationError) {
    // Silently continue if already migrated or user lacks alter privileges
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
if (!function_exists('input')) {
    function input(): array {
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
        return $_POST ?: [];
    }
}

if (!function_exists('json_ok')) {
    function json_ok($data = []): void {
        echo json_encode(array_merge(['success' => true], $data));
        exit;
    }
}

if (!function_exists('json_error')) {
    function json_error(string $message, int $code = 400): void {
        http_response_code($code);
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }
}

if (!function_exists('required')) {
    function required(array $data, string $key): string {
        $value = trim((string)($data[$key] ?? ''));
        if ($value === '') json_error("Missing required field: $key");
        return $value;
    }
}

if (!function_exists('require_admin')) {
    function require_admin(): void {
        if (empty($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
            json_error('Administrator privileges required.', 403);
        }
    }
}

if (!function_exists('log_activity')) {
    function log_activity(PDO $pdo, ?int $userId, string $username, string $action, ?string $details = null): void {
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $s = $pdo->prepare('INSERT INTO activity_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)');
            $s->execute([$userId, $username, $action, $details, $ip]);
        } catch (Exception $e) {
            // Silently continue if logging table is not ready
        }
    }
}

// Every endpoint requires login, except login.php / register.php / logout.php
// (they define PUBLIC_ENDPOINT before requiring this file).
if (!defined('PUBLIC_ENDPOINT') && empty($_SESSION['user_id'])) {
    json_error('Please log in first.', 401);
}
