<?php
require __DIR__ . '/../config.php';
require_admin();

$d = input();
$action = trim((string)($d['action'] ?? 'list'));
$currentAdminId = (int)$_SESSION['user_id'];
$currentAdminName = (string)$_SESSION['username'];

switch ($action) {
    case 'list':
        $users = $pdo->query(
            "SELECT id, full_name, email, phone, username, role, status, created_at
             FROM users
             ORDER BY id DESC"
        )->fetchAll();
        json_ok(['users' => $users]);
        break;

    case 'create':
        $full = required($d, 'full_name');
        $email = required($d, 'email');
        $phone = trim((string)($d['phone'] ?? ''));
        $username = required($d, 'username');
        $password = (string)($d['password'] ?? '');
        $role = in_array($d['role'] ?? '', ['admin', 'user'], true) ? $d['role'] : 'user';
        $status = in_array($d['status'] ?? '', ['active', 'deactivated'], true) ? $d['status'] : 'active';

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Please enter a valid email address.');
        }
        if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
            json_error('Username must be 3-30 characters: letters, numbers, underscore only.');
        }
        if (strlen($password) < 6) {
            json_error('Password must be at least 6 characters.');
        }

        // Check uniqueness
        $chk = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username=? OR email=?');
        $chk->execute([$username, $email]);
        if ((int)$chk->fetchColumn() > 0) {
            json_error('That username or email is already taken.');
        }

        $s = $pdo->prepare(
            'INSERT INTO users (full_name, email, phone, username, password_hash, role, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $s->execute([
            $full,
            $email,
            $phone ?: null,
            $username,
            password_hash($password, PASSWORD_DEFAULT),
            $role,
            $status
        ]);

        $newId = $pdo->lastInsertId();
        log_activity($pdo, $currentAdminId, $currentAdminName, 'Create User', "Created user '$username' (Role: $role)");

        json_ok(['message' => 'User created successfully.', 'id' => $newId]);
        break;

    case 'update':
        $userId = (int)($d['id'] ?? 0);
        $full = required($d, 'full_name');
        $email = required($d, 'email');
        $phone = trim((string)($d['phone'] ?? ''));
        $username = required($d, 'username');
        $role = in_array($d['role'] ?? '', ['admin', 'user'], true) ? $d['role'] : 'user';
        $status = in_array($d['status'] ?? '', ['active', 'deactivated'], true) ? $d['status'] : 'active';

        if (!$userId) json_error('Invalid user ID.');

        // Prevent admin from deactivating or demoting themselves
        if ($userId === $currentAdminId) {
            if ($role !== 'admin') json_error('You cannot remove your own admin role.');
            if ($status !== 'active') json_error('You cannot deactivate your own account.');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Please enter a valid email address.');
        }

        // Check uniqueness excluding current user
        $chk = $pdo->prepare('SELECT COUNT(*) FROM users WHERE (username=? OR email=?) AND id != ?');
        $chk->execute([$username, $email, $userId]);
        if ((int)$chk->fetchColumn() > 0) {
            json_error('Username or email is already taken by another account.');
        }

        $s = $pdo->prepare(
            'UPDATE users
             SET full_name=?, email=?, phone=?, username=?, role=?, status=?
             WHERE id=?'
        );
        $s->execute([$full, $email, $phone ?: null, $username, $role, $status, $userId]);

        log_activity($pdo, $currentAdminId, $currentAdminName, 'Update User', "Updated user ID $userId ($username)");

        json_ok(['message' => 'User account updated.']);
        break;

    case 'toggle_status':
        $userId = (int)($d['id'] ?? 0);
        if (!$userId) json_error('Invalid user ID.');

        if ($userId === $currentAdminId) {
            json_error('You cannot deactivate your own account.');
        }

        $s = $pdo->prepare('SELECT username, status FROM users WHERE id=?');
        $s->execute([$userId]);
        $target = $s->fetch();
        if (!$target) json_error('User not found.');

        $newStatus = ($target['status'] === 'active') ? 'deactivated' : 'active';
        $up = $pdo->prepare('UPDATE users SET status=? WHERE id=?');
        $up->execute([$newStatus, $userId]);

        log_activity($pdo, $currentAdminId, $currentAdminName, 'Toggle User Status', "Changed {$target['username']} status to $newStatus");

        json_ok([
            'message' => "User {$target['username']} is now $newStatus.",
            'status'  => $newStatus
        ]);
        break;

    case 'reset_password':
        $userId = (int)($d['id'] ?? 0);
        $newPass = (string)($d['password'] ?? '');

        if (!$userId) json_error('Invalid user ID.');
        if (strlen($newPass) < 6) json_error('Password must be at least 6 characters.');

        $s = $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');
        $s->execute([password_hash($newPass, PASSWORD_DEFAULT), $userId]);

        log_activity($pdo, $currentAdminId, $currentAdminName, 'Password Reset', "Reset password for user ID $userId");

        json_ok(['message' => 'Password reset successfully.']);
        break;

    case 'delete':
        $userId = (int)($d['id'] ?? 0);
        if (!$userId) json_error('Invalid user ID.');

        if ($userId === $currentAdminId) {
            json_error('You cannot delete your own account.');
        }

        $s = $pdo->prepare('SELECT username FROM users WHERE id=?');
        $s->execute([$userId]);
        $target = $s->fetch();
        if (!$target) json_error('User not found.');

        $del = $pdo->prepare('DELETE FROM users WHERE id=?');
        $del->execute([$userId]);

        log_activity($pdo, $currentAdminId, $currentAdminName, 'Delete User', "Deleted user {$target['username']} (ID $userId)");

        json_ok(['message' => "User {$target['username']} deleted successfully."]);
        break;

    default:
        json_error('Invalid action.');
}
