<?php
// api/profile.php - Profile Settings actions for FetenaX
// Included by api.php. Variables: $pdo, $requestData, $action, $currentUser, respond()

if ($action === 'update_profile') {
    $name       = isset($requestData['name'])        ? trim($requestData['name'])        : '';
    $avatar     = isset($requestData['avatar'])      ? trim($requestData['avatar'])      : '';
    $newPass    = isset($requestData['newPassword']) ? $requestData['newPassword']       : '';
    $currentPass= isset($requestData['currentPassword']) ? $requestData['currentPassword'] : '';

    if (empty($name)) respond('error', ['message' => 'Name cannot be empty.']);

    $stmt = $pdo->prepare("SELECT `password` FROM `users` WHERE `id` = ?");
    $stmt->execute([$currentUser['id']]);
    $row = $stmt->fetch();

    if (!empty($newPass)) {
        if (strlen($newPass) < 6) respond('error', ['message' => 'New password must be at least 6 characters.']);
        if (!password_verify($currentPass, $row['password'])) respond('error', ['message' => 'Current password is incorrect.']);
        $hashed = password_hash($newPass, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE `users` SET `name`=?,`avatar`=?,`password`=? WHERE `id`=?")
            ->execute([$name, $avatar, $hashed, $currentUser['id']]);
    } else {
        $pdo->prepare("UPDATE `users` SET `name`=?,`avatar`=? WHERE `id`=?")
            ->execute([$name, $avatar, $currentUser['id']]);
    }

    $_SESSION['user']['name']   = $name;
    $_SESSION['user']['avatar'] = $avatar;
    respond('success', ['user' => $_SESSION['user'], 'message' => 'Profile updated.']);
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
