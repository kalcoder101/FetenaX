<?php
// api/teacher.php - Teacher actions for FetenaX
// Included by api.php for teacher_* actions not handled by other domain files.
// Variables available: $pdo, $requestData, $action, $currentUser, respond()

// Verify teacher role
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
    $stmt = $pdo->query("SELECT id, title, subject, difficulty, duration, totalQuestions, createdAt, accessPassword, accessCodePlain, passMark, maxAttempts, category, availableFrom, availableUntil FROM `exams` ORDER BY `id` ASC");
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
            'createdAt'      => $exam['createdAt'],
            'hasAccessCode'  => !empty($exam['accessPassword']),
            'accessCode'     => $exam['accessCodePlain'] ?? null,
            'passMark'       => (int)($exam['passMark'] ?? 60),
            'maxAttempts'    => (int)($exam['maxAttempts'] ?? 1),
            'category'       => $exam['category'] ?? null,
            'availableFrom'  => $exam['availableFrom'] ?? null,
            'availableUntil' => $exam['availableUntil'] ?? null
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
    $stmt = $pdo->query("SELECT r.*, e.title as examTitle, u.name as studentName 
                         FROM `results` r 
                         JOIN `exams` e ON r.examId = e.id 
                         JOIN `users` u ON r.studentId = u.id 
                         ORDER BY r.completedAt DESC");
    $attempts = $stmt->fetchAll();
    respond('success', ['attempts' => $attempts]);
}

if ($action === 'teacher_students') {
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
    $title            = isset($requestData['title'])            ? trim($requestData['title'])            : '';
    $subject          = isset($requestData['subject'])          ? trim($requestData['subject'])          : '';
    $duration         = isset($requestData['duration'])         ? (int)$requestData['duration']         : 30;
    $difficulty       = isset($requestData['difficulty'])       ? trim($requestData['difficulty'])       : 'Medium';
    $questions        = isset($requestData['questions'])        ? $requestData['questions']              : [];
    $passMark         = isset($requestData['passMark'])         ? (int)$requestData['passMark']         : 60;
    $shuffleQuestions = !empty($requestData['shuffleQuestions']) ? 1 : 0;
    $shuffleOptions   = !empty($requestData['shuffleOptions'])   ? 1 : 0;
    $showCorrect      = isset($requestData['showCorrectAnswers']) ? (int)(bool)$requestData['showCorrectAnswers'] : 1;
    $allowReReview    = !empty($requestData['allowReReview'])    ? 1 : 0;
    $maxAttempts      = isset($requestData['maxAttempts'])      ? max(1, (int)$requestData['maxAttempts']) : 1;
    $accessPassword   = isset($requestData['accessPassword'])   ? trim($requestData['accessPassword'])   : '';
    $availableFrom    = isset($requestData['availableFrom'])    ? trim($requestData['availableFrom'])    : null;
    $availableUntil   = isset($requestData['availableUntil'])   ? trim($requestData['availableUntil'])   : null;
    $category         = isset($requestData['category'])         ? trim($requestData['category'])         : null;

    $allowed = ['Easy', 'Medium', 'Hard'];
    if (!in_array($difficulty, $allowed)) $difficulty = 'Medium';
    if ($passMark < 0 || $passMark > 100) $passMark = 60;
    if ($availableFrom === '') $availableFrom = null;
    if ($availableUntil === '') $availableUntil = null;
    if ($category === '') $category = null;
    $hashedPassword = $accessPassword !== '' ? password_hash($accessPassword, PASSWORD_BCRYPT) : null;

    if (empty($title) || empty($subject) || count($questions) === 0) {
        respond('error', ['message' => 'Please fill in all details and add at least one question.']);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO `exams` (`title`, `subject`, `duration`, `totalQuestions`, `difficulty`, `createdBy`, `createdAt`, `passMark`, `shuffleQuestions`, `shuffleOptions`, `showCorrectAnswers`, `allowReReview`, `maxAttempts`, `accessPassword`, `accessCodePlain`, `availableFrom`, `availableUntil`, `category`)
                               VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$title, $subject, $duration, count($questions), $difficulty, $currentUser['id'],
                        $passMark, $shuffleQuestions, $shuffleOptions, $showCorrect, $allowReReview, $maxAttempts,
                        $hashedPassword, $accessPassword !== '' ? $accessPassword : null, $availableFrom, $availableUntil, $category]);
        $examId = $pdo->lastInsertId();

        $stmtQ = $pdo->prepare("INSERT INTO `questions` (`examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`, `questionType`, `acceptedAnswers`)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($questions as $q) {
            $qType    = isset($q['questionType']) ? trim($q['questionType']) : 'single';
            $accepted = isset($q['acceptedAnswers']) ? json_encode($q['acceptedAnswers']) : null;
            $stmtQ->execute([
                $examId,
                $q['question'],
                $q['options'][0],
                $q['options'][1],
                $q['options'][2],
                $q['options'][3],
                (int)$q['correctAnswer'],
                isset($q['points']) ? (int)$q['points'] : 1,
                $qType,
                $accepted
            ]);
        }

        $pdo->commit();
        notifyStudentsOfNewExam($pdo, $currentUser['id'], $examId, $title);
        respond('success');
    } catch (Exception $e) {
        $pdo->rollBack();
        respond('error', ['message' => 'Failed to create exam: ' . $e->getMessage()]);
    }
}

if ($action === 'teacher_edit_exam') {
    $examId     = isset($requestData['examId'])     ? (int)$requestData['examId']         : 0;
    $title      = isset($requestData['title'])      ? trim($requestData['title'])          : '';
    $subject    = isset($requestData['subject'])    ? trim($requestData['subject'])        : '';
    $duration   = isset($requestData['duration'])   ? (int)$requestData['duration']       : 30;
    $difficulty = isset($requestData['difficulty']) ? trim($requestData['difficulty'])    : 'Medium';
    $questions  = isset($requestData['questions'])  ? $requestData['questions']            : [];
    // New fields for edit
    $passMark         = isset($requestData['passMark'])         ? (int)$requestData['passMark']         : 60;
    $shuffleQuestions = !empty($requestData['shuffleQuestions']) ? 1 : 0;
    $shuffleOptions   = !empty($requestData['shuffleOptions'])   ? 1 : 0;
    $showCorrect      = isset($requestData['showCorrectAnswers']) ? (int)(bool)$requestData['showCorrectAnswers'] : 1;
    $allowReReview    = !empty($requestData['allowReReview'])    ? 1 : 0;
    $maxAttempts      = isset($requestData['maxAttempts'])      ? max(1, (int)$requestData['maxAttempts']) : 1;
    $accessPassword   = isset($requestData['accessPassword'])   ? trim($requestData['accessPassword'])   : '';
    $availableFrom    = isset($requestData['availableFrom'])    ? trim($requestData['availableFrom'])    : null;
    $availableUntil   = isset($requestData['availableUntil'])   ? trim($requestData['availableUntil'])   : null;
    $category         = isset($requestData['category'])         ? trim($requestData['category'])         : null;

    if ($examId <= 0 || empty($title) || empty($subject) || count($questions) === 0)
        respond('error', ['message' => 'All fields and at least one question are required.']);

    $allowed = ['Easy','Medium','Hard'];
    if (!in_array($difficulty, $allowed)) $difficulty = 'Medium';
    if ($passMark < 0 || $passMark > 100) $passMark = 60;
    if ($availableFrom === '') $availableFrom = null;
    if ($availableUntil === '') $availableUntil = null;
    if ($category === '') $category = null;

    // Hash password if provided; keep existing if empty (don't overwrite with empty)
    $hashedPassword = null;
    $passwordUpdateSQL = '';
    $passwordParams = [];
    if ($accessPassword !== '') {
        $hashedPassword = password_hash($accessPassword, PASSWORD_BCRYPT);
        $passwordUpdateSQL = ', `accessPassword` = ?, `accessCodePlain` = ?';
        $passwordParams = [$hashedPassword, $accessPassword];
    }

    $pdo->beginTransaction();
    try {
        $sql = "UPDATE `exams` SET `title`=?,`subject`=?,`duration`=?,`totalQuestions`=?,`difficulty`=?,`passMark`=?,`shuffleQuestions`=?,`shuffleOptions`=?,`showCorrectAnswers`=?,`allowReReview`=?,`maxAttempts`=?,`availableFrom`=?,`availableUntil`=?,`category`=?" . $passwordUpdateSQL . " WHERE `id`=?";
        $params = array_merge([$title, $subject, $duration, count($questions), $difficulty, $passMark, $shuffleQuestions, $shuffleOptions, $showCorrect, $allowReReview, $maxAttempts, $availableFrom, $availableUntil, $category], $passwordParams, [$examId]);
        $pdo->prepare($sql)->execute($params);

        $pdo->prepare("DELETE FROM `questions` WHERE `examId` = ?")->execute([$examId]);
        $stmtQ = $pdo->prepare("INSERT INTO `questions` (`examId`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`points`) VALUES (?,?,?,?,?,?,?,?)");
        foreach ($questions as $q) {
            $stmtQ->execute([
                $examId, $q['question'],
                $q['options'][0], $q['options'][1], $q['options'][2], $q['options'][3],
                (int)$q['correctAnswer'],
                isset($q['points']) ? max(1,(int)$q['points']) : 1
            ]);
        }
        $pdo->commit();
        respond('success', ['message' => 'Exam updated.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond('error', ['message' => 'Update failed: '.$e->getMessage()]);
    }
}

if ($action === 'teacher_preview_exam') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) respond('error', ['message' => 'Invalid exam ID.']);

    $chk = $pdo->prepare("SELECT id FROM `exams` WHERE `id` = ? AND `createdBy` = ?");
    $chk->execute([$examId, $currentUser['id']]);
    if (!$chk->fetch()) respond('error', ['message' => 'You do not own this exam.']);

    $stmt = $pdo->prepare("SELECT * FROM `exams` WHERE `id` = ?");
    $stmt->execute([$examId]);
    $exam = $stmt->fetch();

    $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`, `questionType` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll();

    $formatted = array_map(fn($q) => [
        'id' => (int)$q['id'],
        'question' => $q['question'],
        'options' => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
        'correctAnswer' => (int)$q['correctAnswer'],
        'points' => (int)$q['points'],
        'questionType' => $q['questionType'] ?: 'single'
    ], $questions);

    $exam['questions'] = $formatted;
    unset($exam['accessPassword']);
    respond('success', ['exam' => $exam]);
}

if ($action === 'teacher_question_analytics') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) respond('error', ['message' => 'Invalid exam ID.']);

    // Ownership check — but also allow if exam has no creator (legacy seeded exams)
    $chk = $pdo->prepare("SELECT id, createdBy FROM `exams` WHERE `id` = ?");
    $chk->execute([$examId]);
    $examRow = $chk->fetch();
    if (!$examRow) respond('error', ['message' => 'Exam not found.']);
    // Allow if teacher owns it OR if createdBy is null/0 (legacy exam)
    if ($examRow['createdBy'] && $examRow['createdBy'] != $currentUser['id'] && $currentUser['role'] === 'teacher') {
        // Still allow — teachers in the same system can view analytics
    }

    // Use try-catch for query in case questionType column doesn't exist yet
    try {
        $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `questionType` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
        $stmt->execute([$examId]);
        $questions = $stmt->fetchAll();
    } catch (PDOException $colErr) {
        // Fallback: query without questionType column
        $stmt = $pdo->prepare("SELECT `id`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer` FROM `questions` WHERE `examId` = ? ORDER BY `id` ASC");
        $stmt->execute([$examId]);
        $questions = $stmt->fetchAll();
        // Add default questionType
        foreach ($questions as &$q) { $q['questionType'] = 'single'; }
        unset($q);
    }

    $stmt2 = $pdo->prepare("SELECT `answerData` FROM `results` WHERE `examId` = ? AND `answerData` IS NOT NULL");
    $stmt2->execute([$examId]);
    $allAnswerData = $stmt2->fetchAll(PDO::FETCH_COLUMN);

    $analytics = [];
    foreach ($questions as $q) {
        $totalAttempts = 0;
        $correctCount = 0;
        $distribution = [0, 0, 0, 0];
        $unanswered = 0;

        foreach ($allAnswerData as $json) {
            $data = json_decode($json, true);
            if (!$data || !isset($data['answerReview'])) continue;
            foreach ($data['answerReview'] as $item) {
                if ($item['question'] === $q['question']) {
                    $totalAttempts++;
                    $sel = $item['selectedAnswer'];
                    if ($sel === null) {
                        $unanswered++;
                    } else if (isset($distribution[$sel])) {
                        $distribution[$sel]++;
                    }
                    if ($item['isCorrect']) $correctCount++;
                    break;
                }
            }
        }

        $pctCorrect = $totalAttempts > 0 ? round(($correctCount / $totalAttempts) * 100) : 0;
        $needsReview = $totalAttempts > 0 && $pctCorrect < 30;

        $mostCommonWrong = null;
        if ($totalAttempts > 0) {
            $wrongDist = [];
            for ($i = 0; $i < 4; $i++) {
                if ($i !== (int)$q['correctAnswer'] && $distribution[$i] > 0) {
                    $wrongDist[$i] = $distribution[$i];
                }
            }
            if (!empty($wrongDist)) {
                arsort($wrongDist);
                $mostCommonWrong = ['index' => array_key_first($wrongDist), 'count' => reset($wrongDist)];
            }
        }

        $analytics[] = [
            'id' => (int)$q['id'],
            'question' => $q['question'],
            'options' => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'correctAnswer' => (int)$q['correctAnswer'],
            'questionType' => $q['questionType'] ?: 'single',
            'totalAttempts' => $totalAttempts,
            'correctCount' => $correctCount,
            'pctCorrect' => $pctCorrect,
            'distribution' => $distribution,
            'unanswered' => $unanswered,
            'mostCommonWrong' => $mostCommonWrong,
            'needsReview' => $needsReview
        ];
    }

    respond('success', ['analytics' => $analytics]);
}

if ($action === 'teacher_export_csv') {
    $examId   = isset($_GET['examId'])   ? (int)$_GET['examId']              : 0;
    $dateFrom = isset($_GET['dateFrom']) ? trim($_GET['dateFrom'])            : '';
    $dateTo   = isset($_GET['dateTo'])   ? trim($_GET['dateTo'])              : '';

    $where  = ['1=1'];
    $params = [];
    if ($examId > 0)       { $where[] = 'r.examId = ?';            $params[] = $examId; }
    if ($dateFrom !== '')  { $where[] = 'DATE(r.completedAt) >= ?'; $params[] = $dateFrom; }
    if ($dateTo   !== '')  { $where[] = 'DATE(r.completedAt) <= ?'; $params[] = $dateTo; }

    $sql  = "SELECT r.id, u.name AS studentName, u.userId AS studentId, u.email,
                    e.title AS examTitle, e.subject, r.score, r.correctAnswers,
                    r.totalQuestions, r.timeTaken, r.completedAt,
                    CASE WHEN r.score >= 60 THEN 'Pass' ELSE 'Fail' END AS result
             FROM `results` r
             JOIN `users` u ON r.studentId = u.id
             JOIN `exams` e ON r.examId = e.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY r.completedAt DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="fetenax_results_' . date('Ymd_His') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['#','Student Name','Student ID','Email','Exam','Subject','Score (%)','Correct','Total Qs','Time (s)','Completed At','Result']);
    foreach ($rows as $i => $r) {
        fputcsv($out, [
            $i+1, $r['studentName'], $r['studentId'], $r['email'],
            $r['examTitle'], $r['subject'], $r['score'],
            $r['correctAnswers'], $r['totalQuestions'],
            $r['timeTaken'], $r['completedAt'], $r['result']
        ]);
    }
    fclose($out);
    exit;
}

if ($action === 'teacher_bulk_import') {
    if (!isset($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
        respond('error', ['message' => 'No file uploaded or upload error.']);
    }

    $fileTmp = $_FILES['csv']['tmp_name'];
    $fileName = $_FILES['csv']['name'];
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    if ($ext !== 'csv' && $_FILES['csv']['type'] !== 'text/csv') {
        respond('error', ['message' => 'Please upload a .csv file.']);
    }

    if (($handle = fopen($fileTmp, 'r')) === false) {
        respond('error', ['message' => 'Failed to open uploaded file.']);
    }

    $rows = [];
    while (($data = fgetcsv($handle, 2000, ',')) !== false) {
        $rows[] = $data;
    }
    fclose($handle);
    if (count($rows) === 0) respond('error', ['message' => 'CSV file is empty.']);

    $firstRow = array_map('strtolower', array_map('trim', $rows[0]));
    $headerKeywords = ['name', 'email', 'username', 'userid', 'student id', 'password', 'pwd'];
    $hasHeader = false;
    foreach ($firstRow as $cell) {
        if (in_array($cell, $headerKeywords, true)) { $hasHeader = true; break; }
    }
    if ($hasHeader) array_shift($rows);

    $imported = 0;
    $skipped  = 0;
    $errors   = 0;
    $results  = [];

    $existingEmails = [];
    $existingIds    = [];
    $stmt = $pdo->query("SELECT `email`, `userId` FROM `users`");
    foreach ($stmt->fetchAll() as $u) {
        $existingEmails[strtolower($u['email'])] = true;
        $existingIds[strtolower($u['userId'])]   = true;
    }

    $insertStmt = $pdo->prepare("INSERT INTO `users` (`email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, 'student', ?, ?, ?)");

    foreach ($rows as $idx => $row) {
        $rowNum = $idx + ($hasHeader ? 2 : 1);
        while (count($row) < 4) $row[] = '';
        $name     = trim($row[0]);
        $email    = trim($row[1]);
        $userId   = trim($row[2]);
        $password = trim($row[3]);

        if ($name === '' || $email === '' || $userId === '' || $password === '') {
            $errors++;
            $results[] = ['row' => $rowNum, 'status' => 'error', 'message' => 'Missing required field(s).', 'name' => $name, 'email' => $email];
            continue;
        }
        if (strlen($password) < 6) {
            $errors++;
            $results[] = ['row' => $rowNum, 'status' => 'error', 'message' => 'Password must be at least 6 chars.', 'name' => $name, 'email' => $email];
            continue;
        }
        if (isset($existingEmails[strtolower($email)])) {
            $skipped++;
            $results[] = ['row' => $rowNum, 'status' => 'skipped', 'message' => 'Email already exists.', 'name' => $name, 'email' => $email];
            continue;
        }
        if (isset($existingIds[strtolower($userId)])) {
            $skipped++;
            $results[] = ['row' => $rowNum, 'status' => 'skipped', 'message' => 'Student ID already exists.', 'name' => $name, 'email' => $email];
            continue;
        }

        $words = explode(' ', $name);
        $avatar = '';
        foreach ($words as $w) { if ($w !== '') $avatar .= strtoupper(substr($w, 0, 1)); }
        $avatar = substr($avatar, 0, 2) ?: 'ST';

        $hashed = password_hash($password, PASSWORD_BCRYPT);
        try {
            $insertStmt->execute([$email, $hashed, $name, $avatar, $userId]);
            $existingEmails[strtolower($email)] = true;
            $existingIds[strtolower($userId)]   = true;
            $imported++;
            $results[] = ['row' => $rowNum, 'status' => 'imported', 'message' => 'OK', 'name' => $name, 'email' => $email];
        } catch (Exception $e) {
            $errors++;
            $results[] = ['row' => $rowNum, 'status' => 'error', 'message' => $e->getMessage(), 'name' => $name, 'email' => $email];
        }
    }

    respond('success', [
        'imported' => $imported,
        'skipped'  => $skipped,
        'errors'   => $errors,
        'total'    => count($rows),
        'rows'     => $results,
        'message'  => "Imported $imported, skipped $skipped, errors $errors."
    ]);
}

if ($action === 'teacher_bulk_import_exam') {
    if (!isset($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
        respond('error', ['message' => 'No CSV file uploaded.']);
    }
    $title   = isset($_POST['title']) ? trim($_POST['title']) : '';
    $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
    $duration = isset($_POST['duration']) ? (int)$_POST['duration'] : 30;
    $difficulty = isset($_POST['difficulty']) ? trim($_POST['difficulty']) : 'Medium';
    if (empty($title) || empty($subject)) respond('error', ['message' => 'Exam title and subject are required.']);

    $handle = fopen($_FILES['csv']['tmp_name'], 'r');
    if (!$handle) respond('error', ['message' => 'Failed to open CSV.']);
    $csvRows = [];
    while (($data = fgetcsv($handle, 2000, ',')) !== false) $csvRows[] = $data;
    fclose($handle);
    if (count($csvRows) === 0) respond('error', ['message' => 'CSV is empty.']);
    $firstRowLower = array_map('strtolower', array_map('trim', $csvRows[0]));
    if (in_array('question', $firstRowLower) || in_array('correctanswer', $firstRowLower)) array_shift($csvRows);

    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO `exams` (`title`,`subject`,`duration`,`totalQuestions`,`difficulty`,`createdBy`,`createdAt`) VALUES (?,?,?,?,?,NOW())")
            ->execute([$title, $subject, $duration, count($csvRows), $difficulty, $currentUser['id']]);
        $examId = $pdo->lastInsertId();
        $insQ = $pdo->prepare("INSERT INTO `questions` (`examId`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`points`,`questionType`) VALUES (?,?,?,?,?,?,?,?,?)");
        $imported = 0; $errors = 0;
        foreach ($csvRows as $row) {
            while (count($row) < 6) $row[] = '';
            $qText = trim($row[0]);
            if ($qText === '') { $errors++; continue; }
            $opts = [trim($row[1]), trim($row[2]), trim($row[3]), trim($row[4])];
            $correct = isset($row[5]) ? (int)$row[5] : 0;
            if ($correct < 0 || $correct > 3) $correct = 0;
            $pts = isset($row[6]) && $row[6] !== '' ? max(1, (int)$row[6]) : 1;
            $insQ->execute([$examId, $qText, $opts[0], $opts[1], $opts[2], $opts[3], $correct, $pts, 'single']);
            $imported++;
        }
        $pdo->commit();
        respond('success', ['examId' => (int)$examId, 'imported' => $imported, 'errors' => $errors, 'message' => "Imported $imported questions."]);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond('error', ['message' => 'Import failed: ' . $e->getMessage()]);
    }
}

if ($action === 'teacher_save_template') {
    $name      = isset($requestData['name']) ? trim($requestData['name']) : '';
    $subject   = isset($requestData['subject']) ? trim($requestData['subject']) : '';
    $duration  = isset($requestData['duration']) ? (int)$requestData['duration'] : 30;
    $difficulty= isset($requestData['difficulty']) ? trim($requestData['difficulty']) : 'Medium';
    $passMark  = isset($requestData['passMark']) ? (int)$requestData['passMark'] : 60;
    $shuffleQ  = !empty($requestData['shuffleQuestions']) ? 1 : 0;
    $shuffleO  = !empty($requestData['shuffleOptions']) ? 1 : 0;
    $showC     = isset($requestData['showCorrectAnswers']) ? (int)(bool)$requestData['showCorrectAnswers'] : 1;
    $maxAtt    = isset($requestData['maxAttempts']) ? max(1, (int)$requestData['maxAttempts']) : 1;
    $category  = isset($requestData['category']) ? trim($requestData['category']) : null;
    if (empty($name) || empty($subject)) respond('error', ['message' => 'Template name and subject are required.']);
    if ($category === '') $category = null;

    $pdo->prepare("INSERT INTO `exam_templates` (`teacherId`,`name`,`subject`,`duration`,`difficulty`,`passMark`,`shuffleQuestions`,`shuffleOptions`,`showCorrectAnswers`,`maxAttempts`,`category`) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$currentUser['id'],$name,$subject,$duration,$difficulty,$passMark,$shuffleQ,$shuffleO,$showC,$maxAtt,$category]);
    respond('success', ['id' => (int)$pdo->lastInsertId(), 'message' => 'Template saved.']);
}

if ($action === 'teacher_list_templates') {
    $stmt = $pdo->prepare("SELECT * FROM `exam_templates` WHERE `teacherId` = ? ORDER BY `createdAt` DESC");
    $stmt->execute([$currentUser['id']]);
    respond('success', ['templates' => $stmt->fetchAll()]);
}

if ($action === 'teacher_delete_template') {
    $tid = isset($requestData['templateId']) ? (int)$requestData['templateId'] : 0;
    if ($tid <= 0) respond('error', ['message' => 'Invalid template ID.']);
    $pdo->prepare("DELETE FROM `exam_templates` WHERE `id` = ? AND `teacherId` = ?")->execute([$tid, $currentUser['id']]);
    respond('success');
}

if ($action === 'teacher_student_profile') {
    $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
    if ($studentId <= 0) respond('error', ['message' => 'Invalid student ID.']);

    $stmt = $pdo->prepare("SELECT `id`, `name`, `email`, `userId`, `avatar` FROM `users` WHERE `id` = ? AND `role` = 'student'");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();
    if (!$student) respond('error', ['message' => 'Student not found.']);

    $stmt = $pdo->prepare("
        SELECT r.id, r.examId, e.title AS examTitle, e.subject,
               r.score, r.correctAnswers, r.totalQuestions, r.timeTaken, r.completedAt
        FROM `results` r
        JOIN `exams` e ON r.examId = e.id
        WHERE r.studentId = ?
        ORDER BY r.completedAt DESC
    ");
    $stmt->execute([$studentId]);
    $attempts = $stmt->fetchAll();

    $totalAttempts = count($attempts);
    $avgScore      = $totalAttempts > 0 ? (int)round(array_sum(array_column($attempts, 'score')) / $totalAttempts) : 0;
    $bestScore     = $totalAttempts > 0 ? (int)max(array_column($attempts, 'score')) : 0;
    $passedCount   = count(array_filter($attempts, fn($a) => (int)$a['score'] >= 60));
    $passRate      = $totalAttempts > 0 ? (int)round(($passedCount / $totalAttempts) * 100) : 0;

    $stmt = $pdo->prepare("
        SELECT e.subject,
               COUNT(*)         AS attempts,
               ROUND(AVG(r.score)) AS avgScore,
               MAX(r.score)        AS bestScore,
               MIN(r.score)        AS lowestScore
        FROM `results` r
        JOIN `exams` e ON r.examId = e.id
        WHERE r.studentId = ?
        GROUP BY e.subject
        ORDER BY avgScore DESC
    ");
    $stmt->execute([$studentId]);
    $subjectStats = $stmt->fetchAll();

    $stmt = $pdo->prepare("SELECT `type`, `earnedAt` FROM `badges` WHERE `studentId` = ? ORDER BY `earnedAt` DESC");
    $stmt->execute([$studentId]);
    $badgeRows = $stmt->fetchAll();
    $badges = array_map(fn($b) => [
        'type'     => $b['type'],
        'label'    => BADGE_LABELS[$b['type']] ?? $b['type'],
        'icon'     => BADGE_ICONS[$b['type']]  ?? '🏅',
        'earnedAt' => $b['earnedAt']
    ], $badgeRows);

    respond('success', [
        'student' => $student,
        'attempts' => $attempts,
        'stats' => [
            'totalAttempts' => $totalAttempts,
            'averageScore'  => $avgScore,
            'bestScore'     => $bestScore,
            'passRate'      => $passRate
        ],
        'subjectStats' => $subjectStats,
        'badges' => $badges
    ]);
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
