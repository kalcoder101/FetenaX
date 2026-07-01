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

    $recentUsers = $pdo->query("SELECT id, name, email, role, userId, createdAt FROM `users` ORDER BY id DESC LIMIT 8")->fetchAll();
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
    $stmt = $pdo->query("SELECT id, name, email, userId, role, avatar, createdAt FROM `users` ORDER BY role ASC, name ASC");
    respond('success', ['users' => $stmt->fetchAll()]);
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

    respond('success', ['message' => 'Password reset successfully.']);
}

respond('error', ['message' => 'Action not found: ' . $action]);
