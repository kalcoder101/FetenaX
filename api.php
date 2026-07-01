<?php
// api.php - Lightweight router for FetenaX API
// Delegates to domain-specific handlers in the api/ directory.

// Maintenance mode check
$maintFlag = __DIR__ . '/.maintenance';
if (file_exists($maintFlag)) {
    header('HTTP/1.1 503 Service Unavailable');
    header('Retry-After: 300');
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'System under maintenance. Please try again later.']);
    exit;
}

// Start session only if not already started
if (session_status() === PHP_SESSION_NONE) {
    // Make sessions persist for 4 hours
    @ini_set('session.cookie_lifetime', 14400); // 4 hours
    @ini_set('session.gc_maxlifetime', 14400); // 4 hours
    @ini_set('session.cookie_httponly', 1);
    @ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

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

// File-serving actions bypass the JSON Content-Type header — they return raw bytes.
$isFileServeAction = ($action === 'study_serve_file' || $action === 'teacher_export_csv' || $action === 'download_resource');
if (!$isFileServeAction) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// Load DB connection
require_once 'db.php';

/**
 * Helper function to send a JSON response and exit.
 */
function respond($status, $data = []) {
    echo json_encode(array_merge(['status' => $status], $data));
    exit;
}

// ──────────────────────────────────────────────────
// Auth actions — no session required
// Signup is DISABLED by default. Enable by setting ALLOW_SIGNUP=true
// (in .htaccess, environment, or via a config file).
// ──────────────────────────────────────────────────
if ($action === 'signup' && getenv('ALLOW_SIGNUP') !== 'true') {
    respond('error', ['message' => 'Public signup is disabled. Please contact your teacher to get an account.']);
}
if (in_array($action, ['login', 'signup', 'logout', 'status'])) {
    // Pass signup availability to the status endpoint
    if ($action === 'status') {
        $GLOBALS['allowSignup'] = getenv('ALLOW_SIGNUP') === 'true';
    }
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

    // v31 Study & analytics (students + teachers)
    'study_list_subjects'             => 'study.php',
    'study_practice_by_subject'       => 'study.php',
    'study_generate_mock'             => 'study.php',
    'study_save_session'              => 'study.php',
    'study_srs_due'                   => 'study.php',
    'study_srs_stats'                 => 'study.php',
    'study_subject_mastery'           => 'study.php',
    'study_performance_history'       => 'study.php',
    'study_weakness_report'           => 'study.php',
    'study_list_resources'            => 'study.php',
    'study_add_resource'              => 'study.php',
    'study_delete_resource'           => 'study.php',
    'study_list_discussion'           => 'study.php',
    'study_add_discussion'            => 'study.php',
    'study_delete_discussion'         => 'study.php',
    'study_toggle_pin_discussion'     => 'study.php',
    'study_hide_discussion'           => 'study.php',
    'study_schedule_get'              => 'study.php',
    'study_schedule_add'              => 'study.php',
    'study_schedule_toggle'           => 'study.php',
    'study_schedule_delete'           => 'study.php',

    // v32 teacher analytics
    'study_class_analytics'           => 'study.php',
    'study_student_progress'          => 'study.php',
    'study_serve_file'                => 'study.php',
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
