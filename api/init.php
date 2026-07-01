<?php
// api/init.php - Shared constants and helper functions for FetenaX API
// This file is included by api.php after session verification.

const BADGE_LABELS = [
    'first_pass'    => 'First Pass',
    'perfect_score' => 'Perfect Score',
    'five_exams'    => 'Five Exams Taken',
    'ten_exams'     => 'Ten Exams Taken',
    'streak_3'      => '3-Pass Streak'
];

const BADGE_ICONS = [
    'first_pass'    => '🎯',
    'perfect_score' => '💯',
    'five_exams'    => '⭐',
    'ten_exams'     => '🏆',
    'streak_3'      => '🔥'
];

/**
 * Badge checker — called after every submit_exam.
 * Returns the list of badge types that were newly awarded on this submission.
 *
 * Milestones:
 *   - first_pass    : score >= 60 for the first time
 *   - perfect_score : score == 100
 *   - five_exams    : total attempts >= 5
 *   - ten_exams     : total attempts >= 10
 *   - streak_3      : 3 consecutive passes (most recent 3 attempts all >= 60)
 */
function check_badges($pdo, $studentId, $latestScore, $latestCorrect, $latestTotal) {
    $stmt = $pdo->prepare("SELECT score FROM `results` WHERE `studentId` = ? ORDER BY `completedAt` DESC, `id` DESC");
    $stmt->execute([$studentId]);
    $scores = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $totalAttempts = count($scores);
    $hasPass       = false;
    foreach ($scores as $s) { if ((int)$s >= 60) { $hasPass = true; break; } }
    $hasPerfect    = in_array(100, array_map('intval', $scores), true);

    $streak3 = false;
    if ($totalAttempts >= 3) {
        $last3 = array_slice($scores, 0, 3);
        $streak3 = count(array_filter($last3, fn($s) => (int)$s >= 60)) === 3;
    }

    $candidates = [];
    if ($hasPass)                                 $candidates[] = 'first_pass';
    if ($hasPerfect)                              $candidates[] = 'perfect_score';
    if ($totalAttempts >= 5)                      $candidates[] = 'five_exams';
    if ($totalAttempts >= 10)                     $candidates[] = 'ten_exams';
    if ($streak3)                                 $candidates[] = 'streak_3';

    $newBadges = [];
    if (empty($candidates)) return $newBadges;

    $ins = $pdo->prepare("INSERT IGNORE INTO `badges` (`studentId`,`type`) VALUES (?, ?)");
    foreach ($candidates as $type) {
        $before = $pdo->prepare("SELECT `id` FROM `badges` WHERE `studentId` = ? AND `type` = ?");
        $before->execute([$studentId, $type]);
        $existedBefore = (bool)$before->fetch();
        $ins->execute([$studentId, $type]);
        if (!$existedBefore) {
            $newBadges[] = [
                'type'     => $type,
                'label'    => BADGE_LABELS[$type] ?? $type,
                'icon'     => BADGE_ICONS[$type]  ?? '🏅',
                'earnedAt' => date('Y-m-d H:i:s')
            ];
        }
    }
    return $newBadges;
}

function Math_round_or_ceil($val) {
    return (int)round($val);
}

/**
 * Notify all students when a new exam is created.
 */
function notifyStudentsOfNewExam($pdo, $teacherId, $examId, $examTitle) {
    try {
        $stmt = $pdo->prepare("SELECT `id` FROM `users` WHERE `role` = 'student'");
        $stmt->execute();
        $studentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $insStmt = $pdo->prepare("INSERT INTO `notifications` (`userId`, `type`, `title`, `message`, `link`) VALUES (?, ?, ?, ?, ?)");
        foreach ($studentIds as $sid) {
            $insStmt->execute([
                $sid,
                'new_exam',
                'New Exam Available',
                "A new exam \"{$examTitle}\" is now available to take.",
                'student-exams'
            ]);
        }
    } catch (Exception $e) { /* silent */ }
}

/**
 * Update the SRS queue for a student based on a set of answered questions.
 */
function updateSrsQueue($pdo, $studentId, $questionIds, $answers, $correctMap, $examMap, $subject) {
    if (empty($questionIds)) return;
    $intervals = [1, 3, 7, 14, 30];

    foreach ($questionIds as $qid) {
        $qid = (int)$qid;
        if (!isset($correctMap[$qid])) continue;
        $chosen = isset($answers[$qid]) ? (int)$answers[$qid] : -1;
        $correct = ($chosen === $correctMap[$qid]);

        // Upsert SRS row
        $existing = $pdo->prepare("SELECT `id`,`box`,`correctStreak`,`wrongCount` FROM `srs_queue` WHERE `studentId` = ? AND `questionId` = ?");
        $existing->execute([$studentId, $qid]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $box = (int)$row['box'];
            $streak = (int)$row['correctStreak'];
            $wrong  = (int)$row['wrongCount'];
            if ($correct) {
                $box = min(5, $box + 1);
                $streak += 1;
            } else {
                $box = max(1, $box - 1);
                $streak = 0;
                $wrong += 1;
            }
            $intervalDays = $intervals[$box - 1];
            $next = date('Y-m-d H:i:s', strtotime("+$intervalDays day"));
            $pdo->prepare("UPDATE `srs_queue` SET `box`=?, `correctStreak`=?, `wrongCount`=?, `lastAnsweredAt`=NOW(), `nextReviewAt`=? WHERE `id`=?")
                ->execute([$box, $streak, $wrong, $next, $row['id']]);
        } else {
            $box = $correct ? 2 : 1;
            $intervalDays = $intervals[$box - 1];
            $next = date('Y-m-d H:i:s', strtotime("+$intervalDays day"));
            $pdo->prepare(
                "INSERT INTO `srs_queue` (`studentId`,`questionId`,`examId`,`subject`,`box`,`lastAnsweredAt`,`nextReviewAt`,`correctStreak`,`wrongCount`)
                 VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)"
            )->execute([
                $studentId, $qid, $examMap[$qid] ?? 0, $subject ?: 'Mixed',
                $box, $next,
                $correct ? 1 : 0, $correct ? 0 : 1
            ]);
        }
    }
}

/**
 * Synchronize the subject_mastery denormalized table for a student
 * using both exam results and practice sessions.
 */
function syncSubjectMastery($pdo, $studentId) {
    // 1. Get results from exams/results table
    $stmt1 = $pdo->prepare("
        SELECT e.`subject`, COUNT(r.`id`) AS attempts, SUM(r.`correctAnswers`) AS totalCorrect, SUM(r.`totalQuestions`) AS totalQs, MAX(r.`completedAt`) AS lastAt
        FROM `results` r
        JOIN `exams` e ON r.`examId` = e.`id`
        WHERE r.`studentId` = ? AND e.`subject` IS NOT NULL AND e.`subject` <> ''
        GROUP BY e.`subject`
    ");
    $stmt1->execute([$studentId]);
    $resultsData = $stmt1->fetchAll(PDO::FETCH_ASSOC);

    // 2. Get results from practice_sessions table
    $stmt2 = $pdo->prepare("
        SELECT `subject`, COUNT(`id`) AS attempts, SUM(`correctQs`) AS totalCorrect, SUM(`totalQs`) AS totalQs, MAX(`createdAt`) AS lastAt
        FROM `practice_sessions`
        WHERE `studentId` = ? AND `subject` IS NOT NULL AND `subject` <> ''
        GROUP BY `subject`
    ");
    $stmt2->execute([$studentId]);
    $practiceData = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // 3. Merge stats per subject
    $merged = [];
    foreach ($resultsData as $r) {
        $subj = $r['subject'];
        $merged[$subj] = [
            'attempts' => (int)$r['attempts'],
            'totalCorrect' => (int)$r['totalCorrect'],
            'totalQs' => (int)$r['totalQs'],
            'lastAt' => $r['lastAt']
        ];
    }
    foreach ($practiceData as $p) {
        $subj = $p['subject'];
        if (!isset($merged[$subj])) {
            $merged[$subj] = [
                'attempts' => 0,
                'totalCorrect' => 0,
                'totalQs' => 0,
                'lastAt' => null
            ];
        }
        $merged[$subj]['attempts'] += (int)$p['attempts'];
        $merged[$subj]['totalCorrect'] += (int)$p['totalCorrect'];
        $merged[$subj]['totalQs'] += (int)$p['totalQs'];
        if ($p['lastAt'] && (!$merged[$subj]['lastAt'] || $p['lastAt'] > $merged[$subj]['lastAt'])) {
            $merged[$subj]['lastAt'] = $p['lastAt'];
        }
    }

    // 4. Update the DB table subject_mastery
    $pdo->prepare("DELETE FROM `subject_mastery` WHERE `studentId` = ?")->execute([$studentId]);
    
    $insert = $pdo->prepare("
        INSERT INTO `subject_mastery` (`studentId`, `subject`, `attempts`, `totalCorrect`, `totalQs`, `avgScore`, `lastPracticedAt`)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($merged as $subj => $data) {
        if ($data['totalQs'] > 0) {
            $avgScore = (int)round($data['totalCorrect'] * 100 / $data['totalQs']);
            $insert->execute([
                $studentId,
                $subj,
                $data['attempts'],
                $data['totalCorrect'],
                $data['totalQs'],
                $avgScore,
                $data['lastAt']
            ]);
        }
    }
}

