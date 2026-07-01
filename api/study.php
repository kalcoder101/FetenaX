<?php
// api/study.php — FetenaX v31 study & analytics endpoints.
// Included by api.php. Variables: $pdo, $requestData, $action, $currentUser, respond().
//
// Defensive: detects whether the v31/v32 columns (explanation, hint1, hint2,
// filePath, etc.) exist in the DB at runtime, so the API keeps working even
// if the migration hasn't been applied yet.

// ============================================================
//  Helper — detect which optional columns exist on `questions` & `study_resources`
// ============================================================
function studyDetectQuestionColumns($pdo) {
    static $cache = null;
    if ($cache !== null) return $cache;
    $cache = ['hasExtras' => false, 'hasImage' => false];
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `questions` LIKE 'explanation'");
        $stmt->execute();
        if ($stmt->fetch()) $cache['hasExtras'] = true;
        $stmt2 = $pdo->prepare("SHOW COLUMNS FROM `questions` LIKE 'imageUrl'");
        $stmt2->execute();
        if ($stmt2->fetch()) $cache['hasImage'] = true;
    } catch (Exception $e) { /* ignore */ }
    return $cache;
}

function studyDetectResourceColumns($pdo) {
    static $cache = null;
    if ($cache !== null) return $cache;
    $cache = ['hasFile' => false];
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `study_resources` LIKE 'filePath'");
        $stmt->execute();
        if ($stmt->fetch()) $cache['hasFile'] = true;
    } catch (Exception $e) { /* ignore */ }
    return $cache;
}

// ============================================================
//  SUBJECTS — list distinct subjects with question counts
// ============================================================
if ($action === 'study_list_subjects') {
    $stmt = $pdo->prepare(
        "SELECT e.`subject` AS subject, COUNT(q.`id`) AS qCount
         FROM `exams` e
         JOIN `questions` q ON q.`examId` = e.`id`
         WHERE e.`subject` IS NOT NULL AND e.`subject` <> ''
         GROUP BY e.`subject`
         ORDER BY e.`subject` ASC"
    );
    $stmt->execute();
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Include SRS counts per subject for the current student (if student)
    if ($currentUser['role'] === 'student') {
        $stmt2 = $pdo->prepare(
            "SELECT `subject`, COUNT(*) AS dueCount
             FROM `srs_queue`
             WHERE `studentId` = ? AND `nextReviewAt` <= NOW()
             GROUP BY `subject`"
        );
        $stmt2->execute([$currentUser['id']]);
        $due = [];
        foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $due[$r['subject']] = (int)$r['dueCount'];
        }
        foreach ($subjects as &$s) {
            $s['dueCount'] = $due[$s['subject']] ?? 0;
        }
    }
    respond('success', ['subjects' => $subjects]);
}

// ============================================================
//  PRACTICE BY SUBJECT
// ============================================================
if ($action === 'study_practice_by_subject') {
    if ($currentUser['role'] !== 'student') {
        respond('error', ['message' => 'Students only.']);
    }
    $subject = isset($requestData['subject']) ? trim($requestData['subject']) : '';
    $limit   = isset($requestData['limit'])   ? max(1, min(115, (int)$requestData['limit'])) : 10;
    if ($subject === '') respond('error', ['message' => 'Subject is required.']);

    // Detect which optional columns exist (defensive: works whether or not the v31 migration was applied)
    $cols = studyDetectQuestionColumns($pdo);
    $extraSelect = $cols['hasExtras']
        ? ', q.`explanation`, q.`hint1`, q.`hint2`'
        : ', NULL AS `explanation`, NULL AS `hint1`, NULL AS `hint2`';
    $extraSelect .= $cols['hasImage']
        ? ', q.`imageUrl`'
        : ', NULL AS `imageUrl`';

    try {
        $stmt = $pdo->prepare(
            "SELECT q.`id`, q.`question`, q.`option1`, q.`option2`, q.`option3`, q.`option4`,
                    q.`correctAnswer`, q.`points`" . $extraSelect . ",
                    q.`examId`, e.`subject`
             FROM `questions` q
             JOIN `exams` e ON e.`id` = q.`examId`
             WHERE e.`subject` = ?
             ORDER BY RAND()
             LIMIT " . (int)$limit
        );
        $stmt->execute([$subject]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        respond('error', ['message' => 'Database error: ' . $e->getMessage()]);
    }

    if (empty($rows)) respond('error', ['message' => 'No questions found for this subject yet.']);

    $questions = array_map(function ($q) {
        return [
            'id'            => (int)$q['id'],
            'examId'        => (int)$q['examId'],
            'question'      => $q['question'],
            'options'       => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'correctAnswer' => (int)$q['correctAnswer'],
            'points'        => (int)$q['points'],
            'explanation'   => $q['explanation'] ?: null,
            'hint1'         => $q['hint1']       ?: null,
            'hint2'         => $q['hint2']       ?: null,
            'imageUrl'      => $q['imageUrl']    ?: null,
            'subject'       => $q['subject']
        ];
    }, $rows);

    respond('success', [
        'subject'   => $subject,
        'mode'      => 'subject',
        'questions' => $questions,
        'sessionId' => 'subj_' . $subject . '_' . time()
    ]);
}

// ============================================================
//  MOCK EXIT EXAM SIMULATOR — 115 random questions across all subjects
// ============================================================
if ($action === 'study_generate_mock') {
    if ($currentUser['role'] !== 'student') {
        respond('error', ['message' => 'Students only.']);
    }

    // Try to balance across subjects. Strategy:
    // 1) Get all subjects with their question counts
    // 2) Distribute 115 slots proportionally; cap each subject at its count
    // 3) Pull random questions per subject
    $stmt = $pdo->query(
        "SELECT e.`subject`, COUNT(q.`id`) AS cnt
         FROM `exams` e JOIN `questions` q ON q.`examId` = e.`id`
         WHERE e.`subject` IS NOT NULL AND e.`subject` <> ''
         GROUP BY e.`subject` ORDER BY e.`subject`"
    );
    $subjectStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($subjectStats)) respond('error', ['message' => 'No questions available yet.']);

    $totalAvailable = array_sum(array_column($subjectStats, 'cnt'));
    $target = min(115, $totalAvailable);

    // Allocate per subject (proportional, at least 1 if subject has questions)
    $allocation = [];
    $remaining  = $target;
    foreach ($subjectStats as $i => $s) {
        $share = max(1, (int)round($target * $s['cnt'] / max(1, $totalAvailable)));
        $share = min($share, (int)$s['cnt']);
        $allocation[$s['subject']] = $share;
        $remaining -= $share;
    }
    // Adjust last subject to consume any remainder (positive or negative)
    if ($remaining !== 0 && !empty($subjectStats)) {
        $last = $subjectStats[count($subjectStats) - 1]['subject'];
        $allocation[$last] = max(0, $allocation[$last] + $remaining);
    }

    $questions = [];
    foreach ($allocation as $subj => $n) {
        if ($n <= 0) continue;
        $stmt = $pdo->prepare(
            "SELECT q.`id`, q.`question`, q.`option1`, q.`option2`, q.`option3`, q.`option4`,
                    q.`correctAnswer`, q.`points`, q.`examId`, e.`subject`
             FROM `questions` q JOIN `exams` e ON e.`id` = q.`examId`
             WHERE e.`subject` = ?
             ORDER BY RAND() LIMIT $n"
        );
        $stmt->execute([$subj]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $q) {
            $questions[] = [
                'id'            => (int)$q['id'],
                'examId'        => (int)$q['examId'],
                'question'      => $q['question'],
                'options'       => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
                'correctAnswer' => (int)$q['correctAnswer'],
                'points'        => (int)$q['points'],
                'subject'       => $q['subject']
            ];
        }
    }
    // Shuffle the merged set so subjects aren't grouped
    shuffle($questions);

    respond('success', [
        'mode'      => 'mock',
        'duration'  => 180, // minutes (3 hours)
        'questions' => $questions,
        'sessionId' => 'mock_' . time(),
        'totalQs'   => count($questions)
    ]);
}

// ============================================================
//  SAVE PRACTICE/MOCK SESSION (analytics + SRS update)
// ============================================================
if ($action === 'study_save_session') {
    if ($currentUser['role'] !== 'student') {
        respond('error', ['message' => 'Students only.']);
    }
    $subject     = isset($requestData['subject']) ? trim($requestData['subject']) : '';
    $mode        = isset($requestData['mode']) && in_array($requestData['mode'], ['practice','mock','subject'], true) ? $requestData['mode'] : 'practice';
    $totalQs     = isset($requestData['totalQs']) ? (int)$requestData['totalQs'] : 0;
    $correctQs   = isset($requestData['correctQs']) ? (int)$requestData['correctQs'] : 0;
    $timeTakenSec= isset($requestData['timeTakenSec']) ? (int)$requestData['timeTakenSec'] : 0;
    $questionIds = isset($requestData['questionIds']) ? $requestData['questionIds'] : [];
    $answers     = isset($requestData['answers']) ? $requestData['answers'] : []; // {qid: chosenIdx}

    if ($totalQs <= 0) respond('error', ['message' => 'Invalid session.']);
    $score = $totalQs > 0 ? (int)round(($correctQs / $totalQs) * 100) : 0;

    // Insert the session log
    $stmt = $pdo->prepare(
        "INSERT INTO `practice_sessions`
         (`studentId`,`subject`,`mode`,`totalQs`,`correctQs`,`score`,`timeTakenSec`,`questionIds`,`answerData`)
         VALUES (:sid, :subj, :mode, :t, :c, :sc, :tt, :qi, :ad)"
    );
    $stmt->execute([
        ':sid'  => $currentUser['id'],
        ':subj' => $subject,
        ':mode' => $mode,
        ':t'    => $totalQs,
        ':c'    => $correctQs,
        ':sc'   => $score,
        ':tt'   => $timeTakenSec,
        ':qi'   => is_array($questionIds) ? implode(',', $questionIds) : (string)$questionIds,
        ':ad'   => json_encode($answers)
    ]);
    $sessionId = (int)$pdo->lastInsertId();

    // Update SRS queue for each question
    if (is_array($questionIds) && !empty($questionIds)) {
        // Pull correct answers for these questions
        $ph = implode(',', array_fill(0, count($questionIds), '?'));
        $qs = $pdo->prepare("SELECT `id`, `correctAnswer`, `examId` FROM `questions` WHERE `id` IN ($ph)");
        $qs->execute(array_map('intval', $questionIds));
        $correctMap = [];
        $examMap    = [];
        foreach ($qs->fetchAll(PDO::FETCH_ASSOC) as $qr) {
            $correctMap[(int)$qr['id']] = (int)$qr['correctAnswer'];
            $examMap[(int)$qr['id']]    = (int)$qr['examId'];
        }

        updateSrsQueue($pdo, $currentUser['id'], $questionIds, $answers, $correctMap, $examMap, $subject);
    }

    // Sync subject mastery snapshot
    syncSubjectMastery($pdo, $currentUser['id']);

    respond('success', [
        'sessionId' => $sessionId,
        'score'     => $score,
        'correctQs' => $correctQs,
        'totalQs'   => $totalQs,
        'message'   => "Session saved. Score: $score% ($correctQs / $totalQs)"
    ]);
}

// ============================================================
//  SRS — get due questions
// ============================================================
if ($action === 'study_srs_due') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $limit = isset($requestData['limit']) ? max(1, min(50, (int)$requestData['limit'])) : 10;

    $cols = studyDetectQuestionColumns($pdo);
    $extraSelect = $cols['hasExtras']
        ? ', q.`explanation`, q.`hint1`, q.`hint2`'
        : ', NULL AS `explanation`, NULL AS `hint1`, NULL AS `hint2`';
    $extraSelect .= $cols['hasImage']
        ? ', q.`imageUrl`'
        : ', NULL AS `imageUrl`';

    try {
        $stmt = $pdo->prepare(
            "SELECT q.`id`, q.`question`, q.`option1`, q.`option2`, q.`option3`, q.`option4`,
                    q.`correctAnswer`, q.`points`" . $extraSelect . ",
                    q.`examId`, s.`subject`, s.`box`
             FROM `srs_queue` s
             JOIN `questions` q ON q.`id` = s.`questionId`
             WHERE s.`studentId` = ? AND s.`nextReviewAt` <= NOW()
             ORDER BY s.`box` DESC, s.`wrongCount` DESC
             LIMIT " . (int)$limit
        );
        $stmt->execute([$currentUser['id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        respond('error', ['message' => 'Database error: ' . $e->getMessage()]);
    }

    $questions = array_map(function ($q) {
        return [
            'id'            => (int)$q['id'],
            'examId'        => (int)$q['examId'],
            'question'      => $q['question'],
            'options'       => [$q['option1'], $q['option2'], $q['option3'], $q['option4']],
            'correctAnswer' => (int)$q['correctAnswer'],
            'points'        => (int)$q['points'],
            'explanation'   => $q['explanation'] ?: null,
            'hint1'         => $q['hint1']       ?: null,
            'hint2'         => $q['hint2']       ?: null,
            'imageUrl'      => $q['imageUrl']    ?: null,
            'subject'       => $q['subject'],
            'box'           => (int)$q['box']
        ];
    }, $rows);

    respond('success', [
        'questions' => $questions,
        'count'     => count($questions),
        'mode'      => 'srs'
    ]);
}

// ============================================================
//  SRS — stats
// ============================================================
if ($action === 'study_srs_stats') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $stmt = $pdo->prepare("SELECT `box`, COUNT(*) AS cnt FROM `srs_queue` WHERE `studentId`=? GROUP BY `box` ORDER BY `box`");
    $stmt->execute([$currentUser['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $boxes = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
    foreach ($rows as $r) $boxes[(int)$r['box']] = (int)$r['cnt'];

    $dueCount = $pdo->prepare("SELECT COUNT(*) FROM `srs_queue` WHERE `studentId`=? AND `nextReviewAt` <= NOW()");
    $dueCount->execute([$currentUser['id']]);
    $due = (int)$dueCount->fetchColumn();

    $totalUnique = $pdo->prepare("SELECT COUNT(*) FROM `srs_queue` WHERE `studentId`=?");
    $totalUnique->execute([$currentUser['id']]);
    $total = (int)$totalUnique->fetchColumn();

    respond('success', [
        'boxes' => $boxes,
        'due'   => $due,
        'total' => $total
    ]);
}

// ============================================================
//  SUBJECT MASTERY — radar chart data
// ============================================================
if ($action === 'study_subject_mastery') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    
    syncSubjectMastery($pdo, $currentUser['id']);

    $stmt = $pdo->prepare(
        "SELECT `subject`, `attempts`, `totalCorrect`, `totalQs`, `avgScore`, `lastPracticedAt`
         FROM `subject_mastery` WHERE `studentId`=? ORDER BY `subject`"
    );
    $stmt->execute([$currentUser['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Also list subjects with questions but no mastery yet (so the chart still shows them)
    $allSubjStmt = $pdo->query("SELECT DISTINCT `subject` FROM `exams` WHERE `subject` IS NOT NULL AND `subject` <> '' ORDER BY `subject`");
    $allSubjects = array_column($allSubjStmt->fetchAll(PDO::FETCH_ASSOC), 'subject');

    $mastery = [];
    foreach ($allSubjects as $subj) {
        $found = null;
        foreach ($rows as $r) {
            if ($r['subject'] === $subj) { $found = $r; break; }
        }
        if ($found) {
            $mastery[] = [
                'subject'  => $subj,
                'score'    => (int)$found['avgScore'],
                'attempts' => (int)$found['attempts'],
                'correct'  => (int)$found['totalCorrect'],
                'total'    => (int)$found['totalQs'],
                'lastPracticedAt' => $found['lastPracticedAt']
            ];
        } else {
            $mastery[] = [
                'subject'  => $subj,
                'score'    => 0,
                'attempts' => 0,
                'correct'  => 0,
                'total'    => 0,
                'lastPracticedAt' => null
            ];
        }
    }

    respond('success', ['mastery' => $mastery]);
}

// ============================================================
//  PERFORMANCE HISTORY — last N attempts per subject (line chart)
// ============================================================
if ($action === 'study_performance_history') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $limit = isset($requestData['limit']) ? max(1, min(50, (int)$requestData['limit'])) : 10;

    // Get the latest N practice sessions, ordered oldest → newest
    $stmt = $pdo->prepare(
        "SELECT `id`,`subject`,`mode`,`score`,`totalQs`,`correctQs`,`createdAt`
         FROM `practice_sessions`
         WHERE `studentId` = ?
         ORDER BY `createdAt` DESC
         LIMIT $limit"
    );
    $stmt->execute([$currentUser['id']]);
    $rows = array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC)); // oldest first

    $series = [];
    foreach ($rows as $r) {
        $subj = $r['subject'] ?: 'Mixed';
        if (!isset($series[$subj])) $series[$subj] = [];
        $series[$subj][] = [
            'x' => $r['createdAt'],
            'y' => (int)$r['score']
        ];
    }
    // Also include real exam results from `results` table for the same student
    $res = $pdo->prepare(
        "SELECT r.`score`, r.`completedAt`, e.`subject`
         FROM `results` r JOIN `exams` e ON e.`id` = r.`examId`
         WHERE r.`studentId` = ?
         ORDER BY r.`completedAt` DESC LIMIT $limit"
    );
    $res->execute([$currentUser['id']]);
    foreach (array_reverse($res->fetchAll(PDO::FETCH_ASSOC)) as $r) {
        $subj = $r['subject'] ?: 'Mixed';
        if (!isset($series[$subj])) $series[$subj] = [];
        $series[$subj][] = [
            'x' => $r['completedAt'],
            'y' => (int)$r['score'],
            'isExam' => true
        ];
    }

    respond('success', ['series' => $series]);
}

// ============================================================
//  WEAKNESS REPORT — weakest subjects + recommended questions
// ============================================================
if ($action === 'study_weakness_report') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);

    syncSubjectMastery($pdo, $currentUser['id']);

    $stmt = $pdo->prepare(
        "SELECT `subject`, `attempts`, `totalCorrect`, `totalQs`, `avgScore`, `lastPracticedAt`
         FROM `subject_mastery` WHERE `studentId` = ? ORDER BY `avgScore` ASC"
    );
    $stmt->execute([$currentUser['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $weakSubjects = [];
    foreach ($rows as $r) {
        if ($r['attempts'] > 0 && (int)$r['avgScore'] < 70) {
            $weakSubjects[] = [
                'subject'  => $r['subject'],
                'score'    => (int)$r['avgScore'],
                'attempts' => (int)$r['attempts'],
                'total'    => (int)$r['totalQs']
            ];
        }
    }
    // Take the 5 weakest
    $weakSubjects = array_slice($weakSubjects, 0, 5);

    // For each weak subject, find questions the student has gotten wrong (from SRS wrongCount>0)
    $recommendations = [];
    foreach ($weakSubjects as $ws) {
        $qStmt = $pdo->prepare(
            "SELECT q.`id`, q.`question`, q.`examId`, s.`wrongCount`, s.`box`
             FROM `srs_queue` s
             JOIN `questions` q ON q.`id` = s.`questionId`
             WHERE s.`studentId` = ? AND s.`subject` = ? AND s.`wrongCount` > 0
             ORDER BY s.`wrongCount` DESC, s.`box` ASC
             LIMIT 5"
        );
        $qStmt->execute([$currentUser['id'], $ws['subject']]);
        $recommendations[$ws['subject']] = array_map(function ($q) {
            return [
                'id'         => (int)$q['id'],
                'question'   => mb_substr($q['question'], 0, 100) . (mb_strlen($q['question']) > 100 ? '…' : ''),
                'examId'     => (int)$q['examId'],
                'wrongCount' => (int)$q['wrongCount'],
                'box'        => (int)$q['box']
            ];
        }, $qStmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // Pull a few study resources for the weak subjects
    $resources = [];
    if (!empty($weakSubjects)) {
        $subjList = array_map(fn($w) => $w['subject'], $weakSubjects);
        $ph = implode(',', array_fill(0, count($subjList), '?'));
        $rStmt = $pdo->prepare("SELECT `id`,`subject`,`title`,`url`,`type`,`description` FROM `study_resources` WHERE `subject` IN ($ph) ORDER BY `createdAt` DESC LIMIT 10");
        $rStmt->execute($subjList);
        foreach ($rStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $resources[] = [
                'id'          => (int)$r['id'],
                'subject'     => $r['subject'],
                'title'       => $r['title'],
                'url'         => $r['url'],
                'type'        => $r['type'],
                'description' => $r['description']
            ];
        }
    }

    respond('success', [
        'weakSubjects'     => $weakSubjects,
        'recommendations'  => $recommendations,
        'resources'        => $resources
    ]);
}

// ============================================================
//  STUDY RESOURCES — list, add (with file upload), delete, serve file
// ============================================================
if ($action === 'study_list_resources') {
    $subject = isset($requestData['subject']) ? trim($requestData['subject']) : '';
    $cols    = studyDetectResourceColumns($pdo);
    $extra   = $cols['hasFile'] ? ',`filePath`,`fileSize`,`mimeType`,`category`' : ",NULL AS filePath,NULL AS fileSize,NULL AS mimeType,NULL AS category";
    $sql = "SELECT `id`,`subject`,`title`,`url`,`type`,`description`,`createdAt`" . $extra . " FROM `study_resources`";
    $params = [];
    if ($subject !== '') {
        $sql .= " WHERE `subject` = ?";
        $params[] = $subject;
    }
    $sql .= " ORDER BY `subject` ASC, `createdAt` DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group by subject for the UI
    $grouped = [];
    $categories = [];
    foreach ($rows as $r) {
        if (!isset($grouped[$r['subject']])) $grouped[$r['subject']] = [];
        $grouped[$r['subject']][] = $r;
        if (!empty($r['category']) && !isset($categories[$r['category']])) $categories[$r['category']] = 0;
        if (!empty($r['category'])) $categories[$r['category']]++;
    }
    respond('success', [
        'resources'  => $grouped,
        'subjects'   => array_keys($grouped),
        'categories' => $categories,
        'total'      => count($rows),
        'hasFile'    => $cols['hasFile']
    ]);
}

if ($action === 'study_add_resource') {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Teachers only.']);
    $subject     = isset($_POST['subject'])     ? trim($_POST['subject'])     : (isset($requestData['subject'])     ? trim($requestData['subject'])     : '');
    $title       = isset($_POST['title'])       ? trim($_POST['title'])       : (isset($requestData['title'])       ? trim($requestData['title'])       : '');
    $url         = isset($_POST['url'])         ? trim($_POST['url'])         : (isset($requestData['url'])         ? trim($requestData['url'])         : '');
    $type        = isset($_POST['type'])        ? $_POST['type']              : (isset($requestData['type'])        ? $requestData['type']              : 'link');
    $category    = isset($_POST['category'])    ? trim($_POST['category'])    : (isset($requestData['category'])    ? trim($requestData['category'])    : null);
    $description = isset($_POST['description']) ? trim($_POST['description']) : (isset($requestData['description']) ? trim($requestData['description']) : null);
    if (!in_array($type, ['link','video','pdf','slides','doc','image','archive','other'], true)) $type = 'link';
    if ($category === '') $category = null;

    // Either URL or an uploaded file is required.
    $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK;
    if ($subject === '' || $title === '' ) {
        respond('error', ['message' => 'Subject and title are required.']);
    }
    if (!$hasFile && $url === '') {
        respond('error', ['message' => 'Either a URL or an uploaded file is required.']);
    }
    if (!$hasFile && $url !== '' && !filter_var($url, FILTER_VALIDATE_URL)) {
        respond('error', ['message' => 'Please enter a valid URL.']);
    }

    $filePath = null; $fileSize = null; $mimeType = null;
    if ($hasFile) {
        $cols = studyDetectResourceColumns($pdo);
        if (!$cols['hasFile']) {
            respond('error', ['message' => 'File upload not supported on this DB. Run the v32 migration first.']);
        }
        // Validate size & type
        $maxSize = 25 * 1024 * 1024; // 25 MB
        if ($_FILES['file']['size'] > $maxSize) {
            respond('error', ['message' => 'File too large. Max 25 MB.']);
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $_FILES['file']['tmp_name']);
        finfo_close($finfo);
        $allowedMimes = [
            'application/pdf'                                                  => 'pdf',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'slides',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'doc',
            'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml' => 'image',
            'application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip' => 'archive',
            'video/mp4', 'video/webm', 'video/ogg'                             => 'video',
            'text/plain', 'text/markdown', 'text/csv'                          => 'doc'
        ];
        if (!isset($allowedMimes[$mimeType])) {
            respond('error', ['message' => 'Unsupported file type: ' . $mimeType]);
        }
        // Override type if it's still 'link'
        if ($type === 'link') $type = $allowedMimes[$mimeType];

        // Save file to uploads/study_resources/
        $uploadDir = __DIR__ . '/../uploads/study_resources/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);
        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $_FILES['file']['name']);
        $uniqueName = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '_' . $safeName;
        $destPath = $uploadDir . $uniqueName;
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $destPath)) {
            respond('error', ['message' => 'Failed to save uploaded file. Check folder permissions.']);
        }
        $filePath = 'uploads/study_resources/' . $uniqueName;
        $fileSize = (int)$_FILES['file']['size'];
        // If no URL provided, set URL to the serve-file endpoint
        if ($url === '') {
            $url = 'api.php?action=study_serve_file&id={ID}';
        }
    }

    // Insert
    $stmt = $pdo->prepare(
        "INSERT INTO `study_resources` (`subject`,`title`,`url`,`type`,`description`,`addedBy`,`category`,`filePath`,`fileSize`,`mimeType`)
         VALUES (:subject,:title,:url,:type,:desc,:uid,:cat,:fp,:fs,:mt)"
    );
    $stmt->execute([
        ':subject'     => $subject,
        ':title'       => $title,
        ':url'         => $url,
        ':type'        => $type,
        ':desc'        => $description,
        ':uid'         => $currentUser['id'],
        ':cat'         => $category,
        ':fp'          => $filePath,
        ':fs'          => $fileSize,
        ':mt'          => $mimeType
    ]);
    $newId = (int)$pdo->lastInsertId();
    // If URL was a placeholder, replace with real serve-file URL
    if ($url === 'api.php?action=study_serve_file&id={ID}') {
        $realUrl = 'api.php?action=study_serve_file&id=' . $newId;
        $pdo->prepare("UPDATE `study_resources` SET `url` = ? WHERE `id` = ?")->execute([$realUrl, $newId]);
    }
    respond('success', ['id' => $newId, 'message' => 'Resource added.']);
}

if ($action === 'study_delete_resource') {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Teachers only.']);
    $rid = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    if ($rid <= 0) respond('error', ['message' => 'Invalid resource ID.']);
    // Fetch filePath so we can delete the file from disk too
    $stmt = $pdo->prepare("SELECT `filePath` FROM `study_resources` WHERE `id` = ?");
    $stmt->execute([$rid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && !empty($row['filePath'])) {
        $abs = __DIR__ . '/../' . $row['filePath'];
        if (is_file($abs)) @unlink($abs);
    }
    $pdo->prepare("DELETE FROM `study_resources` WHERE `id` = ?")->execute([$rid]);
    respond('success', ['message' => 'Resource deleted.']);
}

// Serve an uploaded file (PDF / image / etc.) directly to the browser.
// Used by the student-side inline PDF viewer.
if ($action === 'study_serve_file') {
    $rid = isset($_GET['id']) ? (int)$_GET['id'] : (isset($requestData['id']) ? (int)$requestData['id'] : 0);
    if ($rid <= 0) { http_response_code(400); echo 'Invalid resource ID.'; exit; }

    $stmt = $pdo->prepare("SELECT `filePath`,`mimeType`,`title`,`type` FROM `study_resources` WHERE `id` = ?");
    $stmt->execute([$rid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || empty($row['filePath'])) { http_response_code(404); echo 'File not found.'; exit; }

    $abs = __DIR__ . '/../' . $row['filePath'];
    if (!is_file($abs)) { http_response_code(404); echo 'File missing on disk.'; exit; }

    $mime = $row['mimeType'] ?: (mime_content_type($abs) ?: 'application/octet-stream');
    // Override Content-Type so PDFs render inline in browser
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($abs));
    // Force inline display for PDFs/images; attachment for others
    if (strpos($mime, 'pdf') !== false || strpos($mime, 'image/') === 0) {
        header('Content-Disposition: inline; filename="' . basename($abs) . '"');
    } else {
        header('Content-Disposition: attachment; filename="' . basename($abs) . '"');
    }
    header('Cache-Control: private, max-age=0');
    header('X-Content-Type-Options: nosniff');
    readfile($abs);
    exit;
}

// ============================================================
//  QUESTION DISCUSSIONS
// ============================================================
if ($action === 'study_list_discussion') {
    $questionId = isset($requestData['questionId']) ? (int)$requestData['questionId'] : 0;
    if ($questionId <= 0) respond('error', ['message' => 'Invalid question ID.']);

    $stmt = $pdo->prepare(
        "SELECT d.`id`, d.`questionId`, d.`userId`, d.`parent_id`, d.`body`, d.`isPinned`, d.`isHidden`, d.`createdAt`,
                u.`name` AS authorName, u.`avatar` AS authorAvatar, u.`role` AS authorRole
         FROM `question_discussions` d
         JOIN `users` u ON u.`id` = d.`userId`
         WHERE d.`questionId` = ?
         ORDER BY d.`isPinned` DESC, d.`createdAt` ASC"
    );
    $stmt->execute([$questionId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // If student, hide isHidden comments. Teachers see everything.
    if ($currentUser['role'] === 'student') {
        $rows = array_filter($rows, fn($r) => !(int)$r['isHidden']);
    }

    respond('success', [
        'comments'  => array_values($rows),
        'count'     => count($rows)
    ]);
}

if ($action === 'study_add_discussion') {
    $questionId = isset($requestData['questionId']) ? (int)$requestData['questionId'] : 0;
    $parentId   = isset($requestData['parentId']) ? (int)$requestData['parentId'] : null;
    $body       = isset($requestData['body']) ? trim($requestData['body']) : '';
    if ($questionId <= 0 || $body === '') respond('error', ['message' => 'Question ID and body are required.']);
    if (mb_strlen($body) > 2000) respond('error', ['message' => 'Comment too long (max 2000 chars).']);

    $stmt = $pdo->prepare(
        "INSERT INTO `question_discussions` (`questionId`,`userId`,`parent_id`,`body`)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$questionId, $currentUser['id'], $parentId ?: null, $body]);
    respond('success', ['id' => (int)$pdo->lastInsertId(), 'message' => 'Comment posted.']);
}

if ($action === 'study_delete_discussion') {
    $cid = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    if ($cid <= 0) respond('error', ['message' => 'Invalid comment ID.']);
    // Owner can delete own; teacher can delete any
    if ($currentUser['role'] === 'teacher') {
        $pdo->prepare("DELETE FROM `question_discussions` WHERE `id` = ? OR `parent_id` = ?")->execute([$cid, $cid]);
    } else {
        $pdo->prepare("DELETE FROM `question_discussions` WHERE `id` = ? AND `userId` = ?")->execute([$cid, $currentUser['id']]);
    }
    respond('success', ['message' => 'Comment deleted.']);
}

if ($action === 'study_toggle_pin_discussion') {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Teachers only.']);
    $cid = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    if ($cid <= 0) respond('error', ['message' => 'Invalid comment ID.']);
    $pdo->prepare("UPDATE `question_discussions` SET `isPinned` = 1 - `isPinned` WHERE `id` = ?")->execute([$cid]);
    respond('success', ['message' => 'Pin toggled.']);
}

if ($action === 'study_hide_discussion') {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Teachers only.']);
    $cid = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    $hidden = isset($requestData['hidden']) ? (int)(bool)$requestData['hidden'] : 1;
    if ($cid <= 0) respond('error', ['message' => 'Invalid comment ID.']);
    $pdo->prepare("UPDATE `question_discussions` SET `isHidden` = ? WHERE `id` = ?")->execute([$hidden, $cid]);
    respond('success', ['message' => 'Comment visibility updated.']);
}

// ============================================================
//  STUDY SCHEDULE PLANNER
// ============================================================
if ($action === 'study_schedule_get') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $month = isset($requestData['month']) ? trim($requestData['month']) : date('Y-m');
    // month is YYYY-MM; fetch all entries with date LIKE YYYY-MM-%
    $stmt = $pdo->prepare(
        "SELECT `id`,`date`,`subject`,`topic`,`durationMin`,`isCompleted`,`notes`,`createdAt`
         FROM `study_schedule`
         WHERE `studentId` = ? AND `date` LIKE ?
         ORDER BY `date` ASC, `id` ASC"
    );
    $stmt->execute([$currentUser['id'], $month . '%']);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond('success', ['schedule' => $rows, 'month' => $month]);
}

if ($action === 'study_schedule_add') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $date       = isset($requestData['date']) ? trim($requestData['date']) : '';
    $subject    = isset($requestData['subject']) ? trim($requestData['subject']) : '';
    $topic      = isset($requestData['topic']) ? trim($requestData['topic']) : null;
    $durationMin= isset($requestData['durationMin']) ? max(5, (int)$requestData['durationMin']) : 60;
    $notes      = isset($requestData['notes']) ? trim($requestData['notes']) : null;

    if ($date === '' || $subject === '') respond('error', ['message' => 'Date and subject are required.']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) respond('error', ['message' => 'Invalid date format.']);

    $stmt = $pdo->prepare(
        "INSERT INTO `study_schedule` (`studentId`,`date`,`subject`,`topic`,`durationMin`,`notes`)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$currentUser['id'], $date, $subject, $topic, $durationMin, $notes]);
    respond('success', ['id' => (int)$pdo->lastInsertId(), 'message' => 'Study slot added.']);
}

if ($action === 'study_schedule_toggle') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $id = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    if ($id <= 0) respond('error', ['message' => 'Invalid slot ID.']);
    $pdo->prepare("UPDATE `study_schedule` SET `isCompleted` = 1 - `isCompleted` WHERE `id` = ? AND `studentId` = ?")
        ->execute([$id, $currentUser['id']]);
    respond('success', ['message' => 'Toggled.']);
}

if ($action === 'study_schedule_delete') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $id = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    if ($id <= 0) respond('error', ['message' => 'Invalid slot ID.']);
    $pdo->prepare("DELETE FROM `study_schedule` WHERE `id` = ? AND `studentId` = ?")
        ->execute([$id, $currentUser['id']]);
    respond('success', ['message' => 'Slot deleted.']);
}

if ($action === 'study_schedule_update') {
    if ($currentUser['role'] !== 'student') respond('error', ['message' => 'Students only.']);
    $id         = isset($requestData['id']) ? (int)$requestData['id'] : 0;
    $date       = isset($requestData['date']) ? trim($requestData['date']) : '';
    $subject    = isset($requestData['subject']) ? trim($requestData['subject']) : '';
    $topic      = isset($requestData['topic']) ? trim($requestData['topic']) : null;
    $durationMin= isset($requestData['durationMin']) ? max(5, (int)$requestData['durationMin']) : 60;
    $notes      = isset($requestData['notes']) ? trim($requestData['notes']) : null;

    if ($id <= 0 || $date === '' || $subject === '') respond('error', ['message' => 'ID, Date and subject are required.']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) respond('error', ['message' => 'Invalid date format.']);

    $stmt = $pdo->prepare(
        "UPDATE `study_schedule`
         SET `date` = ?, `subject` = ?, `topic` = ?, `durationMin` = ?, `notes` = ?
         WHERE `id` = ? AND `studentId` = ?"
    );
    $stmt->execute([$date, $subject, $topic, $durationMin, $notes, $id, $currentUser['id']]);
    respond('success', ['message' => 'Study slot updated.']);
}

// ============================================================
//  TEACHER ANALYTICS — class-wide subject analytics + student progress
// ============================================================

// Class-wide subject breakdown: for each subject, average score across all
// students' practice sessions + real exam results.
if ($action === 'study_class_analytics') {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Teachers only.']);

    // 1. Average mastery per subject (from subject_mastery, aggregated across all students)
    $subjMastery = [];
    try {
        $stmt = $pdo->query(
            "SELECT `subject`,
                    COUNT(DISTINCT `studentId`) AS studentCount,
                    SUM(`attempts`) AS totalAttempts,
                    SUM(`totalCorrect`) AS totalCorrect,
                    SUM(`totalQs`) AS totalQs,
                    ROUND(AVG(`avgScore`)) AS avgScore
             FROM `subject_mastery`
             GROUP BY `subject`
             ORDER BY `subject`"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $subjMastery[] = [
                'subject'       => $r['subject'],
                'studentCount'  => (int)$r['studentCount'],
                'totalAttempts' => (int)$r['totalAttempts'],
                'totalCorrect'  => (int)$r['totalCorrect'],
                'totalQs'       => (int)$r['totalQs'],
                'avgScore'      => (int)$r['avgScore']
            ];
        }
    } catch (Exception $e) {
        // subject_mastery table may not exist yet — return empty
    }

    // 2. Real exam results aggregated by subject
    $examStats = [];
    $stmt = $pdo->query(
        "SELECT e.`subject`,
                COUNT(r.`id`) AS attemptCount,
                COUNT(DISTINCT r.`studentId`) AS uniqueStudents,
                ROUND(AVG(r.`score`), 1) AS avgScore,
                MAX(r.`score`) AS bestScore,
                MIN(r.`score`) AS worstScore,
                SUM(CASE WHEN r.`score` >= 60 THEN 1 ELSE 0 END) AS passCount
         FROM `exams` e
         LEFT JOIN `results` r ON r.`examId` = e.`id`
         WHERE e.`subject` IS NOT NULL AND e.`subject` <> ''
         GROUP BY e.`subject`
         ORDER BY e.`subject`"
    );
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $examStats[] = [
            'subject'        => $r['subject'],
            'attemptCount'   => (int)$r['attemptCount'],
            'uniqueStudents' => (int)$r['uniqueStudents'],
            'avgScore'       => (float)$r['avgScore'],
            'bestScore'      => (int)$r['bestScore'],
            'worstScore'     => (int)$r['worstScore'],
            'passCount'      => (int)$r['passCount'],
            'passRate'       => $r['attemptCount'] > 0 ? round($r['passCount'] * 100 / $r['attemptCount'], 1) : 0
        ];
    }

    // 3. Top 10 hardest questions (lowest correct rate across all attempts)
    // We approximate using practice_sessions' answerData, but that's expensive.
    // Simpler: use srs_queue wrongCount as a proxy (questions students keep getting wrong).
    $hardest = [];
    try {
        $stmt = $pdo->query(
            "SELECT q.`id`, q.`question`, e.`subject` AS examSubject,
                    SUM(s.`wrongCount`) AS totalWrong,
                    COUNT(DISTINCT s.`studentId`) AS studentsTried
             FROM `srs_queue` s
             JOIN `questions` q ON q.`id` = s.`questionId`
             JOIN `exams` e ON e.`id` = q.`examId`
             WHERE s.`wrongCount` > 0
             GROUP BY q.`id`
             ORDER BY totalWrong DESC, studentsTried DESC
             LIMIT 10"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $hardest[] = [
                'id'            => (int)$r['id'],
                'question'      => mb_substr($r['question'], 0, 120) . (mb_strlen($r['question']) > 120 ? '…' : ''),
                'subject'       => $r['examSubject'],
                'totalWrong'    => (int)$r['totalWrong'],
                'studentsTried' => (int)$r['studentsTried']
            ];
        }
    } catch (Exception $e) { /* table may not exist */ }

    // 4. Summary stats
    $totalStudents = (int)$pdo->query("SELECT COUNT(*) FROM `users` WHERE `role` = 'student'")->fetchColumn();
    $totalExams = (int)$pdo->query("SELECT COUNT(*) FROM `exams`")->fetchColumn();
    $totalAttempts = (int)$pdo->query("SELECT COUNT(*) FROM `results`")->fetchColumn();
    $totalPracticeSessions = 0;
    try {
        $totalPracticeSessions = (int)$pdo->query("SELECT COUNT(*) FROM `practice_sessions`")->fetchColumn();
    } catch (Exception $e) {}

    respond('success', [
        'subjectMastery'    => $subjMastery,
        'examStats'         => $examStats,
        'hardestQuestions'  => $hardest,
        'summary' => [
            'totalStudents'        => $totalStudents,
            'totalExams'           => $totalExams,
            'totalAttempts'        => $totalAttempts,
            'totalPracticeSessions'=> $totalPracticeSessions
        ]
    ]);
}

// Per-student progress: for each student, list subjects practiced + avg score
if ($action === 'study_student_progress') {
    if ($currentUser['role'] !== 'teacher') respond('error', ['message' => 'Teachers only.']);

    $stmt = $pdo->prepare(
        "SELECT u.`id`, u.`name`, u.`email`, u.`userId`,
                COUNT(DISTINCT r.`id`) AS examAttempts,
                ROUND(AVG(r.`score`), 1) AS avgExamScore,
                MAX(r.`completedAt`) AS lastExamAt
         FROM `users` u
         LEFT JOIN `results` r ON r.`studentId` = u.`id`
         WHERE u.`role` = 'student'
         GROUP BY u.`id`
         ORDER BY u.`name` ASC"
    );
    $stmt->execute();
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each student, also fetch their subject mastery
    $out = [];
    foreach ($students as $s) {
        $mastery = [];
        try {
            $ms = $pdo->prepare("SELECT `subject`, `attempts`, `totalCorrect`, `totalQs`, `avgScore`, `lastPracticedAt` FROM `subject_mastery` WHERE `studentId` = ? ORDER BY `avgScore` ASC");
            $ms->execute([$s['id']]);
            foreach ($ms->fetchAll(PDO::FETCH_ASSOC) as $m) {
                $mastery[] = [
                    'subject'  => $m['subject'],
                    'attempts' => (int)$m['attempts'],
                    'avgScore' => (int)$m['avgScore'],
                    'lastPracticedAt' => $m['lastPracticedAt']
                ];
            }
        } catch (Exception $e) {}
        $out[] = [
            'id'            => (int)$s['id'],
            'name'          => $s['name'],
            'email'         => $s['email'],
            'userId'        => $s['userId'],
            'examAttempts'  => (int)$s['examAttempts'],
            'avgExamScore'  => $s['avgExamScore'] !== null ? (float)$s['avgExamScore'] : null,
            'lastExamAt'    => $s['lastExamAt'],
            'mastery'       => $mastery
        ];
    }

    respond('success', ['students' => $out, 'total' => count($out)]);
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
