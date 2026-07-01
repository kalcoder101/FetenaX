-- ============================================================
-- FetenaX v31 — Major feature migration
-- Adds: answer explanations, hints, SRS, study resources,
--       question discussions, study schedule, practice sessions.
-- Run ONCE via phpMyAdmin → SQL tab on top of an existing v30 DB.
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1. Questions table — add explanation + hint columns
-- ------------------------------------------------------------
ALTER TABLE `questions`
    ADD COLUMN IF NOT EXISTS `explanation` TEXT NULL AFTER `acceptedAnswers`,
    ADD COLUMN IF NOT EXISTS `hint1`        TEXT NULL AFTER `explanation`,
    ADD COLUMN IF NOT EXISTS `hint2`        TEXT NULL AFTER `hint1`;

ALTER TABLE `question_bank`
    ADD COLUMN IF NOT EXISTS `explanation` TEXT NULL AFTER `acceptedAnswers`,
    ADD COLUMN IF NOT EXISTS `hint1`        TEXT NULL AFTER `explanation`,
    ADD COLUMN IF NOT EXISTS `hint2`        TEXT NULL AFTER `hint1`;

-- ------------------------------------------------------------
-- 2. Spaced Repetition System (SRS) queue
--    Tracks every (student, question) pair the student has seen,
--    with the next time the question should be shown again.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `srs_queue` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `studentId`       INT NOT NULL,
    `questionId`      INT NOT NULL,
    `examId`          INT NOT NULL,
    `subject`         VARCHAR(255) NOT NULL DEFAULT '',
    `box`             TINYINT NOT NULL DEFAULT 1,           -- Leitner box 1..5
    `lastAnsweredAt`  DATETIME NULL,
    `nextReviewAt`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `correctStreak`   INT NOT NULL DEFAULT 0,
    `wrongCount`      INT NOT NULL DEFAULT 0,
    UNIQUE KEY `uniq_srs_student_q` (`studentId`, `questionId`),
    INDEX `idx_srs_due` (`studentId`, `nextReviewAt`),
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`examId`)     REFERENCES `exams`(`id`)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Practice Sessions — log every practice/mock attempt
--    for per-subject analytics + performance over time.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `practice_sessions` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `studentId`    INT NOT NULL,
    `subject`      VARCHAR(255) NOT NULL DEFAULT '',
    `mode`         VARCHAR(20)  NOT NULL DEFAULT 'practice',  -- practice | mock | subject
    `totalQs`      INT NOT NULL DEFAULT 0,
    `correctQs`    INT NOT NULL DEFAULT 0,
    `score`        INT NOT NULL DEFAULT 0,                    -- percentage
    `timeTakenSec` INT NOT NULL DEFAULT 0,
    `questionIds`  TEXT NULL,                                  -- CSV of question IDs in this session
    `answerData`   TEXT NULL,                                  -- JSON: {qid: chosenIdx}
    `createdAt`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ps_student` (`studentId`),
    INDEX `idx_ps_subject` (`subject`),
    INDEX `idx_ps_created` (`createdAt`),
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Study Resources Library — curated links per subject
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `study_resources` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `subject`    VARCHAR(255) NOT NULL,
    `title`      VARCHAR(255) NOT NULL,
    `url`        VARCHAR(500) NOT NULL,
    `type`       VARCHAR(30)  NOT NULL DEFAULT 'link',   -- link | video | pdf | slides
    `description` TEXT NULL,
    `addedBy`    INT NOT NULL,
    `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sr_subject` (`subject`),
    FOREIGN KEY (`addedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Question Discussion Thread — students discuss, teachers moderate
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `question_discussions` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `questionId` INT NOT NULL,
    `userId`     INT NOT NULL,
    `parent_id`  INT NULL,                                  -- for threaded replies
    `body`       TEXT NOT NULL,
    `isPinned`   TINYINT(1) NOT NULL DEFAULT 0,
    `isHidden`   TINYINT(1) NOT NULL DEFAULT 0,             -- teacher moderation
    `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_qd_question` (`questionId`),
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`userId`)     REFERENCES `users`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Study Schedule Planner — student-planned study sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `study_schedule` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `studentId`  INT NOT NULL,
    `date`       DATE NOT NULL,
    `subject`    VARCHAR(255) NOT NULL,
    `topic`      VARCHAR(255) NULL,
    `durationMin` INT NOT NULL DEFAULT 60,
    `isCompleted` TINYINT(1) NOT NULL DEFAULT 0,
    `notes`      TEXT NULL,
    `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ss_student_date` (`studentId`, `date`),
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Subject mastery snapshot — denormalized for fast dashboards
--    (Computed from practice_sessions + results.)
--    Optional; the API computes on-the-fly too.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subject_mastery` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `studentId`   INT NOT NULL,
    `subject`     VARCHAR(255) NOT NULL,
    `attempts`    INT NOT NULL DEFAULT 0,
    `totalCorrect` INT NOT NULL DEFAULT 0,
    `totalQs`     INT NOT NULL DEFAULT 0,
    `avgScore`    INT NOT NULL DEFAULT 0,
    `lastPracticedAt` DATETIME NULL,
    UNIQUE KEY `uniq_sm_student_subj` (`studentId`, `subject`),
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Done. Verify:
-- DESCRIBE questions;
-- SHOW TABLES;
-- ============================================================
