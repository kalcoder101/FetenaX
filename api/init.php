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
