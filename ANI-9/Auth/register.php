<?php
define('PUBLIC_ENDPOINT', true);
require __DIR__ . '/../config.php';

$d = input();

$full     = required($d, 'full_name');
$username = required($d, 'username');
$phone    = required($d, 'phone');
$password = (string)($d['password'] ?? '');
$confirm  = (string)($d['confirm_password'] ?? '');

if (!preg_match('/^[0-9+() .-]{7,25}$/', $phone)) {
    json_error('Please enter a valid phone number.');
}
if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
    json_error('Username must be 3-30 characters: letters, numbers, underscore only.');
}
if (strlen($password) < 6) {
    json_error('Password must be at least 6 characters.');
}
if ($password !== $confirm) {
    json_error('Passwords do not match.');
}

$check = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username=?');
$check->execute([$username]);
if ((int)$check->fetchColumn() > 0) {
    json_error('That username is already registered.');
}

$s = $pdo->prepare(
    'INSERT INTO users (full_name, phone, username, password_hash, status)
     VALUES (?, ?, ?, ?, ?)'
);

$s->execute([
    $full,
    $phone,
    $username,
    password_hash($password, PASSWORD_DEFAULT),
    'active'
]);

json_ok(['message' => 'Registration successful. You can now log in.']);