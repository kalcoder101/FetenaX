<?php
// api/question_bank.php - Question Bank actions for FetenaX
// Included by api.php. Variables: $pdo, $requestData, $action, $currentUser, respond()

// Verify teacher role
if ($currentUser['role'] !== 'teacher') {
    respond('error', ['message' => 'Teacher access required.']);
}

if ($action === 'teacher_get_bank') {
    $search  = isset($_GET['search'])  ? trim($_GET['search'])  : '';
    $subject = isset($_GET['subject']) ? trim($_GET['subject']) : '';

    $where  = ['createdBy = ?'];
    $params = [$currentUser['id']];

    if ($search !== '') {
        $where[]  = 'question LIKE ?';
        $params[] = '%' . $search . '%';
    }
    if ($subject !== '') {
        $where[]  = 'subject = ?';
        $params[] = $subject;
    }

    $whereSQL = implode(' AND ', $where);
    $stmt = $pdo->prepare("SELECT * FROM `question_bank` WHERE $whereSQL ORDER BY createdAt DESC");
    $stmt->execute($params);
    $questions = $stmt->fetchAll();

    $stmt2 = $pdo->prepare("SELECT DISTINCT subject FROM `question_bank` WHERE createdBy = ? AND subject != '' ORDER BY subject ASC");
    $stmt2->execute([$currentUser['id']]);
    $subjects = array_column($stmt2->fetchAll(), 'subject');

    $stmt3 = $pdo->prepare("SELECT COUNT(*) FROM `question_bank` WHERE createdBy = ?");
    $stmt3->execute([$currentUser['id']]);
    $totalCount = (int)$stmt3->fetchColumn();

    respond('success', ['questions' => $questions, 'subjects' => $subjects, 'totalCount' => $totalCount]);
}

if ($action === 'teacher_add_to_bank') {
    $question      = isset($requestData['question'])      ? trim($requestData['question'])      : '';
    $options       = isset($requestData['options'])       ? $requestData['options']             : [];
    $correctAnswer = isset($requestData['correctAnswer']) ? (int)$requestData['correctAnswer']  : 0;
    $subject       = isset($requestData['subject'])       ? trim($requestData['subject'])       : '';
    $difficulty    = isset($requestData['difficulty'])    ? trim($requestData['difficulty'])    : 'Medium';

    if (empty($question) || count($options) < 4 || array_filter($options, fn($o) => trim($o) === '')) {
        respond('error', ['message' => 'Question text and all 4 options are required.']);
    }
    $allowed = ['Easy', 'Medium', 'Hard'];
    if (!in_array($difficulty, $allowed)) $difficulty = 'Medium';

    $stmt = $pdo->prepare(
        "INSERT INTO `question_bank` (`createdBy`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`subject`,`difficulty`)
         VALUES (?,?,?,?,?,?,?,?,?)"
    );
    $stmt->execute([
        $currentUser['id'], $question,
        $options[0], $options[1], $options[2], $options[3],
        $correctAnswer, $subject, $difficulty
    ]);

    respond('success', ['id' => (int)$pdo->lastInsertId(), 'message' => 'Question added to bank.']);
}

if ($action === 'teacher_delete_from_bank') {
    $qid = isset($requestData['questionId']) ? (int)$requestData['questionId'] : 0;
    if ($qid <= 0) respond('error', ['message' => 'Invalid question ID.']);

    $stmt = $pdo->prepare("DELETE FROM `question_bank` WHERE `id` = ? AND `createdBy` = ?");
    $stmt->execute([$qid, $currentUser['id']]);

    respond('success', ['message' => 'Question removed from bank.']);
}

if ($action === 'teacher_import_from_bank') {
    $ids = isset($requestData['questionIds']) ? array_map('intval', $requestData['questionIds']) : [];
    if (empty($ids)) respond('error', ['message' => 'No questions selected.']);

    $ph   = implode(',', array_fill(0, count($ids), '?'));
    $args = array_merge($ids, [$currentUser['id']]);

    $stmt = $pdo->prepare("SELECT * FROM `question_bank` WHERE `id` IN ($ph) AND `createdBy` = ?");
    $stmt->execute($args);
    $rows = $stmt->fetchAll();

    $pdo->prepare("UPDATE `question_bank` SET `usageCount` = `usageCount` + 1 WHERE `id` IN ($ph) AND `createdBy` = ?")
        ->execute($args);

    $out = array_map(fn($q) => [
        'id'            => (int)$q['id'],
        'question'      => $q['question'],
        'options'       => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
        'correctAnswer' => (int)$q['correctAnswer'],
        'subject'       => $q['subject'],
        'difficulty'    => $q['difficulty']
    ], $rows);

    respond('success', ['questions' => $out]);
}

if ($action === 'teacher_save_exam_to_bank') {
    $examId = isset($requestData['examId']) ? (int)$requestData['examId'] : 0;
    if ($examId <= 0) respond('error', ['message' => 'Invalid exam ID.']);

    $stmtE = $pdo->prepare("SELECT `subject`, `difficulty` FROM `exams` WHERE `id` = ?");
    $stmtE->execute([$examId]);
    $exam = $stmtE->fetch();
    if (!$exam) respond('error', ['message' => 'Exam not found.']);

    $stmtQ = $pdo->prepare("SELECT * FROM `questions` WHERE `examId` = ?");
    $stmtQ->execute([$examId]);
    $questions = $stmtQ->fetchAll();
    if (empty($questions)) respond('error', ['message' => 'This exam has no questions.']);

    $stmtIns = $pdo->prepare(
        "INSERT INTO `question_bank` (`createdBy`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`subject`,`difficulty`)
         VALUES (?,?,?,?,?,?,?,?,?)"
    );
    $stmtChk = $pdo->prepare(
        "SELECT `id` FROM `question_bank` WHERE `createdBy` = ? AND `question` = ? LIMIT 1"
    );

    $added = $skipped = 0;
    foreach ($questions as $q) {
        $stmtChk->execute([$currentUser['id'], $q['question']]);
        if ($stmtChk->fetch()) { $skipped++; continue; }
        $stmtIns->execute([
            $currentUser['id'], $q['question'],
            $q['option1'], $q['option2'], $q['option3'], $q['option4'],
            (int)$q['correctAnswer'], $exam['subject'], $exam['difficulty']
        ]);
        $added++;
    }

    respond('success', [
        'added'   => $added,
        'skipped' => $skipped,
        'message' => "$added question(s) saved to bank" . ($skipped ? " ($skipped duplicate(s) skipped)." : ".")
    ]);
}
