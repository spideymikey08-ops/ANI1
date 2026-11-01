<?php
define('PUBLIC_ENDPOINT', true);
require __DIR__ . '/../config.php';

$d = input();

$username = required($d, 'username');
$password = (string)($d['password'] ?? '');

$s = $pdo->prepare('SELECT * FROM users WHERE username=? OR email=?');
$s->execute([$username, $username]);
$user = $s->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    json_error('Incorrect username or password.');
}

if (($user['status'] ?? 'active') === 'deactivated') {
    json_error('Your account has been deactivated. Please contact an administrator.');
}

session_regenerate_id(true);
$_SESSION['user_id']  = (int)$user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['role']     = $user['role'] ?? 'user';

log_activity($pdo, (int)$user['id'], $user['username'], 'User Login', 'Logged in as ' . $_SESSION['role']);

json_ok([
    'message'   => 'Welcome back!',
    'full_name' => $user['full_name'],
    'role'      => $_SESSION['role']
]);
