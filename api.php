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

    // Fetch questions with full detail for answer review
    $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
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
    $answerReview = [];
    foreach ($questions as $q) {
        $ans = isset($progressAnswers[$q['id']]) ? $progressAnswers[$q['id']] : null;
        $isCorrect = ($ans !== null && (int)$ans === (int)$q['correctAnswer']);
        if ($isCorrect) $correctCount++;
        $answerReview[] = [
            'question'       => $q['question'],
            'options'        => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'selectedAnswer' => $ans !== null ? (int)$ans : null,
            'correctAnswer'  => (int)$q['correctAnswer'],
            'isCorrect'      => $isCorrect
        ];
    }

    $score = Math_round_or_ceil(($correctCount / count($questions)) * 100);

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

    respond('success', [
        'score'          => $score,
        'correctAnswers' => $correctCount,
        'totalQuestions' => count($questions),
        'timeTaken'      => $timeTaken,
        'examTitle'      => $examTitle,
        'answerReview'   => $answerReview
    ]);
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

respond('error', ['message' => 'Action not found: ' . $action]);
?>
