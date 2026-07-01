<?php
// api/student.php - Student and general actions for FetenaX
// Included by api.php after session verification.
// Variables available: $pdo, $requestData, $action, $currentUser, respond()

// ----------------- Student / General Actions -----------------

if ($action === 'get_exams') {
    if ($currentUser['role'] === 'student') {
        $stmt = $pdo->prepare("
            SELECT DISTINCT e.* FROM `exams` e
            WHERE e.id NOT IN (SELECT DISTINCT examId FROM `exam_groups`)
               OR e.id IN (
                   SELECT eg.examId FROM `exam_groups` eg
                   JOIN `group_members` gm ON eg.groupId = gm.groupId
                   WHERE gm.studentId = ?
               )
            ORDER BY e.id ASC
        ");
        $stmt->execute([$currentUser['id']]);
    } else {
        $stmt = $pdo->query("SELECT * FROM `exams` ORDER BY `id` ASC");
    }
    $exams = $stmt->fetchAll();
    respond('success', ['exams' => $exams]);
}

if ($action === 'get_exam') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    $accessPassword = isset($requestData['accessPassword']) ? trim($requestData['accessPassword']) : '';
    if ($examId <= 0) {
        respond('error', ['message' => 'Invalid Exam ID.']);
    }

    $stmt = $pdo->prepare("SELECT * FROM `exams` WHERE `id` = ?");
    $stmt->execute([$examId]);
    $exam = $stmt->fetch();
    if (!$exam) {
        respond('error', ['message' => 'Exam not found.']);
    }

    // Scheduling check
    $now = date('Y-m-d H:i:s');
    if (!empty($exam['availableFrom']) && $now < $exam['availableFrom']) {
        respond('error', ['message' => 'This exam is not available yet. It opens on ' . date('M j, Y \a\t g:i A', strtotime($exam['availableFrom'])) . '.']);
    }
    if (!empty($exam['availableUntil']) && $now > $exam['availableUntil']) {
        respond('error', ['message' => 'This exam is no longer available. It closed on ' . date('M j, Y \a\t g:i A', strtotime($exam['availableUntil'])) . '.']);
    }

    // Access password check — skip for teachers (they can preview/edit without password)
    if ($currentUser['role'] !== 'teacher' && !empty($exam['accessPassword'])) {
        if ($accessPassword === '' || !password_verify($accessPassword, $exam['accessPassword'])) {
            respond('error', ['message' => 'ACCESS_PASSWORD_REQUIRED']);
        }
    }

    // Max attempts check — skip for teachers
    if ($currentUser['role'] !== 'student') goto skipAttempts;
    $maxAtt = (int)($exam['maxAttempts'] ?? 1);
    if ($maxAtt > 0) {
        $attStmt = $pdo->prepare("SELECT COUNT(*) FROM `results` WHERE `examId` = ? AND `studentId` = ?");
        $attStmt->execute([$examId, $currentUser['id']]);
        $attemptsUsed = (int)$attStmt->fetchColumn();
        if ($attemptsUsed >= $maxAtt) {
            respond('error', ['message' => "You have used all {$maxAtt} allowed attempt(s) for this exam."]);
        }
    }
    skipAttempts:

    // Detect optional columns defensively (v31/v32/v33)
    $hasExtras = false; $hasImage = false;
    try {
        $chk = $pdo->prepare("SHOW COLUMNS FROM `questions` LIKE 'explanation'");
        $chk->execute();
        if ($chk->fetch()) $hasExtras = true;
        $chk2 = $pdo->prepare("SHOW COLUMNS FROM `questions` LIKE 'imageUrl'");
        $chk2->execute();
        if ($chk2->fetch()) $hasImage = true;
    } catch (Exception $e) { /* ignore */ }
    $extraSelect = $hasExtras ? ',`explanation`,`hint1`,`hint2`' : '';
    $extraSelect .= $hasImage ? ',`imageUrl`' : '';

    // Fetch questions
    $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `points`, `questionType`" . $extraSelect . " FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll();

    // Shuffle questions if enabled
    if (!empty($exam['shuffleQuestions'])) {
        shuffle($questions);
    }

    $formattedQuestions = [];
    foreach ($questions as $q) {
        $options = [$q['option1'], $q['option2'], $q['option3'], $q['option4']];
        if (!empty($exam['shuffleOptions']) && $q['questionType'] === 'single') {
            $indices = [0, 1, 2, 3];
            shuffle($indices);
            $shuffledOptions = [];
            foreach ($indices as $i) $shuffledOptions[] = $options[$i];
            $options = $shuffledOptions;
        }
        $item = [
            'id' => $q['id'],
            'question' => $q['question'],
            'options' => $options,
            'points' => (int)$q['points'],
            'questionType' => $q['questionType'] ?: 'single'
        ];
        if ($hasExtras) {
            $item['explanation'] = isset($q['explanation']) ? ($q['explanation'] ?: null) : null;
            $item['hint1']       = isset($q['hint1'])       ? ($q['hint1']       ?: null) : null;
            $item['hint2']       = isset($q['hint2'])       ? ($q['hint2']       ?: null) : null;
        }
        if ($hasImage) {
            $item['imageUrl'] = isset($q['imageUrl']) ? ($q['imageUrl'] ?: null) : null;
        }
        $formattedQuestions[] = $item;
    }
    $exam['questions'] = $formattedQuestions;
    unset($exam['accessPassword']);

    // Fetch existing progress
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

    $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll();
    if (count($questions) === 0) {
        respond('error', ['message' => 'No questions found for this exam.']);
    }

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
        $pts = max(1, (int)$q['points']);
        $totalPoints += $pts;
        $ans = isset($progressAnswers[$q['id']]) ? $progressAnswers[$q['id']] : null;
        $isCorrect = ($ans !== null && (int)$ans === (int)$q['correctAnswer']);
        if ($isCorrect) { $correctCount++; $earnedPoints += $pts; }
        $answerReview[] = [
            'question'       => $q['question'],
            'options'        => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'selectedAnswer' => $ans !== null ? (int)$ans : null,
            'correctAnswer'  => (int)$q['correctAnswer'],
            'isCorrect'      => $isCorrect,
            'points'         => $pts
        ];
    }

    $score = $totalPoints > 0 ? Math_round_or_ceil(($earnedPoints / $totalPoints) * 100) : 0;

    $stmtE = $pdo->prepare("SELECT `title`, `subject` FROM `exams` WHERE `id` = ?");
    $stmtE->execute([$examId]);
    $examRow = $stmtE->fetch();
    $examTitle = $examRow ? $examRow['title'] : '';
    $examSubject = $examRow ? $examRow['subject'] : '';

    $answerDataJson = json_encode([
        'answerReview' => $answerReview,
        'score' => $score,
        'correctAnswers' => $correctCount,
        'totalQuestions' => count($questions),
        'timeTaken' => $timeTaken,
        'examTitle' => $examTitle
    ]);
    $stmt = $pdo->prepare("INSERT INTO `results` (`examId`, `studentId`, `score`, `correctAnswers`, `totalQuestions`, `timeTaken`, `completedAt`, `answerData`, `examTitleSnapshot`) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)");
    $stmt->execute([$examId, $currentUser['id'], $score, $correctCount, count($questions), $timeTaken, $answerDataJson, $examTitle]);

    // Populate arguments for SRS queue updates
    $questionIds = [];
    $answers = [];
    $correctMap = [];
    $examMap = [];
    foreach ($questions as $q) {
        $qid = (int)$q['id'];
        $questionIds[] = $qid;
        $correctMap[$qid] = (int)$q['correctAnswer'];
        $examMap[$qid] = (int)$examId;
        $answers[$qid] = isset($progressAnswers[$qid]) ? (int)$progressAnswers[$qid] : -1;
    }

    updateSrsQueue($pdo, $currentUser['id'], $questionIds, $answers, $correctMap, $examMap, $examSubject);
    syncSubjectMastery($pdo, $currentUser['id']);

    $stmt = $pdo->prepare("DELETE FROM `exam_progress` WHERE `studentId` = ? AND `examId` = ?");
    $stmt->execute([$currentUser['id'], $examId]);

    $newBadges = check_badges($pdo, $currentUser['id'], $score, $correctCount, count($questions));

    // Notify student
    try {
        $pdo->prepare("INSERT INTO `notifications` (`userId`, `type`, `title`, `message`, `link`) VALUES (?, ?, ?, ?, ?)")
            ->execute([
                $currentUser['id'],
                'exam_graded',
                'Exam Graded',
                "Your exam \"{$examTitle}\" has been graded. Score: {$score}%",
                'student-history'
            ]);
    } catch (Exception $e) { /* silent */ }

    // Notify teacher
    try {
        $teacherStmt = $pdo->prepare("SELECT `createdBy` FROM `exams` WHERE `id` = ?");
        $teacherStmt->execute([$examId]);
        $teacherRow = $teacherStmt->fetch();
        if ($teacherRow) {
            $pdo->prepare("INSERT INTO `notifications` (`userId`, `type`, `title`, `message`, `link`) VALUES (?, ?, ?, ?, ?)")
                ->execute([
                    $teacherRow['createdBy'],
                    'exam_completed',
                    'Student Completed Exam',
                    "{$currentUser['name']} completed \"{$examTitle}\" with a score of {$score}%.",
                    'teacher-attempts'
                ]);
        }
    } catch (Exception $e) { /* silent */ }

    respond('success', [
        'score'          => $score,
        'correctAnswers' => $correctCount,
        'totalQuestions' => count($questions),
        'timeTaken'      => $timeTaken,
        'examTitle'      => $examTitle,
        'answerReview'   => $answerReview,
        'newBadges'      => $newBadges
    ]);
}

if ($action === 'get_student_results') {
    $stmt = $pdo->prepare("SELECT r.*, e.title as examTitle FROM `results` r JOIN `exams` e ON r.examId = e.id WHERE r.studentId = ? ORDER BY r.completedAt DESC");
    $stmt->execute([$currentUser['id']]);
    $results = $stmt->fetchAll();

    $stmt = $pdo->prepare("SELECT COUNT(*) as totalExamsTaken, AVG(score) as averageScore, MAX(score) as bestScore, SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) as totalPassed FROM `results` WHERE `studentId` = ?");
    $stmt->execute([$currentUser['id']]);
    $stats = $stmt->fetch();

    $stmt = $pdo->prepare("SELECT e.subject, COUNT(*) as attempts, ROUND(AVG(r.score)) as avgScore, MAX(r.score) as bestScore FROM `results` r JOIN `exams` e ON r.examId = e.id WHERE r.studentId = ? GROUP BY e.subject ORDER BY avgScore DESC");
    $stmt->execute([$currentUser['id']]);
    $subjectStats = $stmt->fetchAll();

    $total = (int)$stats['totalExamsTaken'];
    $passed = (int)$stats['totalPassed'];

    $badgeStmt = $pdo->prepare("SELECT `type`, `earnedAt` FROM `badges` WHERE `studentId` = ? ORDER BY `earnedAt` DESC");
    $badgeStmt->execute([$currentUser['id']]);
    $badgeRows = $badgeStmt->fetchAll();
    $badges = array_map(fn($b) => [
        'type'     => $b['type'],
        'label'    => BADGE_LABELS[$b['type']] ?? $b['type'],
        'icon'     => BADGE_ICONS[$b['type']]  ?? '🏅',
        'earnedAt' => $b['earnedAt']
    ], $badgeRows);

    respond('success', [
        'results' => $results,
        'stats' => [
            'totalExamsTaken' => $total,
            'averageScore'    => $stats['averageScore'] !== null ? (int)round($stats['averageScore']) : 0,
            'bestScore'       => $stats['bestScore'] !== null ? (int)$stats['bestScore'] : 0,
            'passRate'        => $total > 0 ? (int)round(($passed / $total) * 100) : 0
        ],
        'subjectStats' => $subjectStats,
        'badges'       => $badges
    ]);
}

if ($action === 'practice_exam') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) respond('error', ['message' => 'Invalid exam ID.']);

    $stmt = $pdo->prepare("SELECT * FROM `exams` WHERE `id` = ?");
    $stmt->execute([$examId]);
    $exam = $stmt->fetch();
    if (!$exam) respond('error', ['message' => 'Exam not found.']);

    // Detect if explanation/hint columns exist (defensive against un-migrated DBs)
    $hasExtras = false; $hasImage = false;
    try {
        $chk = $pdo->prepare("SHOW COLUMNS FROM `questions` LIKE 'explanation'");
        $chk->execute();
        if ($chk->fetch()) $hasExtras = true;
        $chk2 = $pdo->prepare("SHOW COLUMNS FROM `questions` LIKE 'imageUrl'");
        $chk2->execute();
        if ($chk2->fetch()) $hasImage = true;
    } catch (Exception $e) { /* ignore */ }
    $extraCols = $hasExtras ? ',`explanation`,`hint1`,`hint2`' : '';
    $extraCols .= $hasImage ? ',`imageUrl`' : '';

    $stmt = $pdo->prepare("SELECT `id`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`points`" . $extraCols . " FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $qs = $stmt->fetchAll();

    $questions = array_map(function ($q) {
        return [
            'id'            => (int)$q['id'],
            'question'      => $q['question'],
            'options'       => [$q['option1'],$q['option2'],$q['option3'],$q['option4']],
            'correctAnswer' => (int)$q['correctAnswer'],
            'points'        => (int)$q['points'],
            'explanation'   => isset($q['explanation']) ? ($q['explanation'] ?: null) : null,
            'hint1'         => isset($q['hint1'])       ? ($q['hint1']       ?: null) : null,
            'hint2'         => isset($q['hint2'])       ? ($q['hint2']       ?: null) : null,
            'imageUrl'      => isset($q['imageUrl'])    ? ($q['imageUrl']    ?: null) : null
        ];
    }, $qs);

    respond('success', ['exam' => $exam, 'questions' => $questions]);
}

if ($action === 'get_leaderboard') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;

    if ($examId > 0) {
        $stmt = $pdo->prepare("
            SELECT u.name, u.avatar,
                   MAX(r.score) as bestScore,
                   COUNT(r.id) as attempts,
                   MIN(r.timeTaken) as bestTime
            FROM `results` r
            JOIN `users` u ON r.studentId = u.id
            WHERE r.examId = ?
            GROUP BY r.studentId
            ORDER BY bestScore DESC, bestTime ASC
            LIMIT 20
        ");
        $stmt->execute([$examId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT u.name, u.avatar,
                   ROUND(AVG(r.score)) as bestScore,
                   COUNT(r.id) as attempts,
                   0 as bestTime
            FROM `results` r
            JOIN `users` u ON r.studentId = u.id
            GROUP BY r.studentId
            ORDER BY bestScore DESC
            LIMIT 20
        ");
        $stmt->execute();
    }
    $rows = $stmt->fetchAll();

    $exams = $pdo->query("SELECT `id`,`title`,`subject` FROM `exams` ORDER BY `id` ASC")->fetchAll();

    respond('success', ['leaderboard' => $rows, 'exams' => $exams]);
}

if ($action === 'get_badges') {
    $stmt = $pdo->prepare("SELECT `type`, `earnedAt` FROM `badges` WHERE `studentId` = ? ORDER BY `earnedAt` DESC");
    $stmt->execute([$currentUser['id']]);
    $badgeRows = $stmt->fetchAll();
    $badges = array_map(fn($b) => [
        'type'     => $b['type'],
        'label'    => BADGE_LABELS[$b['type']] ?? $b['type'],
        'icon'     => BADGE_ICONS[$b['type']]  ?? '🏅',
        'earnedAt' => $b['earnedAt']
    ], $badgeRows);
    respond('success', ['badges' => $badges]);
}

if ($action === 'get_calendar_data') {
    $year  = isset($requestData['year'])  ? (int)$requestData['year']  : (int)date('Y');
    $month = isset($requestData['month']) ? (int)$requestData['month'] : (int)date('n');

    $firstDay = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $lastDay  = sprintf('%04d-%02d-31 23:59:59', $year, $month);

    $events = [];

    $stmt = $pdo->prepare("SELECT `id`, `title`, `subject`, `availableFrom`, `availableUntil` FROM `exams` WHERE (`availableFrom` BETWEEN ? AND ?) OR (`availableUntil` BETWEEN ? AND ?) ORDER BY `availableFrom` ASC");
    $stmt->execute([$firstDay, $lastDay, $firstDay, $lastDay]);
    foreach ($stmt->fetchAll() as $e) {
        if (!empty($e['availableFrom'])) {
            $events[] = ['date' => substr($e['availableFrom'], 0, 10), 'type' => 'exam_open', 'title' => $e['title'] . ' opens', 'examId' => (int)$e['id']];
        }
        if (!empty($e['availableUntil'])) {
            $events[] = ['date' => substr($e['availableUntil'], 0, 10), 'type' => 'exam_close', 'title' => $e['title'] . ' closes', 'examId' => (int)$e['id']];
        }
    }

    if ($currentUser['role'] === 'student') {
        $stmt2 = $pdo->prepare("SELECT `examId`, `score`, `completedAt`, (SELECT `title` FROM `exams` WHERE `id` = `examId`) as examTitle FROM `results` WHERE `studentId` = ? AND `completedAt` BETWEEN ? AND ? ORDER BY `completedAt` ASC");
        $stmt2->execute([$currentUser['id'], $firstDay, $lastDay]);
        foreach ($stmt2->fetchAll() as $r) {
            $events[] = ['date' => substr($r['completedAt'], 0, 10), 'type' => 'attempt', 'title' => ($r['examTitle'] ?? 'Exam') . ' — ' . $r['score'] . '%', 'examId' => (int)$r['examId'], 'score' => (int)$r['score']];
        }
    }

    respond('success', ['events' => $events, 'year' => $year, 'month' => $month]);
}

if ($action === 'get_subject_categories') {
    $stmt = $pdo->query("SELECT DISTINCT `category` FROM `exams` WHERE `category` IS NOT NULL AND `category` != '' ORDER BY `category` ASC");
    $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (empty($categories)) {
        $categories = ['Programming', 'Mathematics', 'Science', 'Language', 'Other'];
    }
    respond('success', ['categories' => $categories]);
}

if ($action === 'get_attempt_review') {
    $resultId = isset($requestData['resultId']) ? (int)$requestData['resultId'] : 0;
    if ($resultId <= 0) respond('error', ['message' => 'Invalid attempt ID.']);

    $stmt = $pdo->prepare("SELECT r.*, e.title as examTitle FROM `results` r JOIN `exams` e ON r.examId = e.id WHERE r.id = ?");
    $stmt->execute([$resultId]);
    $result = $stmt->fetch();
    if (!$result) respond('error', ['message' => 'Attempt not found.']);

    if ($currentUser['role'] === 'student' && $result['studentId'] != $currentUser['id']) {
        respond('error', ['message' => 'You can only view your own attempts.']);
    }

    $answerData = null;
    if (!empty($result['answerData'])) {
        $answerData = json_decode($result['answerData'], true);
    }

    respond('success', [
        'result' => [
            'id' => (int)$result['id'],
            'examId' => (int)$result['examId'],
            'examTitle' => $result['examTitleSnapshot'] ?: $result['examTitle'],
            'score' => (int)$result['score'],
            'correctAnswers' => (int)$result['correctAnswers'],
            'totalQuestions' => (int)$result['totalQuestions'],
            'timeTaken' => (int)$result['timeTaken'],
            'completedAt' => $result['completedAt']
        ],
        'answerReview' => $answerData ? ($answerData['answerReview'] ?? []) : [],
        'hasAnswerData' => $answerData !== null
    ]);
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
