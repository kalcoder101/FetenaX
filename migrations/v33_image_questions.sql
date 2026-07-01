-- ============================================================
-- FetenaX v33 — Image questions migration
-- Adds `imageUrl` column to `questions` and `question_bank`
-- for questions that include an image (diagrams, screenshots, etc.).
--
-- Idempotent: safe to re-run. Uses a stored proc to check
-- information_schema before ALTER (MySQL/MariaDB compatible).
-- ============================================================

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `_add_col_if_missing_v33`;
DELIMITER $$
CREATE PROCEDURE `_add_col_if_missing_v33`(
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

-- Add imageUrl to questions (used by exam, practice, mock, SRS)
CALL `_add_col_if_missing_v33`('questions',      'imageUrl', 'VARCHAR(500) NULL AFTER `hint2`');
CALL `_add_col_if_missing_v33`('question_bank',  'imageUrl', 'VARCHAR(500) NULL AFTER `hint2`');

DROP PROCEDURE IF EXISTS `_add_col_if_missing_v33`;

-- Done. Verify with:
-- DESCRIBE questions;
