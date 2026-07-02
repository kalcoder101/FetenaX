<?php
// api/auth.php - Authentication actions for FetenaX
// Included by api.php. Variables available: $pdo, $requestData, $action, respond()

// ──────────────────────────────────────────────────
// Rate Limiting — track failed login attempts per IP
// ──────────────────────────────────────────────────
$MAX_LOGIN_ATTEMPTS = 5;       // max failures before lockout
$LOCKOUT_MINUTES    = 15;      // lockout duration in minutes

/**
 * Ensure login_attempts table exists (auto-create on first use).
 */
function ensureLoginAttemptsTable($pdo) {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `login_attempts` (
                `id`         INT AUTO_INCREMENT PRIMARY KEY,
                `ip_address` VARCHAR(45) NOT NULL,
                `username`   VARCHAR(255) NOT NULL,
                `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_ip_time` (`ip_address`, `attempted_at`),
                INDEX `idx_cleanup` (`attempted_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    } catch (Exception $e) { /* table may already exist */ }
}

/**
 * Count recent failed attempts for an IP within the lockout window.
 */
function getRecentFailedAttempts($pdo, $ip, $lockoutMinutes) {
    $cutoff = date('Y-m-d H:i:s', strtotime("-{$lockoutMinutes} minutes"));
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `login_attempts` WHERE `ip_address` = ? AND `attempted_at` > ?");
    $stmt->execute([$ip, $cutoff]);
    return (int) $stmt->fetchColumn();
}

/**
 * Record a failed login attempt.
 */
function recordFailedAttempt($pdo, $ip, $username) {
    $stmt = $pdo->prepare("INSERT INTO `login_attempts` (`ip_address`, `username`) VALUES (?, ?)");
    $stmt->execute([$ip, $username]);
}

/**
 * Clear failed attempts for an IP after successful login.
 */
function clearFailedAttempts($pdo, $ip) {
    $stmt = $pdo->prepare("DELETE FROM `login_attempts` WHERE `ip_address` = ?");
    $stmt->execute([$ip]);
}

/**
 * Purge old login attempt records (> 1 hour) to keep the table small.
 * Called occasionally to prevent unbounded growth.
 */
function purgeOldAttempts($pdo) {
    try {
        $pdo->exec("DELETE FROM `login_attempts` WHERE `attempted_at` < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    } catch (Exception $e) { /* silent */ }
}

// ----------------- Auth Actions -----------------

if ($action === 'login') {
    $username = isset($requestData['username']) ? trim($requestData['username']) : '';
    $password = isset($requestData['password']) ? $requestData['password'] : '';

    if (empty($username) || empty($password)) {
        respond('error', ['message' => 'Please provide username/ID and password.']);
    }

    // Rate limiting check
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    ensureLoginAttemptsTable($pdo);
    $recentFails = getRecentFailedAttempts($pdo, $clientIP, $LOCKOUT_MINUTES);

    if ($recentFails >= $MAX_LOGIN_ATTEMPTS) {
        respond('error', ['message' => "Too many login attempts. Please try again in {$LOCKOUT_MINUTES} minutes."]);
    }

    $stmt = $pdo->prepare("SELECT * FROM `users` WHERE `email` = ? OR `email` LIKE ? OR `userId` = ?");
    $stmt->execute([$username, trim($username) . '@%', $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // Success — clear failed attempts and set session
        clearFailedAttempts($pdo, $clientIP);

        // Occasionally purge old records
        if (mt_rand(1, 20) === 1) purgeOldAttempts($pdo);

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
        // Failure — record the attempt
        recordFailedAttempt($pdo, $clientIP, $username);
        $remaining = $MAX_LOGIN_ATTEMPTS - $recentFails - 1;
        $msg = 'Invalid credentials. Please check your username/ID and password.';
        if ($remaining <= 2 && $remaining > 0) {
            $msg .= " ({$remaining} attempt" . ($remaining === 1 ? '' : 's') . " remaining before lockout)";
        }
        respond('error', ['message' => $msg]);
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
    $allowSignup = isset($GLOBALS['allowSignup']) ? $GLOBALS['allowSignup'] : (getenv('ALLOW_SIGNUP') === 'true');
    $csrfToken   = isset($GLOBALS['csrfToken']) ? $GLOBALS['csrfToken'] : ($_SESSION['csrf_token'] ?? '');

    if (isset($_SESSION['user'])) {
        respond('success', ['user' => $_SESSION['user'], 'allowSignup' => $allowSignup, 'csrfToken' => $csrfToken]);
    } else {
        respond('success', ['user' => null, 'allowSignup' => $allowSignup, 'csrfToken' => $csrfToken]);
    }
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
