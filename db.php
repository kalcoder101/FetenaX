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
        `userId` VARCHAR(50) UNIQUE NOT NULL,
        `avatar_color` VARCHAR(20) NOT NULL DEFAULT '#6366f1'
    ) ENGINE=InnoDB;");

    // Add avatar_color column if missing (for existing installs)
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `avatar_color` VARCHAR(20) NOT NULL DEFAULT '#6366f1'");
    } catch (PDOException $e) { /* column already exists */ }

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

    // Question Bank table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `question_bank` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `teacherId` INT NOT NULL,
        `subject` VARCHAR(255) NOT NULL DEFAULT '',
        `question` TEXT NOT NULL,
        `option1` VARCHAR(255) NOT NULL,
        `option2` VARCHAR(255) NOT NULL,
        `option3` VARCHAR(255) NOT NULL,
        `option4` VARCHAR(255) NOT NULL,
        `correctAnswer` INT NOT NULL,
        `points` INT NOT NULL DEFAULT 1,
        `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Badges table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `badges` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `studentId` INT NOT NULL,
        `type` VARCHAR(50) NOT NULL,
        `earnedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_badge` (`studentId`, `type`),
        FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Class Groups table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `groups` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `teacherId` INT NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Group Members table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `group_members` (
        `groupId` INT NOT NULL,
        `studentId` INT NOT NULL,
        PRIMARY KEY (`groupId`, `studentId`),
        FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // Exam Groups table (restrict exam to specific group)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `exam_groups` (
        `examId` INT NOT NULL,
        `groupId` INT NOT NULL,
        PRIMARY KEY (`examId`, `groupId`),
        FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB;");

    // 3. Auto-seed default data if users table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM `users`");
    if ($stmt->fetchColumn() == 0) {
        // Seed Users
        // Master Teacher
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`, `avatar_color`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([1, 'teacher@private.local', password_hash('123456', PASSWORD_BCRYPT), 'teacher', 'TeacherX', 'MT', 'MT1234', '#6366f1']);
        // Master Student
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`, `avatar_color`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([2, 'student@private.local', password_hash('123456', PASSWORD_BCRYPT), 'student', 'StudentX', 'MS', 'MS1234', '#10b981']);
        // Demo Student 1
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`, `avatar_color`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([3, 'student@demo.com', password_hash('password123', PASSWORD_BCRYPT), 'student', 'Abdu Student', 'JS', '1', '#f59e0b']);
        // Demo Teacher
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`, `avatar_color`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([4, 'teacher@demo.com', password_hash('password123', PASSWORD_BCRYPT), 'teacher', 'Chala Teacher', 'JT', '2', '#6366f1']);
        // Demo Student 2
        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `avatar`, `userId`, `avatar_color`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([5, 'alice@demo.com', password_hash('password123', PASSWORD_BCRYPT), 'student', 'Abebe Johnson', 'AJ', '3', '#ec4899']);

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
                ['question' => 'Which of the following is not a type of instruction format?', 'options' => ['Zero address', 'One address', 'Two address', 'Three address'], 'correct' => 3],
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
        $results = [
            [1, 3, 85, 17, 20, 1200, '2024-02-01 10:30:00'], // Java OOP - student 3 (Abdu)
            [2, 5, 75, 15, 20, 900, '2024-02-02 14:15:00'],  // Database - student 5 (Abebe)
            [3, 3, 90, 18, 20, 1100, '2024-02-03 09:00:00'], // C++ - student 3 (Abdu)
            [4, 5, 80, 16, 20, 1300, '2024-02-04 11:45:00']  // Assembly - student 5 (Abebe)
        ];

        foreach ($results as $r) {
            $pdo->prepare("INSERT INTO `results` (`examId`, `studentId`, `score`, `correctAnswers`, `totalQuestions`, `timeTaken`, `completedAt`) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute($r);
        }
    }
} catch (PDOException $e) {
    die("Database Connection / Seeding Failed: " . $e->getMessage());
}
?>
