-- ============================================================
-- Migration: Add dedicated `access_codes` table
-- Run this ONCE via phpMyAdmin → SQL tab to add the new table
-- for persisting exam access codes (so codes survive exam edits
-- and can be edited/deleted independently).
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `access_codes` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `examId`     INT NOT NULL UNIQUE,
    `codePlain`  VARCHAR(100) NOT NULL,
    `codeHash`   VARCHAR(255) NOT NULL,
    `createdBy`  INT NOT NULL,
    `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`examId`)    REFERENCES `exams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate any existing codes from the exams.accessCodePlain column
-- into the new access_codes table so they are not lost.
INSERT IGNORE INTO `access_codes` (`examId`, `codePlain`, `codeHash`, `createdBy`, `createdAt`, `updatedAt`)
SELECT
    e.`id`,
    e.`accessCodePlain`,
    e.`accessPassword`,
    e.`createdBy`,
    NOW(),
    NOW()
FROM `exams` e
WHERE e.`accessCodePlain` IS NOT NULL
  AND e.`accessCodePlain` <> ''
  AND NOT EXISTS (SELECT 1 FROM `access_codes` ac WHERE ac.`examId` = e.`id`);

-- Done. Verify with:
-- SELECT examId, codePlain, updatedAt FROM access_codes ORDER BY examId DESC;
