<?php
define('PUBLIC_ENDPOINT', true);
require __DIR__ . '/../config.php';

$d = input();

$full     = required($d, 'full_name');
$username = required($d, 'username');
$phone    = required($d, 'phone');
$password = (string)($d['password'] ?? '');

if (!preg_match('/^[A-Za-z0-9_.-]{3,30}$/', $username)) {
    json_error('Username must be 3 to 30 characters (letters, numbers, underscores, dashes, dots).');
}
if (!preg_match('/^[0-9+() .-]{7,25}$/', $phone)) {
    json_error('Please enter a valid phone number.');
}
if (strlen($password) < 6) {
    json_error('Password must be at least 6 characters.');
}

// Check if username is already taken
$checkUser = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username=?');
$checkUser->execute([$username]);
if ((int)$checkUser->fetchColumn() > 0) {
    json_error('That username is already taken. Please choose another.');
}

// Check if phone number is already registered
$checkPhone = $pdo->prepare('SELECT COUNT(*) FROM users WHERE phone=?');
$checkPhone->execute([$phone]);
if ((int)$checkPhone->fetchColumn() > 0) {
    json_error('An account with this phone number is already registered.');
}

// Fallback email
$email = !empty($d['email']) ? trim((string)$d['email']) : ($username . '@ani.local');

$s = $pdo->prepare('INSERT INTO users(full_name,email,phone,username,password_hash) VALUES(?,?,?,?,?)');
$s->execute([$full, $email, $phone, $username, password_hash($password, PASSWORD_DEFAULT)]);

json_ok(['message' => 'Account created. You can now log in.']);
