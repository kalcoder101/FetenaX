<?php
// api.php - Backend API for FetenaX
session_start();
header('Content-Type: application/json');

require_once 'db.php';

// Helper to get request data (handles JSON and standard POST)
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

// Helper function to return JSON and exit
function respond($status, $data = []) {
    echo json_encode(array_merge(['status' => $status], $data));
    exit;
}

// ----------------- Auth Actions -----------------

if ($action === 'login') {
    $username = isset($requestData['username']) ? trim($requestData['username']) : '';
    $password = isset($requestData['password']) ? $requestData['password'] : '';

    if (empty($username) || empty($password)) {
        respond('error', ['message' => 'Please provide username/ID and password.']);
    }

    // Check DB for matching credentials
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
    $role = 'student'; // Only student signup allowed

    if (empty($name) || empty($username) || empty($password) || empty($userId)) {
        respond('error', ['message' => 'All fields are required.']);
    }

    if (strlen($username) < 3 || strlen($password) < 6) {
        respond('error', ['message' => 'Username must be at least 3 characters and password at least 6 characters.']);
    }

    // Check if email or userId exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `email` = ? OR `userId` = ?");
    $stmt->execute([$username, $userId]);
    if ($stmt->fetchColumn() > 0) {
        respond('error', ['message' => 'Username or ID already exists.']);
    }

    // Generate avatar
    $words = explode(' ', $name);
    $avatar = '';
    foreach ($words as $w) {
        $avatar .= strtoupper(substr($w, 0, 1));
    }
    $avatar = substr($avatar, 0, 2) ?: 'ST';

    // Insert
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
    if (isset($_SESSION['user'])) {
        respond('success', ['user' => $_SESSION['user']]);
    } else {
        respond('success', ['user' => null]);
    }
}

// ----------------- Verify Session -----------------
if (!isset($_SESSION['user'])) {
    respond('error', ['message' => 'Unauthorized. Please log in.']);
}
$currentUser = $_SESSION['user'];

// ----------------- Student / General Actions -----------------

if ($action === 'get_exams') {
    $stmt = $pdo->query("SELECT * FROM `exams` ORDER BY `id` ASC");
    $exams = $stmt->fetchAll();
    respond('success', ['exams' => $exams]);
}

if ($action === 'get_exam') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) {
        respond('error', ['message' => 'Invalid Exam ID.']);
    }

    // Fetch exam
    $stmt = $pdo->prepare("SELECT * FROM `exams` WHERE `id` = ?");
    $stmt->execute([$examId]);
    $exam = $stmt->fetch();
    if (!$exam) {
        respond('error', ['message' => 'Exam not found.']);
    }

    // Fetch questions
    $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `points` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll();

    // Map database question format to array format expected by JS frontend
    $formattedQuestions = [];
    foreach ($questions as $q) {
        $formattedQuestions[] = [
            'id' => $q['id'],
            'question' => $q['question'],
            'options' => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'points' => (int)$q['points']
        ];
    }
    $exam['questions'] = $formattedQuestions;

    // Fetch existing student progress
    $stmt = $pdo->prepare("SELECT `questionId`, `selectedAnswer`, `isFlagged` FROM `exam_progress` WHERE `studentId` = ? AND `examId` = ?");
    $stmt->execute([$currentUser['id'], $examId]);
    $progressRows = $stmt->fetchAll();

    $progress = [];
    foreach ($progressRows as $row) {
        $progress[$row['questionId']] = [
            'selectedAnswer' => $row['selectedAnswer'] !== null ? (int)$row['selectedAnswer'] : null,
            'isFlagged' => (bool)$row['isFlagged']
        ];
    }

    respond('success', [
        'exam' => $exam,
        'progress' => $progress
    ]);
}

if ($action === 'save_answer') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    $questionId = isset($requestData['questionId']) ? (int)$requestData['questionId'] : 0;
    $selectedAnswer = isset($requestData['selectedAnswer']) && $requestData['selectedAnswer'] !== '' ? (int)$requestData['selectedAnswer'] : null;

    if ($examId <= 0 || $questionId <= 0) {
        respond('error', ['message' => 'Invalid parameters.']);
    }

    // Upsert answer in progress table
    $stmt = $pdo->prepare("INSERT INTO `exam_progress` (`studentId`, `examId`, `questionId`, `selectedAnswer`) 
                           VALUES (?, ?, ?, ?) 
                           ON DUPLICATE KEY UPDATE `selectedAnswer` = VALUES(`selectedAnswer`)");
    $stmt->execute([$currentUser['id'], $examId, $questionId, $selectedAnswer]);
    respond('success');
}

if ($action === 'toggle_flag') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    $questionId = isset($requestData['questionId']) ? (int)$requestData['questionId'] : 0;
    $isFlagged = isset($requestData['isFlagged']) ? (int)$requestData['isFlagged'] : 0;

    if ($examId <= 0 || $questionId <= 0) {
        respond('error', ['message' => 'Invalid parameters.']);
    }

    $stmt = $pdo->prepare("INSERT INTO `exam_progress` (`studentId`, `examId`, `questionId`, `isFlagged`) 
                           VALUES (?, ?, ?, ?) 
                           ON DUPLICATE KEY UPDATE `isFlagged` = VALUES(`isFlagged`)");
    $stmt->execute([$currentUser['id'], $examId, $questionId, $isFlagged]);
    respond('success');
}

if ($action === 'submit_exam') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    $timeTaken = isset($requestData['timeTaken']) ? (int)$requestData['timeTaken'] : 0;

    if ($examId <= 0) {
        respond('error', ['message' => 'Invalid Exam ID.']);
    }

    // Fetch questions with full detail for answer review (including points for weighted scoring)
    $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll();
    if (count($questions) === 0) {
        respond('error', ['message' => 'No questions found for this exam.']);
    }

    // Fetch saved progress/answers
    $stmt = $pdo->prepare("SELECT `questionId`, `selectedAnswer` FROM `exam_progress` WHERE `studentId` = ? AND `examId` = ?");
    $stmt->execute([$currentUser['id'], $examId]);
    $progressRows = $stmt->fetchAll();
    $progressAnswers = [];
    foreach ($progressRows as $row) {
        $progressAnswers[$row['questionId']] = $row['selectedAnswer'];
    }

    $correctCount = 0;
    $earnedPoints = 0;
    $totalPoints  = 0;
    $answerReview = [];
    foreach ($questions as $q) {
        $qPoints = isset($q['points']) ? (int)$q['points'] : 1;
        $totalPoints += $qPoints;
        $ans = isset($progressAnswers[$q['id']]) ? $progressAnswers[$q['id']] : null;
        $isCorrect = ($ans !== null && (int)$ans === (int)$q['correctAnswer']);
        if ($isCorrect) { $correctCount++; $earnedPoints += $qPoints; }
        $answerReview[] = [
            'question'       => $q['question'],
            'options'        => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'selectedAnswer' => $ans !== null ? (int)$ans : null,
            'correctAnswer'  => (int)$q['correctAnswer'],
            'isCorrect'      => $isCorrect,
            'points'         => $qPoints
        ];
    }

    // Weighted score: earned points / total points * 100
    $score = $totalPoints > 0 ? Math_round_or_ceil(($earnedPoints / $totalPoints) * 100) : 0;

    // Fetch exam title for results page
    $stmtE = $pdo->prepare("SELECT `title` FROM `exams` WHERE `id` = ?");
    $stmtE->execute([$examId]);
    $examRow = $stmtE->fetch();
    $examTitle = $examRow ? $examRow['title'] : '';

    // Save final result
    $stmt = $pdo->prepare("INSERT INTO `results` (`examId`, `studentId`, `score`, `correctAnswers`, `totalQuestions`, `timeTaken`, `completedAt`) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$examId, $currentUser['id'], $score, $correctCount, count($questions), $timeTaken]);

    // Clear progress
    $stmt = $pdo->prepare("DELETE FROM `exam_progress` WHERE `studentId` = ? AND `examId` = ?");
    $stmt->execute([$currentUser['id'], $examId]);

    // Award badges
    $newBadges = check_and_award_badges($pdo, $currentUser['id']);

    respond('success', [
        'score'          => $score,
        'correctAnswers' => $correctCount,
        'totalQuestions' => count($questions),
        'earnedPoints'   => $earnedPoints,
        'totalPoints'    => $totalPoints,
        'timeTaken'      => $timeTaken,
        'examTitle'      => $examTitle,
        'answerReview'   => $answerReview,
        'newBadges'      => $newBadges
    ]);
}

// ---- Badge check helper ----
function check_and_award_badges($pdo, $studentId) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `results` WHERE `studentId`=?");
    $stmt->execute([$studentId]);
    $total = (int)$stmt->fetchColumn();

    $stmt2 = $pdo->prepare("SELECT MAX(score) FROM `results` WHERE `studentId`=?");
    $stmt2->execute([$studentId]);
    $best = (int)$stmt2->fetchColumn();

    $stmt3 = $pdo->prepare("SELECT COUNT(*) FROM `results` WHERE `studentId`=? AND `score`>=60");
    $stmt3->execute([$studentId]);
    $passed = (int)$stmt3->fetchColumn();

    $toAward = [];
    if ($passed >= 1)  $toAward[] = 'first_pass';
    if ($best === 100) $toAward[] = 'perfect_score';
    if ($total >= 5)   $toAward[] = 'five_exams';
    if ($total >= 10)  $toAward[] = 'ten_exams';

    $newBadges = [];
    foreach ($toAward as $type) {
        try {
            $pdo->prepare("INSERT IGNORE INTO `badges` (`studentId`,`type`) VALUES (?,?)")->execute([$studentId, $type]);
            if ($pdo->lastInsertId() > 0) $newBadges[] = $type;
        } catch (Exception $e) {}
    }
    return $newBadges;
}

function Math_round_or_ceil($val) {
    return (int)round($val);
}

if ($action === 'get_student_results') {
    // Get attempts for this specific student
    $stmt = $pdo->prepare("SELECT r.*, e.title as examTitle FROM `results` r JOIN `exams` e ON r.examId = e.id WHERE r.studentId = ? ORDER BY r.completedAt DESC");
    $stmt->execute([$currentUser['id']]);
    $results = $stmt->fetchAll();
    
    // Overall stats
    $stmt = $pdo->prepare("SELECT COUNT(*) as totalExamsTaken, AVG(score) as averageScore, MAX(score) as bestScore, SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) as totalPassed FROM `results` WHERE `studentId` = ?");
    $stmt->execute([$currentUser['id']]);
    $stats = $stmt->fetch();

    // Subject breakdown
    $stmt = $pdo->prepare("SELECT e.subject, COUNT(*) as attempts, ROUND(AVG(r.score)) as avgScore, MAX(r.score) as bestScore FROM `results` r JOIN `exams` e ON r.examId = e.id WHERE r.studentId = ? GROUP BY e.subject ORDER BY avgScore DESC");
    $stmt->execute([$currentUser['id']]);
    $subjectStats = $stmt->fetchAll();

    $total = (int)$stats['totalExamsTaken'];
    $passed = (int)$stats['totalPassed'];
    respond('success', [
        'results' => $results,
        'stats' => [
            'totalExamsTaken' => $total,
            'averageScore'    => $stats['averageScore'] !== null ? (int)round($stats['averageScore']) : 0,
            'bestScore'       => $stats['bestScore'] !== null ? (int)$stats['bestScore'] : 0,
            'passRate'        => $total > 0 ? (int)round(($passed / $total) * 100) : 0
        ],
        'subjectStats' => $subjectStats
    ]);
}

// ----------------- Teacher Actions (Requires Verification) -----------------

if (strpos($action, 'teacher_') === 0) {
    if ($currentUser['role'] !== 'teacher') {
        respond('error', ['message' => 'Forbidden. Teachers only.']);
    }

    if ($action === 'teacher_stats') {
        $totalExams = $pdo->query("SELECT COUNT(*) FROM `exams`")->fetchColumn();
        $totalAttempts = $pdo->query("SELECT COUNT(*) FROM `results`")->fetchColumn();
        $avgScore = $pdo->query("SELECT AVG(score) FROM `results`")->fetchColumn();

        respond('success', [
            'totalExams' => (int)$totalExams,
            'totalAttempts' => (int)$totalAttempts,
            'avgScore' => $avgScore !== null ? (int)round($avgScore) : 0
        ]);
    }

    if ($action === 'teacher_analytics') {
        // Performance metrics per exam
        $stmt = $pdo->query("SELECT id, title, subject, difficulty, duration, totalQuestions, createdAt FROM `exams` ORDER BY `id` ASC");
        $exams = $stmt->fetchAll();
        
        $analytics = [];
        foreach ($exams as $exam) {
            $stmt = $pdo->prepare("SELECT score FROM `results` WHERE `examId` = ?");
            $stmt->execute([$exam['id']]);
            $scores = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $base = [
                'id'             => $exam['id'],
                'title'          => $exam['title'],
                'subject'        => $exam['subject'],
                'difficulty'     => $exam['difficulty'],
                'duration'       => (int)$exam['duration'],
                'totalQuestions' => (int)$exam['totalQuestions'],
                'createdAt'      => $exam['createdAt']
            ];
            if (count($scores) === 0) {
                $analytics[] = array_merge($base, [
                    'totalAttempts' => 0,
                    'averageScore'  => 0,
                    'highestScore'  => 0,
                    'lowestScore'   => 0,
                    'passRate'      => 0
                ]);
            } else {
                $total  = count($scores);
                $passed = count(array_filter($scores, function($s) { return $s >= 60; }));
                $analytics[] = array_merge($base, [
                    'totalAttempts' => $total,
                    'averageScore'  => (int)round(array_sum($scores) / $total),
                    'highestScore'  => (int)max($scores),
                    'lowestScore'   => (int)min($scores),
                    'passRate'      => (int)round(($passed / $total) * 100)
                ]);
            }
        }
        respond('success', ['analytics' => $analytics]);
    }

    if ($action === 'teacher_attempts') {
        // Get all attempts
        $stmt = $pdo->query("SELECT r.*, e.title as examTitle, u.name as studentName 
                             FROM `results` r 
                             JOIN `exams` e ON r.examId = e.id 
                             JOIN `users` u ON r.studentId = u.id 
                             ORDER BY r.completedAt DESC");
        $attempts = $stmt->fetchAll();
        respond('success', ['attempts' => $attempts]);
    }

    if ($action === 'teacher_students') {
        // Get all student accounts
        $stmt = $pdo->prepare("SELECT id, name, email, userId FROM `users` WHERE `role` = 'student' ORDER BY `name` ASC");
        $stmt->execute();
        $students = $stmt->fetchAll();
        respond('success', ['students' => $students]);
    }

    if ($action === 'teacher_reset_password') {
        $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
        $newPassword = isset($requestData['newPassword']) ? trim($requestData['newPassword']) : '';

        if ($studentId <= 0 || strlen($newPassword) < 6) {
            respond('error', ['message' => 'Password must be at least 6 characters.']);
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE `users` SET `password` = ? WHERE `id` = ? AND `role` = 'student'");
        $stmt->execute([$hashedPassword, $studentId]);
        respond('success');
    }

    if ($action === 'teacher_remove_student') {
        $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
        if ($studentId <= 0) {
            respond('error', ['message' => 'Invalid student ID.']);
        }

        $stmt = $pdo->prepare("DELETE FROM `users` WHERE `id` = ? AND `role` = 'student'");
        $stmt->execute([$studentId]);
        respond('success');
    }

    if ($action === 'teacher_delete_exam') {
        $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
        if ($examId <= 0) {
            respond('error', ['message' => 'Invalid exam ID.']);
        }
        $stmt = $pdo->prepare("DELETE FROM `exams` WHERE `id` = ?");
        $stmt->execute([$examId]);
        respond('success');
    }

    if ($action === 'teacher_create_exam') {
        $title      = isset($requestData['title'])      ? trim($requestData['title'])      : '';
        $subject    = isset($requestData['subject'])    ? trim($requestData['subject'])    : '';
        $duration   = isset($requestData['duration'])   ? (int)$requestData['duration']   : 30;
        $difficulty = isset($requestData['difficulty']) ? trim($requestData['difficulty']) : 'Medium';
        $questions  = isset($requestData['questions'])  ? $requestData['questions']        : [];

        $allowed = ['Easy', 'Medium', 'Hard'];
        if (!in_array($difficulty, $allowed)) $difficulty = 'Medium';

        if (empty($title) || empty($subject) || count($questions) === 0) {
            respond('error', ['message' => 'Please fill in all details and add at least one question.']);
        }

        $pdo->beginTransaction();
        try {
            // Insert exam
            $stmt = $pdo->prepare("INSERT INTO `exams` (`title`, `subject`, `duration`, `totalQuestions`, `difficulty`, `createdBy`, `createdAt`) 
                                   VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$title, $subject, $duration, count($questions), $difficulty, $currentUser['id']]);
            $examId = $pdo->lastInsertId();

            // Insert questions
            $stmtQ = $pdo->prepare("INSERT INTO `questions` (`examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($questions as $q) {
                $stmtQ->execute([
                    $examId,
                    $q['question'],
                    $q['options'][0],
                    $q['options'][1],
                    $q['options'][2],
                    $q['options'][3],
                    (int)$q['correctAnswer'],
                    isset($q['points']) ? (int)$q['points'] : 1
                ]);
            }

            $pdo->commit();
            respond('success');
        } catch (Exception $e) {
            $pdo->rollBack();
            respond('error', ['message' => 'Failed to create exam: ' . $e->getMessage()]);
        }
    }
}

// ----------------- Practice Mode (Student) -----------------

if ($action === 'practice_exam') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) respond('error', ['message' => 'Invalid Exam ID.']);

    $stmt = $pdo->prepare("SELECT * FROM `exams` WHERE `id` = ?");
    $stmt->execute([$examId]);
    $exam = $stmt->fetch();
    if (!$exam) respond('error', ['message' => 'Exam not found.']);

    $stmt = $pdo->prepare("SELECT `id`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`points` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll();

    $formatted = [];
    foreach ($questions as $q) {
        $formatted[] = [
            'id'            => $q['id'],
            'question'      => $q['question'],
            'options'       => [$q['option1'],$q['option2'],$q['option3'],$q['option4']],
            'correctAnswer' => (int)$q['correctAnswer'],
            'points'        => (int)$q['points']
        ];
    }
    $exam['questions'] = $formatted;
    respond('success', ['exam' => $exam]);
}

// ----------------- Leaderboard (Student) -----------------

if ($action === 'get_leaderboard') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) respond('error', ['message' => 'Invalid Exam ID.']);

    $stmt = $pdo->prepare("SELECT u.name, MAX(r.score) as bestScore, COUNT(*) as attempts
        FROM `results` r JOIN `users` u ON r.studentId = u.id
        WHERE r.examId = ? GROUP BY r.studentId ORDER BY bestScore DESC LIMIT 20");
    $stmt->execute([$examId]);
    $leaderboard = $stmt->fetchAll();

    $stmtE = $pdo->prepare("SELECT id, title, subject FROM `exams` ORDER BY id ASC");
    $stmtE->execute();
    $exams = $stmtE->fetchAll();

    respond('success', ['leaderboard' => $leaderboard, 'exams' => $exams]);
}

// ----------------- Badges (Student) -----------------

if ($action === 'get_badges') {
    $stmt = $pdo->prepare("SELECT `type`, `earnedAt` FROM `badges` WHERE `studentId` = ? ORDER BY `earnedAt` ASC");
    $stmt->execute([$currentUser['id']]);
    respond('success', ['badges' => $stmt->fetchAll()]);
}

// ----------------- Profile Settings (Both) -----------------

if ($action === 'update_profile') {
    $newName     = isset($requestData['name'])          ? trim($requestData['name'])          : '';
    $avatarColor = isset($requestData['avatar_color'])  ? trim($requestData['avatar_color'])  : '';
    $newPassword = isset($requestData['new_password'])  ? $requestData['new_password']        : '';
    $curPassword = isset($requestData['current_password']) ? $requestData['current_password'] : '';

    if (empty($newName)) respond('error', ['message' => 'Name cannot be empty.']);

    // If changing password, verify current password
    if (!empty($newPassword)) {
        if (strlen($newPassword) < 6) respond('error', ['message' => 'New password must be at least 6 characters.']);
        $stmt = $pdo->prepare("SELECT `password` FROM `users` WHERE `id` = ?");
        $stmt->execute([$currentUser['id']]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($curPassword, $row['password'])) {
            respond('error', ['message' => 'Current password is incorrect.']);
        }
    }

    // Build avatar initials
    $words = explode(' ', $newName);
    $avatar = '';
    foreach ($words as $w) $avatar .= strtoupper(substr($w, 0, 1));
    $avatar = substr($avatar, 0, 2) ?: 'US';

    if (!empty($newPassword)) {
        $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE `users` SET `name`=?, `avatar`=?, `avatar_color`=?, `password`=? WHERE `id`=?")
            ->execute([$newName, $avatar, $avatarColor, $hashed, $currentUser['id']]);
    } else {
        $pdo->prepare("UPDATE `users` SET `name`=?, `avatar`=?, `avatar_color`=? WHERE `id`=?")
            ->execute([$newName, $avatar, $avatarColor, $currentUser['id']]);
    }

    $_SESSION['user']['name']         = $newName;
    $_SESSION['user']['avatar']       = $avatar;
    $_SESSION['user']['avatar_color'] = $avatarColor;
    respond('success', ['user' => $_SESSION['user']]);
}

// ----------------- Teacher — extended actions -----------------

if (strpos($action, 'teacher_') === 0 && !in_array($action, [
    'teacher_stats','teacher_analytics','teacher_attempts','teacher_students',
    'teacher_reset_password','teacher_remove_student','teacher_delete_exam','teacher_create_exam'
])) {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Forbidden. Teachers only.']);

    // ---- Student Profile View ----
    if ($action === 'teacher_student_profile') {
        $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
        if ($studentId <= 0) respond('error', ['message' => 'Invalid student ID.']);

        $stmt = $pdo->prepare("SELECT id, name, email, userId, avatar, avatar_color FROM `users` WHERE `id`=? AND `role`='student'");
        $stmt->execute([$studentId]);
        $student = $stmt->fetch();
        if (!$student) respond('error', ['message' => 'Student not found.']);

        $stmt = $pdo->prepare("SELECT r.*, e.title as examTitle, e.subject FROM `results` r JOIN `exams` e ON r.examId=e.id WHERE r.studentId=? ORDER BY r.completedAt DESC");
        $stmt->execute([$studentId]);
        $attempts = $stmt->fetchAll();

        $stmt = $pdo->prepare("SELECT e.subject, COUNT(*) as attempts, ROUND(AVG(r.score)) as avgScore, MAX(r.score) as bestScore FROM `results` r JOIN `exams` e ON r.examId=e.id WHERE r.studentId=? GROUP BY e.subject ORDER BY avgScore DESC");
        $stmt->execute([$studentId]);
        $subjects = $stmt->fetchAll();

        respond('success', ['student' => $student, 'attempts' => $attempts, 'subjects' => $subjects]);
    }

    // ---- Edit Exam ----
    if ($action === 'teacher_get_exam_edit') {
        $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
        if ($examId <= 0) respond('error', ['message' => 'Invalid Exam ID.']);

        $stmt = $pdo->prepare("SELECT * FROM `exams` WHERE `id`=?");
        $stmt->execute([$examId]);
        $exam = $stmt->fetch();
        if (!$exam) respond('error', ['message' => 'Exam not found.']);

        $stmt = $pdo->prepare("SELECT * FROM `questions` WHERE `examId`=? ORDER BY `id` ASC");
        $stmt->execute([$examId]);
        $questions = $stmt->fetchAll();

        $exam['questions'] = array_map(function($q) {
            return [
                'id'            => $q['id'],
                'question'      => $q['question'],
                'options'       => [$q['option1'],$q['option2'],$q['option3'],$q['option4']],
                'correctAnswer' => (int)$q['correctAnswer'],
                'points'        => (int)$q['points']
            ];
        }, $questions);
        respond('success', ['exam' => $exam]);
    }

    if ($action === 'teacher_edit_exam') {
        $examId     = isset($requestData['examId'])     ? (int)$requestData['examId']         : 0;
        $title      = isset($requestData['title'])      ? trim($requestData['title'])          : '';
        $subject    = isset($requestData['subject'])    ? trim($requestData['subject'])        : '';
        $duration   = isset($requestData['duration'])   ? (int)$requestData['duration']       : 30;
        $difficulty = isset($requestData['difficulty']) ? trim($requestData['difficulty'])     : 'Medium';
        $questions  = isset($requestData['questions'])  ? $requestData['questions']            : [];

        if ($examId <= 0 || empty($title) || empty($subject) || count($questions) === 0)
            respond('error', ['message' => 'Missing required fields.']);

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE `exams` SET `title`=?,`subject`=?,`duration`=?,`difficulty`=?,`totalQuestions`=? WHERE `id`=?")
                ->execute([$title, $subject, $duration, $difficulty, count($questions), $examId]);
            $pdo->prepare("DELETE FROM `questions` WHERE `examId`=?")->execute([$examId]);
            $stmtQ = $pdo->prepare("INSERT INTO `questions` (`examId`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`points`) VALUES (?,?,?,?,?,?,?,?)");
            foreach ($questions as $q) {
                $stmtQ->execute([$examId, $q['question'], $q['options'][0], $q['options'][1], $q['options'][2], $q['options'][3], (int)$q['correctAnswer'], isset($q['points']) ? (int)$q['points'] : 1]);
            }
            $pdo->commit();
            respond('success');
        } catch (Exception $e) {
            $pdo->rollBack();
            respond('error', ['message' => 'Edit failed: ' . $e->getMessage()]);
        }
    }

    // ---- Question Bank ----
    if ($action === 'teacher_bank_list') {
        $stmt = $pdo->prepare("SELECT * FROM `question_bank` WHERE `teacherId`=? ORDER BY `id` DESC");
        $stmt->execute([$currentUser['id']]);
        respond('success', ['questions' => $stmt->fetchAll()]);
    }

    if ($action === 'teacher_bank_add') {
        $subject  = isset($requestData['subject'])       ? trim($requestData['subject'])       : '';
        $question = isset($requestData['question'])      ? trim($requestData['question'])      : '';
        $opts     = isset($requestData['options'])       ? $requestData['options']             : [];
        $correct  = isset($requestData['correctAnswer']) ? (int)$requestData['correctAnswer']  : 0;
        $points   = isset($requestData['points'])        ? (int)$requestData['points']         : 1;
        if (empty($question) || count($opts) < 4) respond('error', ['message' => 'Missing fields.']);
        $pdo->prepare("INSERT INTO `question_bank` (`teacherId`,`subject`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`points`) VALUES (?,?,?,?,?,?,?,?,?)")
            ->execute([$currentUser['id'], $subject, $question, $opts[0], $opts[1], $opts[2], $opts[3], $correct, $points]);
        respond('success', ['id' => $pdo->lastInsertId()]);
    }

    if ($action === 'teacher_bank_delete') {
        $bankId = isset($requestData['bankId']) ? (int)$requestData['bankId'] : 0;
        $pdo->prepare("DELETE FROM `question_bank` WHERE `id`=? AND `teacherId`=?")->execute([$bankId, $currentUser['id']]);
        respond('success');
    }

    // ---- CSV Export ----
    if ($action === 'teacher_export_csv') {
        $examId   = isset($requestData['examId'])   && $requestData['examId']   ? (int)$requestData['examId']   : 0;
        $dateFrom = isset($requestData['dateFrom']) && $requestData['dateFrom'] ? $requestData['dateFrom']       : '';
        $dateTo   = isset($requestData['dateTo'])   && $requestData['dateTo']   ? $requestData['dateTo']         : '';

        $sql = "SELECT u.name as studentName, u.userId, e.title as examTitle, e.subject,
                       r.score, r.correctAnswers, r.totalQuestions, r.timeTaken, r.completedAt
                FROM `results` r
                JOIN `users` u ON r.studentId=u.id
                JOIN `exams` e ON r.examId=e.id WHERE 1=1";
        $params = [];
        if ($examId > 0) { $sql .= " AND r.examId=?"; $params[] = $examId; }
        if ($dateFrom)   { $sql .= " AND DATE(r.completedAt) >= ?"; $params[] = $dateFrom; }
        if ($dateTo)     { $sql .= " AND DATE(r.completedAt) <= ?"; $params[] = $dateTo; }
        $sql .= " ORDER BY r.completedAt DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Output CSV directly
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="fetenax_results_' . date('Ymd_His') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Student Name','Student ID','Exam Title','Subject','Score (%)','Correct','Total','Time (s)','Completed At']);
        foreach ($rows as $r) {
            fputcsv($out, [$r['studentName'],$r['userId'],$r['examTitle'],$r['subject'],$r['score'],$r['correctAnswers'],$r['totalQuestions'],$r['timeTaken'],$r['completedAt']]);
        }
        fclose($out);
        exit;
    }

    // ---- Bulk Student Import ----
    if ($action === 'teacher_bulk_import') {
        if (!isset($_FILES['csvfile'])) respond('error', ['message' => 'No file uploaded.']);
        $file = $_FILES['csvfile']['tmp_name'];
        $handle = fopen($file, 'r');
        if (!$handle) respond('error', ['message' => 'Cannot read file.']);
        $results2 = []; $row = 0;
        while (($data = fgetcsv($handle)) !== false) {
            $row++;
            if ($row === 1 && strtolower(trim($data[0])) === 'name') continue; // skip header
            if (count($data) < 4) { $results2[] = ['row'=>$row,'status'=>'error','msg'=>'Insufficient columns']; continue; }
            [$name, $email, $userId, $password] = array_map('trim', $data);
            if (empty($name)||empty($email)||empty($userId)||empty($password)) { $results2[] = ['row'=>$row,'status'=>'error','msg'=>'Empty fields']; continue; }
            $chk = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `email`=? OR `userId`=?");
            $chk->execute([$email, $userId]);
            if ($chk->fetchColumn() > 0) { $results2[] = ['row'=>$row,'status'=>'skip','msg'=>"$email or ID $userId already exists"]; continue; }
            $words2 = explode(' ', $name); $av = '';
            foreach ($words2 as $w) $av .= strtoupper(substr($w,0,1));
            $av = substr($av,0,2) ?: 'ST';
            $pdo->prepare("INSERT INTO `users` (`email`,`password`,`role`,`name`,`avatar`,`userId`,`avatar_color`) VALUES (?,?,?,?,?,?,?)")
                ->execute([$email, password_hash($password, PASSWORD_BCRYPT), 'student', $name, $av, $userId, '#6366f1']);
            $results2[] = ['row'=>$row,'status'=>'ok','msg'=>"Imported: $name"];
        }
        fclose($handle);
        respond('success', ['results' => $results2]);
    }

    // ---- Class Groups ----
    if ($action === 'teacher_list_groups') {
        $stmt = $pdo->prepare("SELECT g.*, COUNT(gm.studentId) as memberCount FROM `groups` g LEFT JOIN `group_members` gm ON g.id=gm.groupId WHERE g.teacherId=? GROUP BY g.id ORDER BY g.id ASC");
        $stmt->execute([$currentUser['id']]);
        respond('success', ['groups' => $stmt->fetchAll()]);
    }

    if ($action === 'teacher_create_group') {
        $name = isset($requestData['name']) ? trim($requestData['name']) : '';
        if (empty($name)) respond('error', ['message' => 'Group name required.']);
        $pdo->prepare("INSERT INTO `groups` (`teacherId`,`name`) VALUES (?,?)")->execute([$currentUser['id'], $name]);
        respond('success', ['id' => $pdo->lastInsertId()]);
    }

    if ($action === 'teacher_delete_group') {
        $groupId = isset($requestData['groupId']) ? (int)$requestData['groupId'] : 0;
        $pdo->prepare("DELETE FROM `groups` WHERE `id`=? AND `teacherId`=?")->execute([$groupId, $currentUser['id']]);
        respond('success');
    }

    if ($action === 'teacher_group_members') {
        $groupId = isset($requestData['groupId']) ? (int)$requestData['groupId'] : 0;
        $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.userId FROM `group_members` gm JOIN `users` u ON gm.studentId=u.id WHERE gm.groupId=?");
        $stmt->execute([$groupId]);
        $members = $stmt->fetchAll();
        $stmt2 = $pdo->prepare("SELECT id, name, email, userId FROM `users` WHERE `role`='student' AND `id` NOT IN (SELECT studentId FROM `group_members` WHERE groupId=?) ORDER BY name ASC");
        $stmt2->execute([$groupId]);
        $available = $stmt2->fetchAll();
        respond('success', ['members' => $members, 'available' => $available]);
    }

    if ($action === 'teacher_group_add_member') {
        $groupId   = isset($requestData['groupId'])   ? (int)$requestData['groupId']   : 0;
        $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
        $pdo->prepare("INSERT IGNORE INTO `group_members` (`groupId`,`studentId`) VALUES (?,?)")->execute([$groupId, $studentId]);
        respond('success');
    }

    if ($action === 'teacher_group_remove_member') {
        $groupId   = isset($requestData['groupId'])   ? (int)$requestData['groupId']   : 0;
        $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
        $pdo->prepare("DELETE FROM `group_members` WHERE `groupId`=? AND `studentId`=?")->execute([$groupId, $studentId]);
        respond('success');
    }
}

respond('error', ['message' => 'Action not found: ' . $action]);
?>
