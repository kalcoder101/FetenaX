<?php
// api/profile.php - Profile Settings actions for FetenaX
// Included by api.php. Variables: $pdo, $requestData, $action, $currentUser, respond()

if ($action === 'update_profile') {
    $name       = isset($requestData['name'])        ? trim($requestData['name'])        : '';
    $avatar     = isset($requestData['avatar'])      ? trim($requestData['avatar'])      : '';
    $bio        = isset($requestData['bio'])         ? trim($requestData['bio'])         : '';
    $theme      = isset($requestData['theme'])       ? trim($requestData['theme'])       : 'auto';
    $newPass    = isset($requestData['newPassword']) ? $requestData['newPassword']       : '';
    $currentPass= isset($requestData['currentPassword']) ? $requestData['currentPassword'] : '';

    if (empty($name)) respond('error', ['message' => 'Name cannot be empty.']);
    if (strlen($name) < 2) respond('error', ['message' => 'Name must be at least 2 characters.']);
    if (strlen($bio) > 500) respond('error', ['message' => 'Bio cannot exceed 500 characters.']);

    // Validate theme
    if (!in_array($theme, ['dark', 'light', 'auto'])) $theme = 'auto';

    $stmt = $pdo->prepare("SELECT `password` FROM `users` WHERE `id` = ?");
    $stmt->execute([$currentUser['id']]);
    $row = $stmt->fetch();

    if (!empty($newPass)) {
        if (strlen($newPass) < 6) respond('error', ['message' => 'New password must be at least 6 characters.']);
        if (!password_verify($currentPass, $row['password'])) respond('error', ['message' => 'Current password is incorrect.']);
        $hashed = password_hash($newPass, PASSWORD_BCRYPT);
        
        $profileData = json_encode([
            'bio' => $bio,
            'theme' => $theme,
            'updated_at' => date('c')
        ]);
        
        $pdo->prepare("UPDATE `users` SET `name`=?,`avatar`=?,`password`=?,`profile_data`=? WHERE `id`=?")
            ->execute([$name, $avatar, $hashed, $profileData, $currentUser['id']]);
    } else {
        $profileData = json_encode([
            'bio' => $bio,
            'theme' => $theme,
            'updated_at' => date('c')
        ]);
        
        $pdo->prepare("UPDATE `users` SET `name`=?,`avatar`=?,`profile_data`=? WHERE `id`=?")
            ->execute([$name, $avatar, $profileData, $currentUser['id']]);
    }

    // Update session
    $_SESSION['user']['name']   = $name;
    $_SESSION['user']['avatar'] = $avatar;
    if (!isset($_SESSION['user']['profile_data'])) $_SESSION['user']['profile_data'] = [];
    $_SESSION['user']['profile_data']['bio'] = $bio;
    $_SESSION['user']['profile_data']['theme'] = $theme;

    respond('success', [
        'user' => $_SESSION['user'], 
        'message' => 'Profile updated successfully.'
    ]);
}

// Get extended profile info
if ($action === 'get_profile') {
    $stmt = $pdo->prepare("SELECT `id`, `name`, `avatar`, `email`, `userId`, `role`, `profile_data` FROM `users` WHERE `id` = ?");
    $stmt->execute([$currentUser['id']]);
    $profile = $stmt->fetch();
    
    if (!$profile) respond('error', ['message' => 'Profile not found.']);
    
    $profileData = [];
    if ($profile['profile_data']) {
        $profileData = json_decode($profile['profile_data'], true) ?: [];
    }
    
    respond('success', [
        'profile' => array_merge($profile, ['profile_data' => $profileData])
    ]);
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
