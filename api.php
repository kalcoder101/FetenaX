<?php
// api.php - Lightweight router for FetenaX API
// Delegates to domain-specific handlers in the api/ directory.

session_start();
// Make sessions persist for 30 days so users don't get logged out constantly
ini_set('session.cookie_lifetime', 30 * 86400); // 30 days
ini_set('session.gc_maxlifetime', 30 * 86400); // 30 days
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once 'db.php';

// Parse request data (JSON body or standard POST/GET)
$requestData = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
    if (strpos($contentType, 'application/json') !== false) {
        $content = trim(file_get_contents("php://input"));
        $requestData = json_decode($content, true) ?: [];
    } else {
        $requestData = $_POST;
    }
} else {
    $requestData = $_GET;
}

$action = isset($requestData['action']) ? $requestData['action'] : '';

/**
 * Helper function to send a JSON response and exit.
 */
function respond($status, $data = []) {
    echo json_encode(array_merge(['status' => $status], $data));
    exit;
}

// ──────────────────────────────────────────────────
// Auth actions — no session required
// ──────────────────────────────────────────────────
if (in_array($action, ['login', 'signup', 'logout', 'status'])) {
    require __DIR__ . '/api/auth.php';
    exit;
}

// ──────────────────────────────────────────────────
// Verify session for all other actions
// ──────────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond('error', ['message' => 'Unauthorized. Please log in.']);
}
$currentUser = $_SESSION['user'];

// ──────────────────────────────────────────────────
// CSRF Protection — validate token for state-changing POST actions
// Skipped for GET requests and the auth actions already handled above.
// ──────────────────────────────────────────────────
$csrfRequiredActions = [
    // Student
    'save_answer', 'toggle_flag', 'submit_exam',
    // Profile
    'update_profile',
    // Notifications
    'mark_notification_read', 'mark_all_notifications_read',
    // Question Bank
    'teacher_add_to_bank', 'teacher_delete_from_bank',
    'teacher_import_from_bank', 'teacher_save_exam_to_bank',
    // Groups
    'teacher_create_group', 'teacher_delete_group',
    'teacher_group_member', 'teacher_assign_exam_group',
    // Teacher (these are caught by the catch-all below, but listed explicitly for clarity)
    'teacher_create_exam', 'teacher_edit_exam', 'teacher_delete_exam',
    'teacher_reset_password', 'teacher_remove_student',
    'teacher_bulk_import', 'teacher_bulk_import_exam',
    'teacher_save_template', 'teacher_delete_template',
];

// Also require CSRF for any teacher_* action via POST that isn't explicitly read-only
$readOnlyTeacherActions = [
    'teacher_stats', 'teacher_analytics', 'teacher_attempts',
    'teacher_students', 'teacher_preview_exam', 'teacher_question_analytics',
    'teacher_export_csv', 'teacher_list_templates', 'teacher_student_profile',
    'teacher_get_bank', 'teacher_list_groups'
];

$isPostMethod = ($_SERVER['REQUEST_METHOD'] === 'POST');
$needsCsrf = in_array($action, $csrfRequiredActions, true)
          || ($isPostMethod && strpos($action, 'teacher_') === 0 && !in_array($action, $readOnlyTeacherActions, true));

if ($needsCsrf) {
    $submittedToken = isset($requestData['csrf_token']) ? $requestData['csrf_token'] : '';
    $sessionToken   = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : '';
    if ($submittedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $submittedToken)) {
        respond('error', ['message' => 'Invalid or missing CSRF token. Please refresh and try again.']);
    }
}

// Load shared helpers (badge constants, check_badges, Math_round_or_ceil, etc.)
require __DIR__ . '/api/init.php';

// ──────────────────────────────────────────────────
// Route table — maps each action to its domain file
// ──────────────────────────────────────────────────
$routeMap = [
    // Student / General
    'get_exams'              => 'student.php',
    'get_exam'               => 'student.php',
    'save_answer'            => 'student.php',
    'toggle_flag'            => 'student.php',
    'submit_exam'            => 'student.php',
    'get_student_results'    => 'student.php',
    'practice_exam'          => 'student.php',
    'get_leaderboard'        => 'student.php',
    'get_badges'             => 'student.php',
    'get_calendar_data'      => 'student.php',
    'get_subject_categories'  => 'student.php',
    'get_attempt_review'     => 'student.php',

    // Profile Settings
    'update_profile'         => 'profile.php',

    // Notifications
    'get_notifications'          => 'notifications.php',
    'mark_notification_read'     => 'notifications.php',
    'mark_all_notifications_read' => 'notifications.php',

    // Question Bank
    'teacher_get_bank'           => 'question_bank.php',
    'teacher_add_to_bank'        => 'question_bank.php',
    'teacher_delete_from_bank'   => 'question_bank.php',
    'teacher_import_from_bank'   => 'question_bank.php',
    'teacher_save_exam_to_bank'  => 'question_bank.php',

    // Class Groups
    'teacher_create_group'       => 'groups.php',
    'teacher_list_groups'        => 'groups.php',
    'teacher_delete_group'       => 'groups.php',
    'teacher_group_member'       => 'groups.php',
    'teacher_assign_exam_group'  => 'groups.php',
];

// Check for exact match in route map
if (isset($routeMap[$action])) {
    require __DIR__ . '/api/' . $routeMap[$action];
    exit;
}

// Catch-all for remaining teacher_* actions
if (strpos($action, 'teacher_') === 0) {
    require __DIR__ . '/api/teacher.php';
    exit;
}

// No matching action found
respond('error', ['message' => 'Action not found: ' . $action]);
