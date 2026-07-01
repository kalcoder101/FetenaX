-- ============================================================
-- FetenaX v31 → v32 — Backend fixes & file upload migration
-- MySQL/MariaDB compatible (no IF NOT EXISTS on ALTER, which
-- is only supported in MySQL 8.0.29+ and MariaDB 10.5+).
--
-- This script is idempotent: re-running it is safe because each
-- ALTER is wrapped in a procedure that checks information_schema
-- first and silently skips if the column already exists.
-- ============================================================

SET NAMES utf8mb4;

-- Drop & recreate a tiny helper proc to add a column only if missing
DROP PROCEDURE IF EXISTS `_add_col_if_missing`;
DELIMITER $$
CREATE PROCEDURE `_add_col_if_missing`(
    IN tbl VARCHAR(64),
    IN col VARCHAR(64),
    IN def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl
          AND COLUMN_NAME = col
    ) THEN
        SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
        PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ------------------------------------------------------------
-- 1. Questions table — add explanation + hint columns
-- ------------------------------------------------------------
CALL `_add_col_if_missing`('questions', 'explanation', 'TEXT NULL AFTER `acceptedAnswers`');
CALL `_add_col_if_missing`('questions', 'hint1',        'TEXT NULL AFTER `explanation`');
CALL `_add_col_if_missing`('questions', 'hint2',        'TEXT NULL AFTER `hint1`');

CALL `_add_col_if_missing`('question_bank', 'explanation', 'TEXT NULL AFTER `acceptedAnswers`');
CALL `_add_col_if_missing`('question_bank', 'hint1',        'TEXT NULL AFTER `explanation`');
CALL `_add_col_if_missing`('question_bank', 'hint2',        'TEXT NULL AFTER `hint1`');

-- ------------------------------------------------------------
-- 2. study_resources — add file_path + file_size + file_type
--    for uploaded PDFs/slides (the v31 table only stored URLs).
-- ------------------------------------------------------------
CALL `_add_col_if_missing`('study_resources', 'filePath', 'VARCHAR(500) NULL AFTER `url`');
CALL `_add_col_if_missing`('study_resources', 'fileSize', 'INT NULL AFTER `filePath`');
CALL `_add_col_if_missing`('study_resources', 'mimeType', 'VARCHAR(100) NULL AFTER `fileSize`');

-- ------------------------------------------------------------
-- 3. Ensure all v31 tables exist (in case v31 migration wasn't run)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `srs_queue` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `studentId`       INT NOT NULL,
    `questionId`      INT NOT NULL,
    `examId`          INT NOT NULL,
    `subject`         VARCHAR(255) NOT NULL DEFAULT '',
    `box`             TINYINT NOT NULL DEFAULT 1,
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

CREATE TABLE IF NOT EXISTS `practice_sessions` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `studentId`    INT NOT NULL,
    `subject`      VARCHAR(255) NOT NULL DEFAULT '',
    `mode`         VARCHAR(20)  NOT NULL DEFAULT 'practice',
    `totalQs`      INT NOT NULL DEFAULT 0,
    `correctQs`    INT NOT NULL DEFAULT 0,
    `score`        INT NOT NULL DEFAULT 0,
    `timeTakenSec` INT NOT NULL DEFAULT 0,
    `questionIds`  TEXT NULL,
    `answerData`   TEXT NULL,
    `createdAt`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ps_student` (`studentId`),
    INDEX `idx_ps_subject` (`subject`),
    INDEX `idx_ps_created` (`createdAt`),
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `study_resources` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `subject`    VARCHAR(255) NOT NULL,
    `title`      VARCHAR(255) NOT NULL,
    `url`        VARCHAR(500) NOT NULL,
    `filePath`   VARCHAR(500) NULL,
    `fileSize`   INT NULL,
    `mimeType`   VARCHAR(100) NULL,
    `type`       VARCHAR(30)  NOT NULL DEFAULT 'link',
    `category`   VARCHAR(100) NULL,
    `description` TEXT NULL,
    `addedBy`    INT NOT NULL,
    `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sr_subject` (`subject`),
    INDEX `idx_sr_category` (`category`),
    FOREIGN KEY (`addedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question_discussions` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `questionId` INT NOT NULL,
    `userId`     INT NOT NULL,
    `parent_id`  INT NULL,
    `body`       TEXT NOT NULL,
    `isPinned`   TINYINT(1) NOT NULL DEFAULT 0,
    `isHidden`   TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_qd_question` (`questionId`),
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`userId`)     REFERENCES `users`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Cleanup
DROP PROCEDURE IF EXISTS `_add_col_if_missing`;

-- ============================================================
-- Done.  Verify with:
--   DESCRIBE questions;
--   DESCRIBE study_resources;
--   SHOW TABLES LIKE 'srs_%';
-- ============================================================
