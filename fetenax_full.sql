-- ============================================================================
-- FetenaX – Complete Database Schema & Seed Data
-- ============================================================================
-- Database: fetenax_db
-- Character set: utf8mb4 with utf8mb4_unicode_ci collation
-- Engine: All tables use InnoDB for foreign key support
-- ============================================================================



-- ============================================================================
-- TABLE: users
-- Holds all user accounts (teachers and students).
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`       INT AUTO_INCREMENT PRIMARY KEY,
  `email`    VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role`     VARCHAR(50) NOT NULL,
  `name`     VARCHAR(255) NOT NULL,
  `avatar`   VARCHAR(50) NOT NULL,
  `userId`   VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: exams
-- Holds exam metadata: title, subject, duration, scheduling, access control.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `exams` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `title`            VARCHAR(255) NOT NULL,
  `subject`          VARCHAR(255) NOT NULL,
  `duration`         INT NOT NULL,
  `totalQuestions`   INT NOT NULL,
  `difficulty`       VARCHAR(50) NOT NULL,
  `createdBy`        INT NOT NULL,
  `createdAt`        DATE NOT NULL,
  `availableFrom`    DATETIME NULL,
  `availableUntil`   DATETIME NULL,
  `accessPassword`   VARCHAR(255) NULL,
  `accessCodePlain`  VARCHAR(100) NULL,
  `shuffleQuestions` TINYINT(1) NOT NULL DEFAULT 0,
  `shuffleOptions`   TINYINT(1) NOT NULL DEFAULT 0,
  `passMark`         INT NOT NULL DEFAULT 60,
  `maxAttempts`      INT NOT NULL DEFAULT 1,
  `showCorrectAnswers` TINYINT(1) NOT NULL DEFAULT 1,
  `allowReReview`    TINYINT(1) NOT NULL DEFAULT 0,
  `category`         VARCHAR(100) NULL,
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: questions
-- Exam questions with 4 multiple-choice options.
-- questionType: 'single' (default) or 'multiple'
-- acceptedAnswers: JSON string of accepted answer indices (for multiple-choice)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `questions` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `examId`          INT NOT NULL,
  `question`        TEXT NOT NULL,
  `option1`         VARCHAR(255) NOT NULL,
  `option2`         VARCHAR(255) NOT NULL,
  `option3`         VARCHAR(255) NOT NULL,
  `option4`         VARCHAR(255) NOT NULL,
  `correctAnswer`   INT NOT NULL,
  `points`          INT NOT NULL DEFAULT 1,
  `questionType`    VARCHAR(20) NOT NULL DEFAULT 'single',
  `acceptedAnswers` TEXT NULL,
  FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: results
-- Stores completed exam attempts with scores.
-- answerData: JSON blob with full question-by-question review
-- examTitleSnapshot: Exam title at time of submission (preserves history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `results` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `examId`            INT NOT NULL,
  `studentId`         INT NOT NULL,
  `score`             INT NOT NULL,
  `correctAnswers`    INT NOT NULL,
  `totalQuestions`    INT NOT NULL,
  `timeTaken`         INT NOT NULL,
  `completedAt`       DATETIME NOT NULL,
  `answerData`        LONGTEXT NULL,
  `examTitleSnapshot` VARCHAR(255) NULL,
  FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: exam_progress
-- Auto-saves student progress during an exam (selected answers & flagged Qs).
-- ============================================================================
CREATE TABLE IF NOT EXISTS `exam_progress` (
  `studentId`      INT NOT NULL,
  `examId`         INT NOT NULL,
  `questionId`     INT NOT NULL,
  `selectedAnswer` INT DEFAULT NULL,
  `isFlagged`      TINYINT(1) DEFAULT 0,
  `updatedAt`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`studentId`, `examId`, `questionId`),
  FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: question_bank
-- Reusable question pool per teacher. Supports import into exams.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `question_bank` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `createdBy`       INT NOT NULL,
  `question`        TEXT NOT NULL,
  `option1`         VARCHAR(500) NOT NULL,
  `option2`         VARCHAR(500) NOT NULL,
  `option3`         VARCHAR(500) NOT NULL,
  `option4`         VARCHAR(500) NOT NULL,
  `correctAnswer`   TINYINT NOT NULL DEFAULT 0,
  `subject`         VARCHAR(200) NOT NULL DEFAULT '',
  `difficulty`      VARCHAR(50) NOT NULL DEFAULT 'Medium',
  `usageCount`      INT NOT NULL DEFAULT 0,
  `createdAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `questionType`    VARCHAR(20) NOT NULL DEFAULT 'single',
  `acceptedAnswers` TEXT NULL,
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: groups
-- Class groups created by teachers for organizing students.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `groups` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `name`      VARCHAR(100) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: group_members
-- Many-to-many relationship between groups and students.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `group_members` (
  `groupId`   INT NOT NULL,
  `studentId` INT NOT NULL,
  PRIMARY KEY (`groupId`, `studentId`),
  FOREIGN KEY (`groupId`)   REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: exam_groups
-- Many-to-many relationship between exams and groups.
-- Exams assigned to groups are only visible to group members.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `exam_groups` (
  `examId`  INT NOT NULL,
  `groupId` INT NOT NULL,
  PRIMARY KEY (`examId`, `groupId`),
  FOREIGN KEY (`examId`)  REFERENCES `exams`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: badges
-- Student achievements earned for hitting milestones.
-- Types: first_pass, perfect_score, five_exams, ten_exams, streak_3
-- ============================================================================
CREATE TABLE IF NOT EXISTS `badges` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `type`      VARCHAR(50) NOT NULL,
  `earnedAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_student_badge` (`studentId`, `type`),
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: notifications
-- In-app notifications for students and teachers.
-- ============================================================================
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
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: exam_templates
-- Reusable exam configurations (settings only, no questions).
-- ============================================================================
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
) ENGINE=InnoDB;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- --------------------------------------------------------------------------
-- USERS
-- Passwords are bcrypt hashes. Use hash_password.php to generate new ones.
-- password123  → $2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC
-- 123456       → $2y$12$26qqT3Y0fENs9wjKJI7FqO.t5X8ZvgQoTUS3IMcmSiRI1iTGw.CTG
-- --------------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES
(1,  'teacher@private.local',  '$2y$12$26qqT3Y0fENs9wjKJI7FqO.t5X8ZvgQoTUS3IMcmSiRI1iTGw.CTG', 'teacher', 'TeacherX',       'MT', 'MT1234'),
(2,  'student@private.local',  '$2y$12$26qqT3Y0fENs9wjKJI7FqO.t5X8ZvgQoTUS3IMcmSiRI1iTGw.CTG', 'student', 'StudentX',       'MS', 'MS1234'),
(3,  'student@demo.com',       '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Abdu Student',   'JS', '1'),
(4,  'teacher@demo.com',       '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'teacher', 'Chala Teacher',  'JT', '2'),
(5,  'alice@demo.com',         '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Abebe Johnson',  'AJ', '3'),
(6,  'sara@demo.com',          '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Sara Ahmed',     'SA', 'STD101'),
(7,  'mike@demo.com',          '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Michael Bekele', 'MB', 'STD102'),
(8,  'lily@demo.com',          '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Lily Tadesse',   'LT', 'STD103'),
(9,  'josh@demo.com',          '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Joshua Girma',   'JG', 'STD104'),
(10, 'amina@demo.com',         '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Amina Yusuf',    'AY', 'STD105'),
(11, 'kebede@demo.com',        '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Kebede Hailu',   'KH', 'STD106'),
(12, 'martin@demo.com',        '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Martin Solomon', 'MS', 'STD107'),
(13, 'hana@demo.com',          '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC', 'student', 'Hana Tesfaye',   'HT', 'STD108');

-- --------------------------------------------------------------------------
-- EXAMS
-- --------------------------------------------------------------------------
INSERT INTO `exams` (`id`, `title`, `subject`, `duration`, `totalQuestions`, `difficulty`, `createdBy`, `createdAt`) VALUES
(1, 'Java OOP Fundamentals',                         'Java OOP',                            40, 20, 'Medium', 4, '2025-06-24'),
(2, 'Fundamental Database Concepts',                 'Fundamental Database',                 40, 20, 'Medium', 4, '2025-06-24'),
(3, 'C++ Programming Basics',                        'C++',                                 40, 20, 'Medium', 4, '2025-06-24'),
(4, 'Computer Organization and Assembly Language',   'Computer Organization and Assembly Language', 40, 20, 'Medium', 4, '2025-06-24');

-- --------------------------------------------------------------------------
-- QUESTIONS – Exam 1: Java OOP Fundamentals (20 questions)
-- --------------------------------------------------------------------------
INSERT INTO `questions` (`id`, `examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`) VALUES
(1,  1, 'What is encapsulation in Java?',                                      'Hiding data implementation',  'Inheritance',                'Polymorphism',             'Abstraction',        0, 1),
(2,  1, 'Which keyword is used to inherit a class in Java?',                   'this',                       'super',                      'extends',                  'implements',         2, 1),
(3,  1, 'What is the default value of an object reference in Java?',           '0',                          'null',                       'undefined',                'false',              1, 1),
(4,  1, 'Which of the following is not a Java access modifier?',               'public',                     'private',                    'protected',                'package',            3, 1),
(5,  1, 'What is method overloading?',                                         'Same method name, different parameters', 'Same method name, same parameters', 'Different method name, same parameters', 'None', 0, 1),
(6,  1, 'Which interface must be implemented to support multithreading?',      'Runnable',                   'Serializable',               'Cloneable',                'Comparable',         0, 1),
(7,  1, 'What is the parent class of all Java classes?',                       'Object',                     'Class',                      'Main',                     'Base',               0, 1),
(8,  1, 'Which keyword is used to prevent inheritance?',                       'final',                      'static',                     'const',                    'private',            0, 1),
(9,  1, 'What is polymorphism?',                                               'Many forms',                 'Single form',                'No form',                  'None',               0, 1),
(10, 1, 'Which method is called when an object is created?',                   'constructor',                'finalize',                   'main',                     'init',               0, 1),
(11, 1, 'Which of the following is not a feature of Java?',                    'Platform independent',       'Object-oriented',            'Pointer support',          'Automatic garbage collection', 2, 1),
(12, 1, 'Which keyword is used to refer to the current object?',               'this',                       'super',                      'self',                     'current',            0, 1),
(13, 1, 'What is abstraction?',                                                'Hiding implementation details', 'Showing all details',     'Inheritance',              'None',               0, 1),
(14, 1, 'Which is a valid interface declaration?',                             'interface A {}',             'class A implements interface B {}', 'interface A implements B {}', 'None', 0, 1),
(15, 1, 'Which method is used to start a thread?',                             'start()',                    'run()',                      'init()',                   'main()',             0, 1),
(16, 1, 'Which is not a type of inheritance in Java?',                         'Single',                     'Multiple',                   'Multilevel',               'Hierarchical',       1, 1),
(17, 1, 'Which exception is thrown by division by zero?',                      'ArithmeticException',        'NullPointerException',       'IOException',              'ClassNotFoundException', 0, 1),
(18, 1, 'Which package contains the Scanner class?',                           'java.util',                  'java.io',                    'java.lang',                'java.awt',           0, 1),
(19, 1, 'What is the output of System.out.println(1 + "2" + 3);',              '123',                        '6',                          '33',                       '15',                 0, 1),
(20, 1, 'Which is used to handle exceptions?',                                 'try-catch',                  'if-else',                    'for loop',                 'switch',             0, 1);

-- --------------------------------------------------------------------------
-- QUESTIONS – Exam 2: Fundamental Database Concepts (20 questions)
-- --------------------------------------------------------------------------
INSERT INTO `questions` (`id`, `examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`) VALUES
(21, 2, 'What does SQL stand for?',                                              'Structured Query Language',  'Simple Query Language',  'Sequential Query Language',  'Standard Query Language',  0, 1),
(22, 2, 'Which of the following is a primary key?',                             'Unique identifier',          'Foreign key',            'Duplicate value',             'None',                     0, 1),
(23, 2, 'Which command removes all records from a table?',                      'DELETE',                     'DROP',                   'TRUNCATE',                   'REMOVE',                   2, 1),
(24, 2, 'Which normal form eliminates transitive dependency?',                  '1NF',                        '2NF',                    '3NF',                        'BCNF',                     2, 1),
(25, 2, 'Which is not a type of join?',                                         'Inner join',                 'Outer join',             'Cross join',                 'Side join',                3, 1),
(26, 2, 'Which SQL clause is used to filter records?',                          'WHERE',                      'ORDER BY',               'GROUP BY',                   'HAVING',                   0, 1),
(27, 2, 'Which command adds a new row to a table?',                             'INSERT',                     'UPDATE',                 'ALTER',                      'APPEND',                   0, 1),
(28, 2, 'Which is a DDL command?',                                              'CREATE',                     'SELECT',                 'INSERT',                     'UPDATE',                   0, 1),
(29, 2, 'Which is not a NoSQL database?',                                       'MongoDB',                    'MySQL',                  'Cassandra',                  'Redis',                    1, 1),
(30, 2, 'Which key is used to link two tables?',                                'Foreign key',                'Primary key',            'Super key',                  'Candidate key',            0, 1),
(31, 2, 'Which command changes data in a table?',                               'UPDATE',                     'SELECT',                 'ALTER',                      'INSERT',                   0, 1),
(32, 2, 'Which is not a constraint in SQL?',                                    'UNIQUE',                     'PRIMARY',                'FOREIGN',                    'SELECT',                   3, 1),
(33, 2, 'Which is a transaction property?',                                     'ACID',                       'BASE',                   'CRUD',                       'REST',                     0, 1),
(34, 2, 'Which SQL statement extracts data from a database?',                   'SELECT',                     'GET',                    'EXTRACT',                    'OPEN',                     0, 1),
(35, 2, 'Which is not a valid SQL data type?',                                  'VARCHAR',                    'INT',                    'FLOAT',                      'ARRAY',                    3, 1),
(36, 2, 'Which command removes a table from a database?',                       'DROP',                       'DELETE',                 'REMOVE',                     'TRUNCATE',                 0, 1),
(37, 2, 'Which is a database model?',                                           'Relational',                 'Hierarchical',           'Network',                    'All of the above',         3, 1),
(38, 2, 'Which SQL function returns the number of rows?',                       'COUNT()',                    'SUM()',                  'AVG()',                      'MAX()',                    0, 1),
(39, 2, 'Which is not a valid SQL constraint?',                                 'CHECK',                      'DEFAULT',                'INDEX',                      'UNIQUE',                   2, 1),
(40, 2, 'Which command modifies the structure of a table?',                     'ALTER',                      'UPDATE',                 'MODIFY',                     'CHANGE',                   0, 1);

-- --------------------------------------------------------------------------
-- QUESTIONS – Exam 3: C++ Programming Basics (20 questions)
-- --------------------------------------------------------------------------
INSERT INTO `questions` (`id`, `examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`) VALUES
(41, 3, 'Which is the correct file extension for C++ source files?',            '.cpp',                       '.c',                     '.java',                      '.py',                      0, 1),
(42, 3, 'Which operator accesses class members via a pointer?',                 '.',                          '->',                     '::',                         ':',                        1, 1),
(43, 3, 'Which is not a C++ data type?',                                        'int',                        'float',                  'real',                       'char',                     2, 1),
(44, 3, 'Which keyword defines a constant in C++?',                             'const',                      'constant',               'define',                     'static',                   0, 1),
(45, 3, 'Which is used for input in C++?',                                      'cin',                        'cout',                   'printf',                     'scanf',                    0, 1),
(46, 3, 'Which is not a loop structure in C++?',                                'for',                        'while',                  'repeat',                     'do-while',                 2, 1),
(47, 3, 'Which is used to create an object in C++?',                            'new',                        'malloc',                 'alloc',                      'create',                   0, 1),
(48, 3, 'Which is not a valid access specifier in C++?',                        'public',                     'private',                'protected',                  'internal',                 3, 1),
(49, 3, 'Which is used to define a class in C++?',                              'class',                      'struct',                 'object',                     'define',                   0, 1),
(50, 3, 'Which is not a valid C++ operator?',                                   '+',                          '-',                      '*',                          '**',                       3, 1),
(51, 3, 'Which terminates a statement in C++?',                                 ';',                          '.',                      ':',                          ',',                        0, 1),
(52, 3, 'Which is not a valid C++ loop?',                                       'for',                        'foreach',                'while',                      'do-while',                 1, 1),
(53, 3, 'Which allocates memory dynamically in C++?',                           'new',                        'malloc',                 'alloc',                      'calloc',                   0, 1),
(54, 3, 'Which is not a valid C++ function?',                                   'main()',                     'start()',                'printf()',                   'scanf()',                  1, 1),
(55, 3, 'Which prints output in C++?',                                          'cout',                       'cin',                    'printf',                     'print',                    0, 1),
(56, 3, 'Which is not a valid C++ keyword?',                                    'int',                        'float',                  'string',                     'real',                     3, 1),
(57, 3, 'Which is used to define a function in C++?',                           'function',                   'def',                    'void',                       'fun',                      2, 1),
(58, 3, 'Which is not a valid C++ statement?',                                  'break',                      'continue',               'exit',                       'stop',                     3, 1),
(59, 3, 'Which includes a header file in C++?',                                 '#include',                   'import',                 'require',                    'use',                      0, 1),
(60, 3, 'Which is not a valid C++ comment?',                                    '// comment',                 '/* comment */',           '# comment',                  '-- comment',               3, 1);

-- --------------------------------------------------------------------------
-- QUESTIONS – Exam 4: Computer Organization & Assembly Language (20 questions)
-- --------------------------------------------------------------------------
INSERT INTO `questions` (`id`, `examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`) VALUES
(61, 4, 'What is the basic unit of data in a computer?',                        'Bit',                        'Byte',                   'Word',                       'Nibble',                   0, 1),
(62, 4, 'Which register holds the address of the next instruction?',            'Program Counter',            'Accumulator',            'Instruction Register',       'Stack Pointer',            0, 1),
(63, 4, 'Which is not a type of memory?',                                       'RAM',                        'ROM',                    'CPU',                        'Cache',                    2, 1),
(64, 4, 'Which is a machine language instruction?',                             'MOV',                        'ADD',                    'SUB',                        'All of the above',         3, 1),
(65, 4, 'Which is not a type of addressing mode?',                              'Immediate',                  'Direct',                 'Indirect',                   'Sequential',               3, 1),
(66, 4, 'Which stores data temporarily?',                                       'RAM',                        'ROM',                    'Hard Disk',                  'CD',                       0, 1),
(67, 4, 'Which is not a type of bus?',                                          'Data bus',                   'Address bus',            'Control bus',                'Power bus',                3, 1),
(68, 4, 'Which converts assembly language to machine code?',                    'Assembler',                  'Compiler',               'Interpreter',                'Linker',                   0, 1),
(69, 4, 'Which is not a type of instruction?',                                  'Data transfer',              'Arithmetic',             'Logical',                    'Painting',                 3, 1),
(70, 4, 'Which stores the result of an operation?',                             'Accumulator',                'Program Counter',        'Stack Pointer',              'Instruction Register',     0, 1),
(71, 4, 'Which is not a type of micro-operation?',                              'Register transfer',          'Arithmetic',             'Logical',                    'Painting',                 3, 1),
(72, 4, 'Which is used to store instructions?',                                 'ROM',                        'RAM',                    'Cache',                      'Register',                 0, 1),
(73, 4, 'Which is not a type of instruction format?',                           'Zero address',               'One address',            'Two address',                'Three address',            4, 1),
(74, 4, 'Which stores the return address?',                                     'Stack',                      'Heap',                   'Register',                   'Accumulator',              0, 1),
(75, 4, 'Which is not a type of interrupt?',                                    'Hardware',                   'Software',               'Manual',                     'External',                 2, 1),
(76, 4, 'Which stores the status of a process?',                                'Program Status Word',        'Program Counter',        'Stack Pointer',              'Accumulator',              0, 1),
(77, 4, 'Which is not a type of assembly language directive?',                  'ORG',                        'END',                    'MOV',                        'EQU',                      2, 1),
(78, 4, 'Which stores the base address?',                                       'Base Register',              'Stack Pointer',          'Accumulator',                'Program Counter',          0, 1),
(79, 4, 'Which is not a type of memory hierarchy?',                             'Cache',                      'RAM',                    'ROM',                        'CPU',                      3, 1),
(80, 4, 'Which stores the result of a multiplication operation?',               'Accumulator',                'Multiplier',             'Product Register',           'Quotient Register',        2, 1);

-- --------------------------------------------------------------------------
-- RESULTS – Completed exam attempts
-- Fields: examId, studentId, score, correctAnswers, totalQuestions, timeTaken, completedAt
-- --------------------------------------------------------------------------
INSERT INTO `results` (`examId`, `studentId`, `score`, `correctAnswers`, `totalQuestions`, `timeTaken`, `completedAt`) VALUES
-- Original demo attempts
(1, 3, 85,  17, 20, 1200, '2024-02-01 10:30:00'),
(2, 5, 75,  15, 20, 900,  '2024-02-02 14:15:00'),
(3, 3, 90,  18, 20, 1100, '2024-02-03 09:00:00'),
(4, 5, 80,  16, 20, 1300, '2024-02-04 11:45:00'),
-- Student 3 (Abdu) retakes
(1, 3, 95,  19, 20, 980,  '2025-03-12 14:20:00'),
(2, 3, 70,  14, 20, 1450, '2025-03-18 09:15:00'),
(3, 3, 65,  13, 20, 1620, '2025-03-22 16:40:00'),
(4, 3, 80,  16, 20, 1180, '2025-04-02 10:05:00'),
(1, 3, 100, 20, 20, 760,  '2025-04-15 13:30:00'),
-- Student 5 (Abebe) more attempts
(1, 5, 60,  12, 20, 1740, '2025-03-15 11:00:00'),
(3, 5, 85,  17, 20, 1080, '2025-03-20 15:25:00'),
(4, 5, 55,  11, 20, 1850, '2025-04-05 09:50:00'),
(2, 5, 90,  18, 20, 920,  '2025-04-18 14:00:00'),
-- Student 2 (StudentX) attempts
(1, 2, 75,  15, 20, 1320, '2025-03-10 10:00:00'),
(2, 2, 80,  16, 20, 1150, '2025-03-25 13:45:00'),
(3, 2, 65,  13, 20, 1490, '2025-04-08 11:20:00'),
(4, 2, 90,  18, 20, 980,  '2025-04-22 16:10:00'),
-- Student 6 (Sara) – high performer
(1, 6, 95,  19, 20, 880,  '2025-03-14 10:30:00'),
(2, 6, 90,  18, 20, 920,  '2025-03-28 14:00:00'),
(3, 6, 85,  17, 20, 1080, '2025-04-10 11:15:00'),
-- Student 7 (Michael) – average
(1, 7, 70,  14, 20, 1400, '2025-03-16 09:45:00'),
(2, 7, 65,  13, 20, 1520, '2025-04-01 13:20:00'),
(4, 7, 75,  15, 20, 1280, '2025-04-19 10:50:00'),
-- Student 8 (Lily) – struggling
(1, 8, 50,  10, 20, 1780, '2025-03-20 11:00:00'),
(3, 8, 45,   9, 20, 1850, '2025-04-06 14:30:00'),
(2, 8, 55,  11, 20, 1620, '2025-04-25 09:10:00'),
-- Student 9 (Joshua) – mixed
(1, 9, 80,  16, 20, 1100, '2025-03-22 15:45:00'),
(4, 9, 90,  18, 20, 950,  '2025-04-12 10:30:00'),
-- Student 10 (Amina) – late starter, improving
(1, 10, 60, 12, 20, 1500, '2025-04-02 13:00:00'),
(1, 10, 80, 16, 20, 1150, '2025-04-20 14:15:00'),
(2, 10, 75, 15, 20, 1240, '2025-04-28 11:40:00'),
-- Student 11 (Kebede)
(2, 11, 85, 17, 20, 1020, '2025-03-26 10:15:00'),
(3, 11, 70, 14, 20, 1380, '2025-04-15 14:55:00'),
-- Student 12 (Martin)
(1, 12, 100, 20, 20, 720, '2025-03-29 09:30:00'),
(4, 12, 95,  19, 20, 850, '2025-04-18 13:10:00'),
-- Student 13 (Hana)
(2, 13, 75,  15, 20, 1180, '2025-04-04 16:20:00'),
(3, 13, 80,  16, 20, 1090, '2025-04-22 10:00:00');

-- --------------------------------------------------------------------------
-- BADGES – Student achievements
-- Types: first_pass, perfect_score, five_exams, ten_exams, streak_3
-- --------------------------------------------------------------------------
INSERT INTO `badges` (`studentId`, `type`, `earnedAt`) VALUES
-- Abdu (id 3)
(3,  'first_pass',    '2024-02-01 10:35:00'),
(3,  'five_exams',    '2025-03-22 16:45:00'),
(3,  'streak_3',      '2025-04-02 10:10:00'),
(3,  'perfect_score', '2025-04-15 13:35:00'),
(3,  'ten_exams',     '2025-04-15 13:35:00'),
-- Abebe (id 5)
(5,  'first_pass',    '2024-02-02 14:20:00'),
(5,  'five_exams',    '2025-03-20 15:30:00'),
-- Sara (id 6) – high performer
(6,  'first_pass',    '2025-03-14 10:35:00'),
(6,  'streak_3',      '2025-04-10 11:20:00'),
(6,  'perfect_score', '2025-04-10 11:20:00'),
-- Martin (id 12)
(12, 'first_pass',    '2025-03-29 09:35:00'),
(12, 'perfect_score', '2025-03-29 09:35:00');

-- --------------------------------------------------------------------------
-- QUESTION BANK – Reusable question pool per teacher
-- Subjects: Java OOP, Database, C++, Data Structures, Operating Systems
-- --------------------------------------------------------------------------
INSERT INTO `question_bank` (`createdBy`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `subject`, `difficulty`) VALUES
-- Java OOP (6 questions)
(4, 'Which keyword is used to inherit a class in Java?',                                          'this',       'super',     'extends',     'implements',           2, 'Java OOP', 'Easy'),
(4, 'What is the default value of an object reference in Java?',                                  '0',          'null',      'undefined',   'false',                1, 'Java OOP', 'Easy'),
(4, 'Which of the following is NOT a Java access modifier?',                                      'public',     'private',   'protected',   'package',              3, 'Java OOP', 'Medium'),
(4, 'What is method overloading?',                                                                'Same name, different params', 'Same name, same params', 'Different name, same params', 'None', 0, 'Java OOP', 'Medium'),
(4, 'Which exception is thrown when dividing an int by zero?',                                    'ArithmeticException', 'NullPointerException', 'IOException', 'ClassNotFoundException', 0, 'Java OOP', 'Hard'),
(4, 'What is the output of: System.out.println(1 + "2" + 3);',                                    '123',        '6',         '33',          '15',                   0, 'Java OOP', 'Hard'),
-- Database (6 questions)
(4, 'What does SQL stand for?',                                                                   'Structured Query Language', 'Simple Query Language', 'Sequential Query Language', 'Standard Query Language', 0, 'Database', 'Easy'),
(4, 'Which command removes all records but keeps the table structure?',                            'DELETE',     'DROP',      'TRUNCATE',    'REMOVE',               2, 'Database', 'Easy'),
(4, 'Which normal form eliminates transitive dependency?',                                        '1NF',        '2NF',       '3NF',         'BCNF',                 2, 'Database', 'Medium'),
(4, 'Which SQL clause is used to filter records?',                                                'WHERE',      'ORDER BY',  'GROUP BY',    'HAVING',               0, 'Database', 'Medium'),
(4, 'Which of the following is NOT a NoSQL database?',                                            'MongoDB',    'MySQL',     'Cassandra',   'Redis',                1, 'Database', 'Hard'),
(4, 'Which key is used to link two tables?',                                                      'Foreign key','Primary key','Super key',  'Candidate key',        0, 'Database', 'Hard'),
-- C++ (6 questions)
(4, 'What is the correct file extension for C++ source files?',                                   '.cpp',       '.c',        '.java',       '.py',                  0, 'C++', 'Easy'),
(4, 'Which operator accesses class members via a pointer?',                                       '.',          '->',        '::',          ':',                    1, 'C++', 'Easy'),
(4, 'Which is NOT a valid C++ access specifier?',                                                 'public',     'private',   'protected',   'internal',             3, 'C++', 'Medium'),
(4, 'Which keyword defines a constant in C++?',                                                   'const',      'constant',  'define',      'static',               0, 'C++', 'Medium'),
(4, 'Which is used to allocate memory dynamically in C++?',                                       'new',        'malloc',    'alloc',       'calloc',               0, 'C++', 'Hard'),
(4, 'Which is NOT a valid C++ operator?',                                                         '+',          '-',         '*',           '**',                   3, 'C++', 'Hard'),
-- Data Structures (6 questions)
(4, 'Which data structure uses LIFO (Last In First Out)?',                                        'Queue',      'Stack',     'Array',       'Linked List',          1, 'Data Structures', 'Easy'),
(4, 'Which data structure uses FIFO (First In First Out)?',                                       'Queue',      'Stack',     'Tree',        'Graph',                0, 'Data Structures', 'Easy'),
(4, 'What is the time complexity of binary search?',                                              'O(n)',       'O(log n)',  'O(n²)',       'O(1)',                 1, 'Data Structures', 'Medium'),
(4, 'Which sorting algorithm has the best average time complexity?',                               'Bubble Sort','Insertion Sort', 'Quick Sort', 'Selection Sort',      2, 'Data Structures', 'Medium'),
(4, 'In a balanced BST, what is the time complexity of search?',                                  'O(n)',       'O(log n)',  'O(n log n)',  'O(1)',                 1, 'Data Structures', 'Hard'),
(4, 'Which data structure is best for implementing a priority queue?',                            'Array',      'Linked List','Heap',       'Stack',                2, 'Data Structures', 'Hard'),
-- Operating Systems (4 questions)
(4, 'What is a process?',                                                                         'Running program', 'Compiled code', 'A type of memory', 'A file',           0, 'Operating Systems', 'Easy'),
(4, 'Which scheduling algorithm cannot cause starvation?',                                        'FCFS',       'Round Robin','SJF',        'Priority',             0, 'Operating Systems', 'Medium'),
(4, 'What is deadlock?',                                                                          'Two processes waiting on each other', 'Process killed by OS', 'Memory overflow', 'CPU too hot', 0, 'Operating Systems', 'Medium'),
(4, 'Which page replacement algorithm suffers from Belady''s anomaly?',                            'FIFO',       'LRU',       'Optimal',     'Clock',                0, 'Operating Systems', 'Hard');
