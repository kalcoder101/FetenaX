<?php
// api/auth.php - Authentication actions for FetenaX
// Included by api.php. Variables available: $pdo, $requestData, $action, respond()

// ----------------- Auth Actions -----------------

if ($action === 'login') {
    $username = isset($requestData['username']) ? trim($requestData['username']) : '';
    $password = isset($requestData['password']) ? $requestData['password'] : '';

    if (empty($username) || empty($password)) {
        respond('error', ['message' => 'Please provide username/ID and password.']);
    }

    $stmt = $pdo->prepare("SELECT * FROM `users` WHERE `email` = ? OR `email` LIKE ? OR `userId` = ?");
    $stmt->execute([$username, trim($username) . '@%', $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user'] = [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'name' => $user['name'],
            'avatar' => $user['avatar'],
            'userId' => $user['userId']
        ];
        respond('success', ['user' => $_SESSION['user']]);
    } else {
        respond('error', ['message' => 'Invalid credentials. Please check your username/ID and password.']);
    }
}

if ($action === 'signup') {
    $name = isset($requestData['name']) ? trim($requestData['name']) : '';
    $username = isset($requestData['username']) ? trim($requestData['username']) : '';
    $password = isset($requestData['password']) ? $requestData['password'] : '';
    $userId = isset($requestData['userId']) ? trim($requestData['userId']) : '';
    $role = 'student';

    if (empty($name) || empty($username) || empty($password) || empty($userId)) {
        respond('error', ['message' => 'All fields are required.']);
    }

    if (strlen($username) < 3 || strlen($password) < 6) {
        respond('error', ['message' => 'Username must be at least 3 characters and password at least 6 characters.']);
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `email` = ? OR `userId` = ?");
    $stmt->execute([$username, $userId]);
    if ($stmt->fetchColumn() > 0) {
        respond('error', ['message' => 'Username or ID already exists.']);
    }

    $words = explode(' ', $name);
    $avatar = '';
    foreach ($words as $w) {
        $avatar .= strtoupper(substr($w, 0, 1));
    }
    $avatar = substr($avatar, 0, 2) ?: 'ST';

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO `users` (`email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$username, $hashedPassword, $role, $name, $avatar, $userId]);
    $newId = $pdo->lastInsertId();

    $_SESSION['user'] = [
        'id' => $newId,
        'email' => $username,
        'role' => $role,
        'name' => $name,
        'avatar' => $avatar,
        'userId' => $userId
    ];

    respond('success', ['user' => $_SESSION['user']]);
}

if ($action === 'logout') {
    session_destroy();
    respond('success');
}

if ($action === 'status') {
    // Default to disabling public signup; only enable if ALLOW_SIGNUP=true is set.
    $allowSignup = getenv('ALLOW_SIGNUP') === 'true';
    if (isset($_SESSION['user'])) {
        respond('success', ['user' => $_SESSION['user'], 'allowSignup' => $allowSignup]);
    } else {
        respond('success', ['user' => null, 'allowSignup' => $allowSignup]);
    }
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
