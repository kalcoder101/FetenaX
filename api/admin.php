<?php
// api/admin.php - System administration actions for FetenaX
// Included by api.php for admin_* actions.
// Variables available: $pdo, $requestData, $action, $currentUser, respond()

if ($currentUser['role'] !== 'system_admin') {
    respond('error', ['message' => 'System administrator access required.']);
}

function adminAllowedRole($role) {
    return in_array($role, ['student', 'teacher', 'system_admin'], true);
}

if ($action === 'admin_dashboard') {
    $userCount = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
    $studentCount = (int)$pdo->query("SELECT COUNT(*) FROM `users` WHERE `role` = 'student'")->fetchColumn();
    $teacherCount = (int)$pdo->query("SELECT COUNT(*) FROM `users` WHERE `role` = 'teacher'")->fetchColumn();
    $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM `users` WHERE `role` = 'system_admin'")->fetchColumn();
    $examCount = (int)$pdo->query("SELECT COUNT(*) FROM `exams`")->fetchColumn();
    $attemptCount = (int)$pdo->query("SELECT COUNT(*) FROM `results`")->fetchColumn();
    $avgScore = $pdo->query("SELECT AVG(score) FROM `results`")->fetchColumn();

    $recentUsers = $pdo->query("SELECT id, name, email, role, userId FROM `users` ORDER BY id DESC LIMIT 8")->fetchAll();
    $recentExams = $pdo->query("SELECT id, title, subject, createdBy, createdAt FROM `exams` ORDER BY id DESC LIMIT 8")->fetchAll();

    respond('success', [
        'stats' => [
            'users' => $userCount,
            'students' => $studentCount,
            'teachers' => $teacherCount,
            'admins' => $adminCount,
            'exams' => $examCount,
            'attempts' => $attemptCount,
            'averageScore' => $avgScore !== null ? (int)round($avgScore) : 0,
        ],
        'recentUsers' => $recentUsers,
        'recentExams' => $recentExams,
    ]);
}

if ($action === 'admin_users') {
    $stmt = $pdo->query("SELECT id, name, email, userId, role, avatar FROM `users` ORDER BY role ASC, name ASC");
    respond('success', ['users' => $stmt->fetchAll()]);
}

if ($action === 'admin_create_user') {
    $name = isset($requestData['name']) ? trim($requestData['name']) : '';
    $email = isset($requestData['email']) ? trim($requestData['email']) : '';
    $userId = isset($requestData['userId']) ? trim($requestData['userId']) : '';
    $password = isset($requestData['password']) ? $requestData['password'] : '';
    $role = isset($requestData['role']) ? trim($requestData['role']) : 'student';

    if ($name === '' || $email === '' || $userId === '' || $password === '') {
        respond('error', ['message' => 'Name, email, student ID, and password are required.']);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond('error', ['message' => 'Please enter a valid email address.']);
    }
    if (strlen($password) < 6) {
        respond('error', ['message' => 'Password must be at least 6 characters.']);
    }
    if (!adminAllowedRole($role)) {
        respond('error', ['message' => 'That role is not allowed.']);
    }

    $dup = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `email` = ? OR `userId` = ?");
    $dup->execute([$email, $userId]);
    if ((int)$dup->fetchColumn() > 0) {
        respond('error', ['message' => 'A user with that email or student ID already exists.']);
    }

    $words = preg_split('/\s+/', $name) ?: [];
    $avatar = '';
    foreach ($words as $w) {
        if ($w !== '') $avatar .= strtoupper(substr($w, 0, 1));
    }
    $avatar = substr($avatar, 0, 2) ?: strtoupper(substr($role, 0, 2));

    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO `users` (`email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$email, $hashed, $role, $name, $avatar, $userId]);

    respond('success', ['message' => 'User created successfully.']);
}

if ($action === 'admin_update_user_role') {
    $userId = isset($requestData['userId']) ? (int)$requestData['userId'] : 0;
    $role = isset($requestData['role']) ? trim($requestData['role']) : '';

    if ($userId <= 0 || !adminAllowedRole($role)) {
        respond('error', ['message' => 'Invalid user or role.']);
    }

    if ($userId === $currentUser['id']) {
        respond('error', ['message' => 'You cannot change your own role.']);
    }

    $stmt = $pdo->prepare("UPDATE `users` SET `role` = ? WHERE `id` = ?");
    $stmt->execute([$role, $userId]);

    respond('success', ['message' => 'User role updated.']);
}

if ($action === 'admin_reset_user_password') {
    $userId = isset($requestData['userId']) ? (int)$requestData['userId'] : 0;
    $newPassword = isset($requestData['newPassword']) ? trim($requestData['newPassword']) : '';

    if ($userId <= 0 || strlen($newPassword) < 6) {
        respond('error', ['message' => 'A password of at least 6 characters is required.']);
    }
    if ($userId === $currentUser['id']) {
        respond('error', ['message' => 'You cannot reset your own password from here.']);
    }

    $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE `users` SET `password` = ? WHERE `id` = ?");
    $stmt->execute([$hashed, $userId]);

    respond('success', ['message' => 'Password updated successfully.']);
}

if ($action === 'admin_delete_user') {
    $userId = isset($requestData['userId']) ? (int)$requestData['userId'] : 0;

    if ($userId <= 0) {
        respond('error', ['message' => 'Invalid user selection.']);
    }
    if ($userId === $currentUser['id']) {
        respond('error', ['message' => 'You cannot delete your own account.']);
    }

    $stmt = $pdo->prepare("DELETE FROM `users` WHERE `id` = ?");
    $stmt->execute([$userId]);

    respond('success', ['message' => 'User deleted successfully.']);
}

respond('error', ['message' => 'Action not found: ' . $action]);
