<?php
// api.php - Lightweight router for FetenaX API
// Delegates to domain-specific handlers in the api/ directory.

session_start();
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
