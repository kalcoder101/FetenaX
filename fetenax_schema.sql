-- ============================================================
-- FetenaX Database Schema — Import this file via phpMyAdmin
-- ============================================================
-- Usage: Go to phpMyAdmin → select your database → SQL tab → paste this file → Go
-- Or: Import this file via phpMyAdmin → Import tab

-- Set charset
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Users table
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Exams table
-- ============================================================
CREATE TABLE IF NOT EXISTS `exams` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `duration` INT NOT NULL,
    `totalQuestions` INT NOT NULL,
    `difficulty` VARCHAR(50) NOT NULL,
    `createdBy` INT NOT NULL,
    `createdAt` DATE NOT NULL,
    `passMark` INT NOT NULL DEFAULT 60,
    `shuffleQuestions` TINYINT(1) NOT NULL DEFAULT 0,
    `shuffleOptions` TINYINT(1) NOT NULL DEFAULT 0,
    `showCorrectAnswers` TINYINT(1) NOT NULL DEFAULT 1,
    `allowReReview` TINYINT(1) NOT NULL DEFAULT 0,
    `maxAttempts` INT NOT NULL DEFAULT 1,
    `accessPassword` VARCHAR(255) NULL,
    `accessCodePlain` VARCHAR(100) NULL,
    `availableFrom` DATETIME NULL,
    `availableUntil` DATETIME NULL,
    `category` VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Questions table
-- ============================================================
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `examId` INT NOT NULL,
    `question` TEXT NOT NULL,
    `option1` VARCHAR(255) NOT NULL,
    `option2` VARCHAR(255) NOT NULL,
    `option3` VARCHAR(255) NOT NULL,
    `option4` VARCHAR(255) NOT NULL,
    `correctAnswer` INT NOT NULL,
    `points` INT NOT NULL DEFAULT 1,
    `questionType` VARCHAR(20) NOT NULL DEFAULT 'single',
    `acceptedAnswers` TEXT NULL,
    FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Results table
-- ============================================================
CREATE TABLE IF NOT EXISTS `results` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `examId` INT NOT NULL,
    `studentId` INT NOT NULL,
    `score` INT NOT NULL,
    `correctAnswers` INT NOT NULL,
    `totalQuestions` INT NOT NULL,
    `timeTaken` INT NOT NULL,
    `completedAt` DATETIME NOT NULL,
    `answerData` LONGTEXT NULL,
    `examTitleSnapshot` VARCHAR(255) NULL,
    FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Exam progress table (autosave & flagging)
-- ============================================================
CREATE TABLE IF NOT EXISTS `exam_progress` (
    `studentId` INT NOT NULL,
    `examId` INT NOT NULL,
    `questionId` INT NOT NULL,
    `selectedAnswer` INT DEFAULT NULL,
    `isFlagged` TINYINT(1) DEFAULT 0,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`studentId`, `examId`, `questionId`),
    FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Question Bank table
-- ============================================================
CREATE TABLE IF NOT EXISTS `question_bank` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `createdBy`     INT NOT NULL,
    `question`      TEXT NOT NULL,
    `option1`       VARCHAR(500) NOT NULL,
    `option2`       VARCHAR(500) NOT NULL,
    `option3`       VARCHAR(500) NOT NULL,
    `option4`       VARCHAR(500) NOT NULL,
    `correctAnswer` TINYINT NOT NULL DEFAULT 0,
    `subject`       VARCHAR(200) NOT NULL DEFAULT '',
    `difficulty`    VARCHAR(50)  NOT NULL DEFAULT 'Medium',
    `usageCount`    INT NOT NULL DEFAULT 0,
    `questionType`  VARCHAR(20) NOT NULL DEFAULT 'single',
    `acceptedAnswers` TEXT NULL,
    `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Groups table (Class Groups)
-- ============================================================
CREATE TABLE IF NOT EXISTS `groups` (
    `id`        INT AUTO_INCREMENT PRIMARY KEY,
    `teacherId` INT NOT NULL,
    `name`      VARCHAR(100) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `group_members` (
    `groupId`   INT NOT NULL,
    `studentId` INT NOT NULL,
    PRIMARY KEY (`groupId`, `studentId`),
    FOREIGN KEY (`groupId`)   REFERENCES `groups`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_groups` (
    `examId`  INT NOT NULL,
    `groupId` INT NOT NULL,
    PRIMARY KEY (`examId`, `groupId`),
    FOREIGN KEY (`examId`)  REFERENCES `exams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Badges table
-- ============================================================
CREATE TABLE IF NOT EXISTS `badges` (
    `id`        INT AUTO_INCREMENT PRIMARY KEY,
    `studentId` INT NOT NULL,
    `type`      VARCHAR(50) NOT NULL,
    `earnedAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_student_badge` (`studentId`, `type`),
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id`        INT AUTO_INCREMENT PRIMARY KEY,
    `userId`    INT NOT NULL,
    `type`      VARCHAR(50) NOT NULL,
    `title`     VARCHAR(255) NOT NULL,
    `message`   TEXT NOT NULL,
    `link`      VARCHAR(255) DEFAULT NULL,
    `isRead`    TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_read` (`userId`, `isRead`),
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Exam Templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS `exam_templates` (
    `id`                 INT AUTO_INCREMENT PRIMARY KEY,
    `teacherId`          INT NOT NULL,
    `name`               VARCHAR(255) NOT NULL,
    `subject`            VARCHAR(255) NOT NULL,
    `duration`           INT NOT NULL DEFAULT 30,
    `difficulty`         VARCHAR(50) NOT NULL DEFAULT 'Medium',
    `passMark`           INT NOT NULL DEFAULT 60,
    `shuffleQuestions`   TINYINT(1) NOT NULL DEFAULT 0,
    `shuffleOptions`     TINYINT(1) NOT NULL DEFAULT 0,
    `showCorrectAnswers` TINYINT(1) NOT NULL DEFAULT 1,
    `maxAttempts`        INT NOT NULL DEFAULT 1,
    `category`           VARCHAR(100) DEFAULT NULL,
    `createdAt`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data — Demo Users
-- Passwords: 'password123' for demo accounts, '123456' for master accounts
-- ============================================================
INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES
(1, 'teacher@private.local', '$2b$10$blNUChDE8cyQ9itm9NGQ5OWW3wUCCTWUlIPr9786QppKOLGO2gtDe', 'teacher', 'TeacherX', 'MT', 'MT1234'),
(2, 'student@private.local', '$2b$10$blNUChDE8cyQ9itm9NGQ5OWW3wUCCTWUlIPr9786QppKOLGO2gtDe', 'student', 'StudentX', 'MS', 'MS1234'),
(3, 'student@demo.com', '$2b$10$Wj5R9gowWp2sAL8Np6VXHewC9tS.E7XggYiexHxKXU7pPf9MawMLK', 'student', 'Abdu Student', 'JS', '1'),
(4, 'teacher@demo.com', '$2b$10$Wj5R9gowWp2sAL8Np6VXHewC9tS.E7XggYiexHxKXU7pPf9MawMLK', 'teacher', 'Chala Teacher', 'JT', '2'),
(5, 'alice@demo.com', '$2b$10$Wj5R9gowWp2sAL8Np6VXHewC9tS.E7XggYiexHxKXU7pPf9MawMLK', 'student', 'Abebe Johnson', 'AJ', '3');

-- Note: The password hash above is for 'password123'. For '123456' use:
-- $2y$10$RvL3oQ5q5N3Q5o5o5o5o5OQ5o5o5o5o5o5o5o5o5o5o5o5o5o5o5o5o
-- Generate your own with: php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT);"

SET FOREIGN_KEY_CHECKS = 1;
