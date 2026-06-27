<?php
// db.php - Database connection & seeder for FetenaX

$host = '127.0.0.1';
$port = '3308';
$user = 'root';
$pass = '';
$dbname = 'fetenax_db';

try {
    // 1. Connect without db name first to check/create it
    $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    // Connect to the specific database
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // 2. Create tables if they do not exist
    
    // Users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `email` VARCHAR(255) UNIQUE NOT NULL,
        `password` VARCHAR(255) NOT NULL,
        `role` VARCHAR(50) NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `avatar` VARCHAR(50) NOT NULL,
        `userId` VARCHAR(50) UNIQUE NOT NULL
    ) ENGINE=InnoDB;");

    // Exams table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `exams` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `subject` VARCHAR(255) NOT NULL,
        `duration` INT NOT NULL,
        `totalQuestions` INT NOT NULL,
        `difficulty` VARCHAR(50) NOT NULL,
        `createdBy` INT NOT NULL,
        `createdAt` DATE NOT NULL
    ) ENGINE=InnoDB;");

    // Questions table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `questions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `examId` INT NOT NULL,
        `question` TEXT NOT NULL,
        `option1` VARCHAR(255) NOT NULL,
        `option2` VARCHAR(255) NOT NULL,
        `option3` VARCHAR(255) NOT NULL,
        `option4` VARCHAR(255) NOT NULL,
        `correctAnswer` INT NOT NULL,
        `points` INT NOT NULL DEFAULT 1,
        FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Results table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `results` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `examId` INT NOT NULL,
        `studentId` INT NOT NULL,
        `score` INT NOT NULL,
        `correctAnswers` INT NOT NULL,
        `totalQuestions` INT NOT NULL,
        `timeTaken` INT NOT NULL,
        `completedAt` DATETIME NOT NULL,
        FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Exam progress table for autosave & flagging
    $pdo->exec("CREATE TABLE IF NOT EXISTS `exam_progress` (
        `studentId` INT NOT NULL,
        `examId` INT NOT NULL,
        `questionId` INT NOT NULL,
        `selectedAnswer` INT DEFAULT NULL,
        `isFlagged` TINYINT(1) DEFAULT 0,
        `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`studentId`, `examId`, `questionId`),
        FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Question Bank — reusable question pool per teacher
    $pdo->exec("CREATE TABLE IF NOT EXISTS `question_bank` (
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
        `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Class Groups
    $pdo->exec("CREATE TABLE IF NOT EXISTS `groups` (
        `id`        INT AUTO_INCREMENT PRIMARY KEY,
        `teacherId` INT NOT NULL,
        `name`      VARCHAR(100) NOT NULL,
        `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `group_members` (
        `groupId`   INT NOT NULL,
        `studentId` INT NOT NULL,
        PRIMARY KEY (`groupId`, `studentId`),
        FOREIGN KEY (`groupId`)   REFERENCES `groups`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `exam_groups` (
        `examId`  INT NOT NULL,
        `groupId` INT NOT NULL,
        PRIMARY KEY (`examId`, `groupId`),
        FOREIGN KEY (`examId`)  REFERENCES `exams`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Badges — student achievements earned for hitting milestones
    // Types: first_pass, perfect_score, five_exams, ten_exams, streak_3
    $pdo->exec("CREATE TABLE IF NOT EXISTS `badges` (
        `id`        INT AUTO_INCREMENT PRIMARY KEY,
        `studentId` INT NOT NULL,
        `type`      VARCHAR(50) NOT NULL,
        `earnedAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `uniq_student_badge` (`studentId`, `type`),
        FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Notifications — in-app notifications for students and teachers
    $pdo->exec("CREATE TABLE IF NOT EXISTS `notifications` (
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
    ) ENGINE=InnoDB;");

    // Exam Templates — reusable exam configurations (no questions)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `exam_templates` (
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
    ) ENGINE=InnoDB;");

    // ============================================================
    //  IDEMPOTENT COLUMN ADDITIONS (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
    //  Uses try/catch per statement since MySQL doesn't support IF NOT EXISTS
    //  for ADD COLUMN in all versions.
    // ============================================================
    $alterStatements = [
        // Exams table — scheduling, password, shuffle, options
        "ALTER TABLE `exams` ADD COLUMN `availableFrom` DATETIME NULL",
        "ALTER TABLE `exams` ADD COLUMN `availableUntil` DATETIME NULL",
        "ALTER TABLE `exams` ADD COLUMN `accessPassword` VARCHAR(255) NULL",
        "ALTER TABLE `exams` ADD COLUMN `shuffleQuestions` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `exams` ADD COLUMN `shuffleOptions` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `exams` ADD COLUMN `passMark` INT NOT NULL DEFAULT 60",
        "ALTER TABLE `exams` ADD COLUMN `maxAttempts` INT NOT NULL DEFAULT 1",
        "ALTER TABLE `exams` ADD COLUMN `showCorrectAnswers` TINYINT(1) NOT NULL DEFAULT 1",
        "ALTER TABLE `exams` ADD COLUMN `allowReReview` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `exams` ADD COLUMN `category` VARCHAR(100) NULL",

        // Questions table — question types
        "ALTER TABLE `questions` ADD COLUMN `questionType` VARCHAR(20) NOT NULL DEFAULT 'single'",
        "ALTER TABLE `questions` ADD COLUMN `acceptedAnswers` TEXT NULL",

        // Question bank — question types
        "ALTER TABLE `question_bank` ADD COLUMN `questionType` VARCHAR(20) NOT NULL DEFAULT 'single'",
        "ALTER TABLE `question_bank` ADD COLUMN `acceptedAnswers` TEXT NULL",

        // Results table — store full answer data for past-attempt review
        "ALTER TABLE `results` ADD COLUMN `answerData` LONGTEXT NULL",
        "ALTER TABLE `results` ADD COLUMN `examTitleSnapshot` VARCHAR(255) NULL",

        // Exams — store plain-text access code for teacher reference (alongside the hash)
        "ALTER TABLE `exams` ADD COLUMN `accessCodePlain` VARCHAR(100) NULL",
    ];
    foreach ($alterStatements as $sql) {
        try { $pdo->exec($sql); } catch (PDOException $e) { /* column already exists — ignore */ }
    }

    // 3. Auto-seed default data if users table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM `users`");
    if ($stmt->fetchColumn() == 0) {
        // Seed Users
        // Master Teacher
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([1, 'teacher@private.local', password_hash('123456', PASSWORD_BCRYPT), 'teacher', 'TeacherX', 'MT', 'MT1234']);
        // Master Student
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([2, 'student@private.local', password_hash('123456', PASSWORD_BCRYPT), 'student', 'StudentX', 'MS', 'MS1234']);
        // Demo Student 1
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([3, 'student@demo.com', password_hash('password123', PASSWORD_BCRYPT), 'student', 'Abdu Student', 'JS', '1']);
        // Demo Teacher
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([4, 'teacher@demo.com', password_hash('password123', PASSWORD_BCRYPT), 'teacher', 'Chala Teacher', 'JT', '2']);
        // Demo Student 2
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([5, 'alice@demo.com', password_hash('password123', PASSWORD_BCRYPT), 'student', 'Abebe Johnson', 'AJ', '3']);

        // Seed Exams
        $exams = [
            [
                'id' => 1,
                'title' => 'Java OOP Fundamentals',
                'subject' => 'Java OOP',
                'duration' => 40,
                'totalQuestions' => 20,
                'difficulty' => 'Medium',
                'createdBy' => 4,
                'createdAt' => '2025-06-24'
            ],
            [
                'id' => 2,
                'title' => 'Fundamental Database Concepts',
                'subject' => 'Fundamental Database',
                'duration' => 40,
                'totalQuestions' => 20,
                'difficulty' => 'Medium',
                'createdBy' => 4,
                'createdAt' => '2025-06-24'
            ],
            [
                'id' => 3,
                'title' => 'C++ Programming Basics',
                'subject' => 'C++',
                'duration' => 40,
                'totalQuestions' => 20,
                'difficulty' => 'Medium',
                'createdBy' => 4,
                'createdAt' => '2025-06-24'
            ],
            [
                'id' => 4,
                'title' => 'Computer Organization and Assembly Language',
                'subject' => 'Computer Organization and Assembly Language',
                'duration' => 40,
                'totalQuestions' => 20,
                'difficulty' => 'Medium',
                'createdBy' => 4,
                'createdAt' => '2025-06-24'
            ]
        ];

        foreach ($exams as $e) {
            $pdo->prepare("INSERT INTO `exams` (`id`, `title`, `subject`, `duration`, `totalQuestions`, `difficulty`, `createdBy`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                ->execute([$e['id'], $e['title'], $e['subject'], $e['duration'], $e['totalQuestions'], $e['difficulty'], $e['createdBy'], $e['createdAt']]);
        }

        // Seed Questions
        $questions = [
            // Java OOP
            1 => [
                ['question' => 'What is encapsulation in Java?', 'options' => ['Hiding data implementation', 'Inheritance', 'Polymorphism', 'Abstraction'], 'correct' => 0],
                ['question' => 'Which keyword is used to inherit a class in Java?', 'options' => ['this', 'super', 'extends', 'implements'], 'correct' => 2],
                ['question' => 'What is the default value of an object reference in Java?', 'options' => ['0', 'null', 'undefined', 'false'], 'correct' => 1],
                ['question' => 'Which of the following is not a Java access modifier?', 'options' => ['public', 'private', 'protected', 'package'], 'correct' => 3],
                ['question' => 'What is method overloading?', 'options' => ['Same method name, different parameters', 'Same method name, same parameters', 'Different method name, same parameters', 'None'], 'correct' => 0],
                ['question' => 'Which interface must be implemented by a Java class to support multithreading?', 'options' => ['Runnable', 'Serializable', 'Cloneable', 'Comparable'], 'correct' => 0],
                ['question' => 'What is the parent class of all Java classes?', 'options' => ['Object', 'Class', 'Main', 'Base'], 'correct' => 0],
                ['question' => 'Which keyword is used to prevent inheritance?', 'options' => ['final', 'static', 'const', 'private'], 'correct' => 0],
                ['question' => 'What is polymorphism?', 'options' => ['Many forms', 'Single form', 'No form', 'None'], 'correct' => 0],
                ['question' => 'Which method is called when an object is created?', 'options' => ['constructor', 'finalize', 'main', 'init'], 'correct' => 0],
                ['question' => 'Which of the following is not a feature of Java?', 'options' => ['Platform independent', 'Object-oriented', 'Pointer support', 'Automatic garbage collection'], 'correct' => 2],
                ['question' => 'Which keyword is used to refer to the current object?', 'options' => ['this', 'super', 'self', 'current'], 'correct' => 0],
                ['question' => 'What is abstraction?', 'options' => ['Hiding implementation details', 'Showing all details', 'Inheritance', 'None'], 'correct' => 0],
                ['question' => 'Which of the following is a valid interface declaration?', 'options' => ['interface A {}', 'class A implements interface B {}', 'interface A implements B {}', 'None'], 'correct' => 0],
                ['question' => 'Which method is used to start a thread?', 'options' => ['start()', 'run()', 'init()', 'main()'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of inheritance in Java?', 'options' => ['Single', 'Multiple', 'Multilevel', 'Hierarchical'], 'correct' => 1],
                ['question' => 'Which exception is thrown when a division by zero occurs?', 'options' => ['ArithmeticException', 'NullPointerException', 'IOException', 'ClassNotFoundException'], 'correct' => 0],
                ['question' => 'Which package contains the Scanner class?', 'options' => ['java.util', 'java.io', 'java.lang', 'java.awt'], 'correct' => 0],
                ['question' => 'What is the output of System.out.println(1 + "2" + 3);', 'options' => ['123', '6', '33', '15'], 'correct' => 0],
                ['question' => 'Which of the following is used to handle exceptions?', 'options' => ['try-catch', 'if-else', 'for loop', 'switch'], 'correct' => 0]
            ],
            // Database
            2 => [
                ['question' => 'What does SQL stand for?', 'options' => ['Structured Query Language', 'Simple Query Language', 'Sequential Query Language', 'Standard Query Language'], 'correct' => 0],
                ['question' => 'Which of the following is a primary key?', 'options' => ['Unique identifier', 'Foreign key', 'Duplicate value', 'None'], 'correct' => 0],
                ['question' => 'Which command is used to remove all records from a table?', 'options' => ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'], 'correct' => 2],
                ['question' => 'Which normal form eliminates transitive dependency?', 'options' => ['1NF', '2NF', '3NF', 'BCNF'], 'correct' => 2],
                ['question' => 'Which of the following is not a type of join?', 'options' => ['Inner join', 'Outer join', 'Cross join', 'Side join'], 'correct' => 3],
                ['question' => 'Which SQL clause is used to filter records?', 'options' => ['WHERE', 'ORDER BY', 'GROUP BY', 'HAVING'], 'correct' => 0],
                ['question' => 'Which command is used to add a new row to a table?', 'options' => ['INSERT', 'UPDATE', 'ALTER', 'APPEND'], 'correct' => 0],
                ['question' => 'Which of the following is a DDL command?', 'options' => ['CREATE', 'SELECT', 'INSERT', 'UPDATE'], 'correct' => 0],
                ['question' => 'Which of the following is not a NoSQL database?', 'options' => ['MongoDB', 'MySQL', 'Cassandra', 'Redis'], 'correct' => 1],
                ['question' => 'Which key is used to link two tables?', 'options' => ['Foreign key', 'Primary key', 'Super key', 'Candidate key'], 'correct' => 0],
                ['question' => 'Which command is used to change data in a table?', 'options' => ['UPDATE', 'SELECT', 'ALTER', 'INSERT'], 'correct' => 0],
                ['question' => 'Which of the following is not a constraint in SQL?', 'options' => ['UNIQUE', 'PRIMARY', 'FOREIGN', 'SELECT'], 'correct' => 3],
                ['question' => 'Which of the following is a transaction property?', 'options' => ['ACID', 'BASE', 'CRUD', 'REST'], 'correct' => 0],
                ['question' => 'Which SQL statement is used to extract data from a database?', 'options' => ['SELECT', 'GET', 'EXTRACT', 'OPEN'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid SQL data type?', 'options' => ['VARCHAR', 'INT', 'FLOAT', 'ARRAY'], 'correct' => 3],
                ['question' => 'Which command is used to remove a table from a database?', 'options' => ['DROP', 'DELETE', 'REMOVE', 'TRUNCATE'], 'correct' => 0],
                ['question' => 'Which of the following is a database model?', 'options' => ['Relational', 'Hierarchical', 'Network', 'All of the above'], 'correct' => 3],
                ['question' => 'Which SQL function returns the number of rows?', 'options' => ['COUNT()', 'SUM()', 'AVG()', 'MAX()'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid SQL constraint?', 'options' => ['CHECK', 'DEFAULT', 'INDEX', 'UNIQUE'], 'correct' => 2],
                ['question' => 'Which command is used to modify the structure of a table?', 'options' => ['ALTER', 'UPDATE', 'MODIFY', 'CHANGE'], 'correct' => 0]
            ],
            // C++
            3 => [
                ['question' => 'Which of the following is the correct file extension for C++ source files?', 'options' => ['.cpp', '.c', '.java', '.py'], 'correct' => 0],
                ['question' => 'Which operator is used to access members of a class using a pointer?', 'options' => ['.', '->', '::', ':'], 'correct' => 1],
                ['question' => 'Which of the following is not a C++ data type?', 'options' => ['int', 'float', 'real', 'char'], 'correct' => 2],
                ['question' => 'Which keyword is used to define a constant in C++?', 'options' => ['const', 'constant', 'define', 'static'], 'correct' => 0],
                ['question' => 'Which of the following is used for input in C++?', 'options' => ['cin', 'cout', 'printf', 'scanf'], 'correct' => 0],
                ['question' => 'Which of the following is not a loop structure in C++?', 'options' => ['for', 'while', 'repeat', 'do-while'], 'correct' => 2],
                ['question' => 'Which of the following is used to create an object in C++?', 'options' => ['new', 'malloc', 'alloc', 'create'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid access specifier in C++?', 'options' => ['public', 'private', 'protected', 'internal'], 'correct' => 3],
                ['question' => 'Which of the following is used to define a class in C++?', 'options' => ['class', 'struct', 'object', 'define'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid C++ operator?', 'options' => ['+', '-', '*', '**'], 'correct' => 3],
                ['question' => 'Which of the following is used to terminate a statement in C++?', 'options' => [';', '.', ':', ','], 'correct' => 0],
                ['question' => 'Which of the following is not a valid C++ loop?', 'options' => ['for', 'foreach', 'while', 'do-while'], 'correct' => 1],
                ['question' => 'Which of the following is used to allocate memory dynamically in C++?', 'options' => ['new', 'malloc', 'alloc', 'calloc'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid C++ function?', 'options' => ['main()', 'start()', 'printf()', 'scanf()'], 'correct' => 1],
                ['question' => 'Which of the following is used to print output in C++?', 'options' => ['cout', 'cin', 'printf', 'print'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid C++ keyword?', 'options' => ['int', 'float', 'string', 'real'], 'correct' => 3],
                ['question' => 'Which of the following is used to define a function in C++?', 'options' => ['function', 'def', 'void', 'fun'], 'correct' => 2],
                ['question' => 'Which of the following is not a valid C++ statement?', 'options' => ['break', 'continue', 'exit', 'stop'], 'correct' => 3],
                ['question' => 'Which of the following is used to include a header file in C++?', 'options' => ['#include', 'import', 'require', 'use'], 'correct' => 0],
                ['question' => 'Which of the following is not a valid C++ comment?', 'options' => ['// comment', '/* comment */', '# comment', '-- comment'], 'correct' => 3]
            ],
            // Computer Org / Assembly
            4 => [
                ['question' => 'What is the basic unit of data in a computer?', 'options' => ['Bit', 'Byte', 'Word', 'Nibble'], 'correct' => 0],
                ['question' => 'Which register holds the address of the next instruction?', 'options' => ['Program Counter', 'Accumulator', 'Instruction Register', 'Stack Pointer'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of memory?', 'options' => ['RAM', 'ROM', 'CPU', 'Cache'], 'correct' => 2],
                ['question' => 'Which of the following is a machine language instruction?', 'options' => ['MOV', 'ADD', 'SUB', 'All of the above'], 'correct' => 3],
                ['question' => 'Which of the following is not a type of addressing mode?', 'options' => ['Immediate', 'Direct', 'Indirect', 'Sequential'], 'correct' => 3],
                ['question' => 'Which of the following is used to store data temporarily?', 'options' => ['RAM', 'ROM', 'Hard Disk', 'CD'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of bus?', 'options' => ['Data bus', 'Address bus', 'Control bus', 'Power bus'], 'correct' => 3],
                ['question' => 'Which of the following is used to convert assembly language to machine code?', 'options' => ['Assembler', 'Compiler', 'Interpreter', 'Linker'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of instruction?', 'options' => ['Data transfer', 'Arithmetic', 'Logical', 'Painting'], 'correct' => 3],
                ['question' => 'Which of the following is used to store the result of an operation?', 'options' => ['Accumulator', 'Program Counter', 'Stack Pointer', 'Instruction Register'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of micro-operation?', 'options' => ['Register transfer', 'Arithmetic', 'Logical', 'Painting'], 'correct' => 3],
                ['question' => 'Which of the following is used to store instructions?', 'options' => ['ROM', 'RAM', 'Cache', 'Register'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of instruction format?', 'options' => ['Zero address', 'One address', 'Two address', 'Three address', 'Four address'], 'correct' => 4],
                ['question' => 'Which of the following is used to store the return address?', 'options' => ['Stack', 'Heap', 'Register', 'Accumulator'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of interrupt?', 'options' => ['Hardware', 'Software', 'Manual', 'External'], 'correct' => 2],
                ['question' => 'Which of the following is used to store the status of a process?', 'options' => ['Program Status Word', 'Program Counter', 'Stack Pointer', 'Accumulator'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of assembly language directive?', 'options' => ['ORG', 'END', 'MOV', 'EQU'], 'correct' => 2],
                ['question' => 'Which of the following is used to store the base address?', 'options' => ['Base Register', 'Stack Pointer', 'Accumulator', 'Program Counter'], 'correct' => 0],
                ['question' => 'Which of the following is not a type of memory hierarchy?', 'options' => ['Cache', 'RAM', 'ROM', 'CPU'], 'correct' => 3],
                ['question' => 'Which of the following is used to store the result of a multiplication operation?', 'options' => ['Accumulator', 'Multiplier', 'Product Register', 'Quotient Register'], 'correct' => 2]
            ]
        ];

        foreach ($questions as $examId => $qs) {
            foreach ($qs as $idx => $q) {
                $pdo->prepare("INSERT INTO `questions` (`examId`, `question`, `option1`, `option2`, `option3`, `option4`, `correctAnswer`, `points`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                    ->execute([$examId, $q['question'], $q['options'][0], $q['options'][1], $q['options'][2], $q['options'][3], $q['correct'], 1]);
            }
        }

        // Seed Attempts / Results
        // Results fields: id, examId, studentId, score, correctAnswers, totalQuestions, timeTaken, completedAt
        // studentId = 3 is Abdu Student, studentId = 5 is Abebe Johnson
        $results = [
            [1, 3, 85, 17, 20, 1200, '2024-02-01 10:30:00'], // Java OOP - student 3 (Abdu)
            [2, 5, 75, 15, 20, 900, '2024-02-02 14:15:00'],  // Database - student 5 (Abebe)
            [3, 3, 90, 18, 20, 1100, '2024-02-03 09:00:00'], // C++ - student 3 (Abdu)
            [4, 5, 80, 16, 20, 1300, '2024-02-04 11:45:00'],  // Assembly - student 5 (Abebe)

            // ---- Extra demo attempts so analytics has rich data ----
            // Student 3 (Abdu) retakes with varied scores
            [1, 3, 95, 19, 20, 980,  '2025-03-12 14:20:00'],   // Java OOP — improved
            [2, 3, 70, 14, 20, 1450, '2025-03-18 09:15:00'],   // Database
            [3, 3, 65, 13, 20, 1620, '2025-03-22 16:40:00'],   // C++ — lower
            [4, 3, 80, 16, 20, 1180, '2025-04-02 10:05:00'],   // Assembly
            [1, 3, 100, 20, 20, 760, '2025-04-15 13:30:00'],   // Java OOP — perfect!

            // Student 5 (Abebe) more attempts
            [1, 5, 60, 12, 20, 1740, '2025-03-15 11:00:00'],
            [3, 5, 85, 17, 20, 1080, '2025-03-20 15:25:00'],
            [4, 5, 55, 11, 20, 1850, '2025-04-05 09:50:00'],
            [2, 5, 90, 18, 20, 920,  '2025-04-18 14:00:00'],

            // Student 2 (StudentX) attempts
            [1, 2, 75, 15, 20, 1320, '2025-03-10 10:00:00'],
            [2, 2, 80, 16, 20, 1150, '2025-03-25 13:45:00'],
            [3, 2, 65, 13, 20, 1490, '2025-04-08 11:20:00'],
            [4, 2, 90, 18, 20, 980,  '2025-04-22 16:10:00']
        ];

        foreach ($results as $r) {
            $pdo->prepare("INSERT INTO `results` (`examId`, `studentId`, `score`, `correctAnswers`, `totalQuestions`, `timeTaken`, `completedAt`) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute($r);
        }

        // ---- Extra demo students so the Students table + leaderboard have content ----
        $extraStudents = [
            ['sara@demo.com', 'password123', 'student', 'Sara Ahmed',     'SA', 'STD101'],
            ['mike@demo.com', 'password123', 'student', 'Michael Bekele', 'MB', 'STD102'],
            ['lily@demo.com', 'password123', 'student', 'Lily Tadesse',   'LT', 'STD103'],
            ['josh@demo.com', 'password123', 'student', 'Joshua Girma',   'JG', 'STD104'],
            ['amina@demo.com','password123', 'student', 'Amina Yusuf',    'AY', 'STD105'],
            ['kebede@demo.com','password123','student', 'Kebede Hailu',   'KH', 'STD106'],
            ['martin@demo.com','password123','student', 'Martin Solomon', 'MS', 'STD107'],
            ['hana@demo.com', 'password123', 'student', 'Hana Tesfaye',   'HT', 'STD108']
        ];
        $stuStmt = $pdo->prepare("INSERT INTO `users` (`email`, `password`, `role`, `name`, `avatar`, `userId`) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($extraStudents as $s) {
            $stuStmt->execute([$s[0], password_hash($s[1], PASSWORD_BCRYPT), $s[2], $s[3], $s[4], $s[5]]);
        }

        // Some attempts by the extra students — varied results across all 4 exams
        $extraResults = [
            // Sara (id 6) — high performer
            [1, 6, 95, 19, 20, 880,  '2025-03-14 10:30:00'],
            [2, 6, 90, 18, 20, 920,  '2025-03-28 14:00:00'],
            [3, 6, 85, 17, 20, 1080, '2025-04-10 11:15:00'],
            // Michael (id 7) — average
            [1, 7, 70, 14, 20, 1400, '2025-03-16 09:45:00'],
            [2, 7, 65, 13, 20, 1520, '2025-04-01 13:20:00'],
            [4, 7, 75, 15, 20, 1280, '2025-04-19 10:50:00'],
            // Lily (id 8) — struggling
            [1, 8, 50, 10, 20, 1780, '2025-03-20 11:00:00'],
            [3, 8, 45,  9, 20, 1850, '2025-04-06 14:30:00'],
            [2, 8, 55, 11, 20, 1620, '2025-04-25 09:10:00'],
            // Joshua (id 9) — mixed
            [1, 9, 80, 16, 20, 1100, '2025-03-22 15:45:00'],
            [4, 9, 90, 18, 20, 950,  '2025-04-12 10:30:00'],
            // Amina (id 10) — late starter, improving
            [1, 10, 60, 12, 20, 1500, '2025-04-02 13:00:00'],
            [1, 10, 80, 16, 20, 1150, '2025-04-20 14:15:00'],
            [2, 10, 75, 15, 20, 1240, '2025-04-28 11:40:00'],
            // Kebede (id 11)
            [2, 11, 85, 17, 20, 1020, '2025-03-26 10:15:00'],
            [3, 11, 70, 14, 20, 1380, '2025-04-15 14:55:00'],
            // Martin (id 12)
            [1, 12, 100, 20, 20, 720, '2025-03-29 09:30:00'],
            [4, 12, 95, 19, 20, 850,  '2025-04-18 13:10:00'],
            // Hana (id 13)
            [2, 13, 75, 15, 20, 1180, '2025-04-04 16:20:00'],
            [3, 13, 80, 16, 20, 1090, '2025-04-22 10:00:00']
        ];
        foreach ($extraResults as $r) {
            $pdo->prepare("INSERT INTO `results` (`examId`, `studentId`, `score`, `correctAnswers`, `totalQuestions`, `timeTaken`, `completedAt`) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute($r);
        }

        // ---- Demo Question Bank entries — moved OUTSIDE the main if-block below
        //      so it always runs (idempotently) regardless of whether users table
        //      was empty. The bank is per-teacher, so we seed for every existing
        //      teacher account so any login sees a populated bank.

        // ---- Demo Badges — pre-award some badges to demo students ----
        $demoBadges = [
            // studentId 3 (Abdu) — passed first exam, took 5+ exams, 3-pass streak, perfect score
            [3, 'first_pass',    '2024-02-01 10:35:00'],
            [3, 'five_exams',    '2025-03-22 16:45:00'],
            [3, 'streak_3',      '2025-04-02 10:10:00'],
            [3, 'perfect_score', '2025-04-15 13:35:00'],
            [3, 'ten_exams',     '2025-04-15 13:35:00'],
            // studentId 5 (Abebe)
            [5, 'first_pass',    '2024-02-02 14:20:00'],
            [5, 'five_exams',    '2025-03-20 15:30:00'],
            // studentId 6 (Sara) — high performer
            [6, 'first_pass',    '2025-03-14 10:35:00'],
            [6, 'streak_3',      '2025-04-10 11:20:00'],
            [6, 'perfect_score', '2025-04-10 11:20:00'],
            // studentId 12 (Martin) — got perfect score
            [12, 'first_pass',    '2025-03-29 09:35:00'],
            [12, 'perfect_score', '2025-03-29 09:35:00']
        ];
        $badgeStmt = $pdo->prepare("INSERT IGNORE INTO `badges` (`studentId`, `type`, `earnedAt`) VALUES (?, ?, ?)");
        foreach ($demoBadges as $b) {
            $badgeStmt->execute($b);
        }
    }

    // ============================================================
    //  IDEMPOTENT QUESTION BANK SEEDER
    //  Runs on EVERY request. For each existing teacher account,
    //  if they have 0 questions in the bank, seed all 30 demo
    //  questions owned by them. Uses INSERT IGNORE on (createdBy, question)
    //  via a pre-check so re-running is safe.
    // ============================================================
    try {
        // Find all teacher IDs that exist
        $teacherStmt = $pdo->query("SELECT `id` FROM `users` WHERE `role` = 'teacher'");
        $teacherIds = $teacherStmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($teacherIds)) {
            // Demo questions — full bank across 5 subjects
            $bankQuestions = [
                // Java
                ['Java OOP', 'Easy',   'Which keyword is used to inherit a class in Java?',                  ['this', 'super', 'extends', 'implements'], 2],
                ['Java OOP', 'Easy',   'What is the default value of an object reference in Java?',          ['0', 'null', 'undefined', 'false'], 1],
                ['Java OOP', 'Medium', 'Which of the following is NOT a Java access modifier?',              ['public', 'private', 'protected', 'package'], 3],
                ['Java OOP', 'Medium', 'What is method overloading?',                                       ['Same name, different params', 'Same name, same params', 'Different name, same params', 'None'], 0],
                ['Java OOP', 'Hard',   'Which exception is thrown when dividing an int by zero?',            ['ArithmeticException', 'NullPointerException', 'IOException', 'ClassNotFoundException'], 0],
                ['Java OOP', 'Hard',   'What is the output of: System.out.println(1 + "2" + 3);',           ['123', '6', '33', '15'], 0],

                // Database
                ['Database', 'Easy',   'What does SQL stand for?',                                          ['Structured Query Language', 'Simple Query Language', 'Sequential Query Language', 'Standard Query Language'], 0],
                ['Database', 'Easy',   'Which command removes all records but keeps the table structure?',   ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'], 2],
                ['Database', 'Medium', 'Which normal form eliminates transitive dependency?',                ['1NF', '2NF', '3NF', 'BCNF'], 2],
                ['Database', 'Medium', 'Which SQL clause is used to filter records?',                        ['WHERE', 'ORDER BY', 'GROUP BY', 'HAVING'], 0],
                ['Database', 'Hard',   'Which of the following is NOT a NoSQL database?',                    ['MongoDB', 'MySQL', 'Cassandra', 'Redis'], 1],
                ['Database', 'Hard',   'Which key is used to link two tables?',                              ['Foreign key', 'Primary key', 'Super key', 'Candidate key'], 0],

                // C++
                ['C++', 'Easy',   'What is the correct file extension for C++ source files?',               ['.cpp', '.c', '.java', '.py'], 0],
                ['C++', 'Easy',   'Which operator accesses class members via a pointer?',                   ['.', '->', '::', ':'], 1],
                ['C++', 'Medium', 'Which is NOT a valid C++ access specifier?',                              ['public', 'private', 'protected', 'internal'], 3],
                ['C++', 'Medium', 'Which keyword defines a constant in C++?',                                ['const', 'constant', 'define', 'static'], 0],
                ['C++', 'Hard',   'Which is used to allocate memory dynamically in C++?',                    ['new', 'malloc', 'alloc', 'calloc'], 0],
                ['C++', 'Hard',   'Which is NOT a valid C++ operator?',                                      ['+', '-', '*', '**'], 3],

                // Data Structures
                ['Data Structures', 'Easy',   'Which data structure uses LIFO (Last In First Out)?',         ['Queue', 'Stack', 'Array', 'Linked List'], 1],
                ['Data Structures', 'Easy',   'Which data structure uses FIFO (First In First Out)?',        ['Queue', 'Stack', 'Tree', 'Graph'], 0],
                ['Data Structures', 'Medium', 'What is the time complexity of binary search?',               ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], 1],
                ['Data Structures', 'Medium', 'Which sorting algorithm has the best average time complexity?',['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'], 2],
                ['Data Structures', 'Hard',   'In a balanced BST, what is the time complexity of search?',   ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1],
                ['Data Structures', 'Hard',   'Which data structure is best for implementing a priority queue?',['Array', 'Linked List', 'Heap', 'Stack'], 2],

                // Operating Systems
                ['Operating Systems', 'Easy',   'What is a process?',                                       ['Running program', 'Compiled code', 'A type of memory', 'A file'], 0],
                ['Operating Systems', 'Medium', 'Which scheduling algorithm cannot cause starvation?',       ['FCFS', 'Round Robin', 'SJF', 'Priority'], 0],
                ['Operating Systems', 'Medium', 'What is deadlock?',                                         ['Two processes waiting on each other', 'Process killed by OS', 'Memory overflow', 'CPU too hot'], 0],
                ['Operating Systems', 'Hard',   "Which page replacement algorithm suffers from Belady's anomaly?", ['FIFO', 'LRU', 'Optimal', 'Clock'], 0]
            ];

            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM `question_bank` WHERE `createdBy` = ?");
            $insertStmt = $pdo->prepare(
                "INSERT INTO `question_bank` (`createdBy`,`question`,`option1`,`option2`,`option3`,`option4`,`correctAnswer`,`subject`,`difficulty`)
                 VALUES (?,?,?,?,?,?,?,?,?)"
            );

            foreach ($teacherIds as $tid) {
                // Only seed if this teacher has 0 questions in the bank
                $checkStmt->execute([$tid]);
                if ((int)$checkStmt->fetchColumn() > 0) continue;

                foreach ($bankQuestions as $bq) {
                    $insertStmt->execute([
                        $tid,
                        $bq[2],
                        $bq[3][0], $bq[3][1], $bq[3][2], $bq[3][3],
                        $bq[4],
                        $bq[0],
                        $bq[1]
                    ]);
                }
            }
        }
    } catch (PDOException $bankErr) {
        // Silently ignore bank seeding errors so the rest of the app still works
    }
} catch (PDOException $e) {
    die("Database Connection / Seeding Failed: " . $e->getMessage());
}
?>
