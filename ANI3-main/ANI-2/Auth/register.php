<?php
define('PUBLIC_ENDPOINT', true);
require __DIR__ . '/../config.php';

$d = input();

$full     = required($d, 'full_name');
$email    = required($d, 'email');
$phone    = required($d, 'phone');
$username = required($d, 'username');
$password = (string)($d['password'] ?? '');
$confirm  = (string)($d['confirm_password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Please enter a valid email address.');
}
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

$check = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username=? OR email=?');
$check->execute([$username, $email]);
if ((int)$check->fetchColumn() > 0) {
    json_error('That username or email is already registered.');
}

$s = $pdo->prepare('INSERT INTO users(full_name,email,phone,username,password_hash) VALUES(?,?,?,?,?)');
$s->execute([$full, $email, $phone, $username, password_hash($password, PASSWORD_DEFAULT)]);

json_ok(['message' => 'Account created. You can now log in.']);
