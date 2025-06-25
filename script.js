// Database simulation for FetenaX
class Database {
    constructor() {
        this.users = [
            {
                id: 1,
                email: 'student@demo.com',
                password: 'password123',
                role: 'student',
                name: 'Abdu Student',
                avatar: 'JS'
            },
            {
                id: 2,
                email: 'teacher@demo.com',
                password: 'password123',
                role: 'teacher',
                name: 'Chala Teacher',
                avatar: 'JT'
            },
            {
                id: 3,
                email: 'alice@demo.com',
                password: 'password123',
                role: 'student',
                name: 'Abebe Johnson',
                avatar: 'AJ'
            }
        ];

        this.exams = [
            {
                id: 1,
                title: 'Java OOP Fundamentals',
                subject: 'Java OOP',
                duration: 40,
                totalQuestions: 20,
                difficulty: 'Medium',
                createdBy: 2,
                createdAt: '2025-06-24',
                questions: [
                    { id: 1, question: 'What is encapsulation in Java?', options: ['Hiding data implementation', 'Inheritance', 'Polymorphism', 'Abstraction'], correctAnswer: 0, points: 1 },
                    { id: 2, question: 'Which keyword is used to inherit a class in Java?', options: ['this', 'super', 'extends', 'implements'], correctAnswer: 2, points: 1 },
                    { id: 3, question: 'What is the default value of an object reference in Java?', options: ['0', 'null', 'undefined', 'false'], correctAnswer: 1, points: 1 },
                    { id: 4, question: 'Which of the following is not a Java access modifier?', options: ['public', 'private', 'protected', 'package'], correctAnswer: 3, points: 1 },
                    { id: 5, question: 'What is method overloading?', options: ['Same method name, different parameters', 'Same method name, same parameters', 'Different method name, same parameters', 'None'], correctAnswer: 0, points: 1 },
                    { id: 6, question: 'Which interface must be implemented by a Java class to support multithreading?', options: ['Runnable', 'Serializable', 'Cloneable', 'Comparable'], correctAnswer: 0, points: 1 },
                    { id: 7, question: 'What is the parent class of all Java classes?', options: ['Object', 'Class', 'Main', 'Base'], correctAnswer: 0, points: 1 },
                    { id: 8, question: 'Which keyword is used to prevent inheritance?', options: ['final', 'static', 'const', 'private'], correctAnswer: 0, points: 1 },
                    { id: 9, question: 'What is polymorphism?', options: ['Many forms', 'Single form', 'No form', 'None'], correctAnswer: 0, points: 1 },
                    { id: 10, question: 'Which method is called when an object is created?', options: ['constructor', 'finalize', 'main', 'init'], correctAnswer: 0, points: 1 },
                    { id: 11, question: 'Which of the following is not a feature of Java?', options: ['Platform independent', 'Object-oriented', 'Pointer support', 'Automatic garbage collection'], correctAnswer: 2, points: 1 },
                    { id: 12, question: 'Which keyword is used to refer to the current object?', options: ['this', 'super', 'self', 'current'], correctAnswer: 0, points: 1 },
                    { id: 13, question: 'What is abstraction?', options: ['Hiding implementation details', 'Showing all details', 'Inheritance', 'None'], correctAnswer: 0, points: 1 },
                    { id: 14, question: 'Which of the following is a valid interface declaration?', options: ['interface A {}', 'class A implements interface B {}', 'interface A implements B {}', 'None'], correctAnswer: 0, points: 1 },
                    { id: 15, question: 'Which method is used to start a thread?', options: ['start()', 'run()', 'init()', 'main()'], correctAnswer: 0, points: 1 },
                    { id: 16, question: 'Which of the following is not a type of inheritance in Java?', options: ['Single', 'Multiple', 'Multilevel', 'Hierarchical'], correctAnswer: 1, points: 1 },
                    { id: 17, question: 'Which exception is thrown when a division by zero occurs?', options: ['ArithmeticException', 'NullPointerException', 'IOException', 'ClassNotFoundException'], correctAnswer: 0, points: 1 },
                    { id: 18, question: 'Which package contains the Scanner class?', options: ['java.util', 'java.io', 'java.lang', 'java.awt'], correctAnswer: 0, points: 1 },
                    { id: 19, question: 'What is the output of System.out.println(1 + "2" + 3);', options: ['123', '6', '33', '15'], correctAnswer: 0, points: 1 },
                    { id: 20, question: 'Which of the following is used to handle exceptions?', options: ['try-catch', 'if-else', 'for loop', 'switch'], correctAnswer: 0, points: 1 }
                ]
            },
            {
                id: 2,
                title: 'Fundamental Database Concepts',
                subject: 'Fundamental Database',
                duration: 40,
                totalQuestions: 20,
                difficulty: 'Medium',
                createdBy: 2,
                createdAt: '2025-06-24',
                questions: [
                    { id: 1, question: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Language', 'Sequential Query Language', 'Standard Query Language'], correctAnswer: 0, points: 1 },
                    { id: 2, question: 'Which of the following is a primary key?', options: ['Unique identifier', 'Foreign key', 'Duplicate value', 'None'], correctAnswer: 0, points: 1 },
                    { id: 3, question: 'Which command is used to remove all records from a table?', options: ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'], correctAnswer: 2, points: 1 },
                    { id: 4, question: 'Which normal form eliminates transitive dependency?', options: ['1NF', '2NF', '3NF', 'BCNF'], correctAnswer: 2, points: 1 },
                    { id: 5, question: 'Which of the following is not a type of join?', options: ['Inner join', 'Outer join', 'Cross join', 'Side join'], correctAnswer: 3, points: 1 },
                    { id: 6, question: 'Which SQL clause is used to filter records?', options: ['WHERE', 'ORDER BY', 'GROUP BY', 'HAVING'], correctAnswer: 0, points: 1 },
                    { id: 7, question: 'Which command is used to add a new row to a table?', options: ['INSERT', 'UPDATE', 'ALTER', 'APPEND'], correctAnswer: 0, points: 1 },
                    { id: 8, question: 'Which of the following is a DDL command?', options: ['CREATE', 'SELECT', 'INSERT', 'UPDATE'], correctAnswer: 0, points: 1 },
                    { id: 9, question: 'Which of the following is not a NoSQL database?', options: ['MongoDB', 'MySQL', 'Cassandra', 'Redis'], correctAnswer: 1, points: 1 },
                    { id: 10, question: 'Which key is used to link two tables?', options: ['Foreign key', 'Primary key', 'Super key', 'Candidate key'], correctAnswer: 0, points: 1 },
                    { id: 11, question: 'Which command is used to change data in a table?', options: ['UPDATE', 'SELECT', 'ALTER', 'INSERT'], correctAnswer: 0, points: 1 },
                    { id: 12, question: 'Which of the following is not a constraint in SQL?', options: ['UNIQUE', 'PRIMARY', 'FOREIGN', 'SELECT'], correctAnswer: 3, points: 1 },
                    { id: 13, question: 'Which of the following is a transaction property?', options: ['ACID', 'BASE', 'CRUD', 'REST'], correctAnswer: 0, points: 1 },
                    { id: 14, question: 'Which SQL statement is used to extract data from a database?', options: ['SELECT', 'GET', 'EXTRACT', 'OPEN'], correctAnswer: 0, points: 1 },
                    { id: 15, question: 'Which of the following is not a valid SQL data type?', options: ['VARCHAR', 'INT', 'FLOAT', 'ARRAY'], correctAnswer: 3, points: 1 },
                    { id: 16, question: 'Which command is used to remove a table from a database?', options: ['DROP', 'DELETE', 'REMOVE', 'TRUNCATE'], correctAnswer: 0, points: 1 },
                    { id: 17, question: 'Which of the following is a database model?', options: ['Relational', 'Hierarchical', 'Network', 'All of the above'], correctAnswer: 3, points: 1 },
                    { id: 18, question: 'Which SQL function returns the number of rows?', options: ['COUNT()', 'SUM()', 'AVG()', 'MAX()'], correctAnswer: 0, points: 1 },
                    { id: 19, question: 'Which of the following is not a valid SQL constraint?', options: ['CHECK', 'DEFAULT', 'INDEX', 'UNIQUE'], correctAnswer: 2, points: 1 },
                    { id: 20, question: 'Which command is used to modify the structure of a table?', options: ['ALTER', 'UPDATE', 'MODIFY', 'CHANGE'], correctAnswer: 0, points: 1 }
                ]
            },
            {
                id: 3,
                title: 'C++ Programming Basics',
                subject: 'C++',
                duration: 40,
                totalQuestions: 20,
                difficulty: 'Medium',
                createdBy: 2,
                createdAt: '2025-06-24',
                questions: [
                    { id: 1, question: 'Which of the following is the correct file extension for C++ source files?', options: ['.cpp', '.c', '.java', '.py'], correctAnswer: 0, points: 1 },
                    { id: 2, question: 'Which operator is used to access members of a class using a pointer?', options: ['.', '->', '::', ':'], correctAnswer: 1, points: 1 },
                    { id: 3, question: 'Which of the following is not a C++ data type?', options: ['int', 'float', 'real', 'char'], correctAnswer: 2, points: 1 },
                    { id: 4, question: 'Which keyword is used to define a constant in C++?', options: ['const', 'constant', 'define', 'static'], correctAnswer: 0, points: 1 },
                    { id: 5, question: 'Which of the following is used for input in C++?', options: ['cin', 'cout', 'printf', 'scanf'], correctAnswer: 0, points: 1 },
                    { id: 6, question: 'Which of the following is not a loop structure in C++?', options: ['for', 'while', 'repeat', 'do-while'], correctAnswer: 2, points: 1 },
                    { id: 7, question: 'Which of the following is used to create an object in C++?', options: ['new', 'malloc', 'alloc', 'create'], correctAnswer: 0, points: 1 },
                    { id: 8, question: 'Which of the following is not a valid access specifier in C++?', options: ['public', 'private', 'protected', 'internal'], correctAnswer: 3, points: 1 },
                    { id: 9, question: 'Which of the following is used to define a class in C++?', options: ['class', 'struct', 'object', 'define'], correctAnswer: 0, points: 1 },
                    { id: 10, question: 'Which of the following is not a valid C++ operator?', options: ['+', '-', '*', '**'], correctAnswer: 3, points: 1 },
                    { id: 11, question: 'Which of the following is used to terminate a statement in C++?', options: [';', '.', ':', ','], correctAnswer: 0, points: 1 },
                    { id: 12, question: 'Which of the following is not a valid C++ loop?', options: ['for', 'foreach', 'while', 'do-while'], correctAnswer: 1, points: 1 },
                    { id: 13, question: 'Which of the following is used to allocate memory dynamically in C++?', options: ['new', 'malloc', 'alloc', 'calloc'], correctAnswer: 0, points: 1 },
                    { id: 14, question: 'Which of the following is not a valid C++ function?', options: ['main()', 'start()', 'printf()', 'scanf()'], correctAnswer: 1, points: 1 },
                    { id: 15, question: 'Which of the following is used to print output in C++?', options: ['cout', 'cin', 'printf', 'print'], correctAnswer: 0, points: 1 },
                    { id: 16, question: 'Which of the following is not a valid C++ keyword?', options: ['int', 'float', 'string', 'real'], correctAnswer: 3, points: 1 },
                    { id: 17, question: 'Which of the following is used to define a function in C++?', options: ['function', 'def', 'void', 'fun'], correctAnswer: 2, points: 1 },
                    { id: 18, question: 'Which of the following is not a valid C++ statement?', options: ['break', 'continue', 'exit', 'stop'], correctAnswer: 3, points: 1 },
                    { id: 19, question: 'Which of the following is used to include a header file in C++?', options: ['#include', 'import', 'require', 'use'], correctAnswer: 0, points: 1 },
                    { id: 20, question: 'Which of the following is not a valid C++ comment?', options: ['// comment', '/* comment */', '# comment', '-- comment'], correctAnswer: 3, points: 1 }
                ]
            },
            {
                id: 4,
                title: 'Computer Organization and Assembly Language',
                subject: 'Computer Organization and Assembly Language',
                duration: 40,
                totalQuestions: 20,
                difficulty: 'Medium',
                createdBy: 2,
                createdAt: '2025-06-24',
                questions: [
                    { id: 1, question: 'What is the basic unit of data in a computer?', options: ['Bit', 'Byte', 'Word', 'Nibble'], correctAnswer: 0, points: 1 },
                    { id: 2, question: 'Which register holds the address of the next instruction?', options: ['Program Counter', 'Accumulator', 'Instruction Register', 'Stack Pointer'], correctAnswer: 0, points: 1 },
                    { id: 3, question: 'Which of the following is not a type of memory?', options: ['RAM', 'ROM', 'CPU', 'Cache'], correctAnswer: 2, points: 1 },
                    { id: 4, question: 'Which of the following is a machine language instruction?', options: ['MOV', 'ADD', 'SUB', 'All of the above'], correctAnswer: 3, points: 1 },
                    { id: 5, question: 'Which of the following is not a type of addressing mode?', options: ['Immediate', 'Direct', 'Indirect', 'Sequential'], correctAnswer: 3, points: 1 },
                    { id: 6, question: 'Which of the following is used to store data temporarily?', options: ['RAM', 'ROM', 'Hard Disk', 'CD'], correctAnswer: 0, points: 1 },
                    { id: 7, question: 'Which of the following is not a type of bus?', options: ['Data bus', 'Address bus', 'Control bus', 'Power bus'], correctAnswer: 3, points: 1 },
                    { id: 8, question: 'Which of the following is used to convert assembly language to machine code?', options: ['Assembler', 'Compiler', 'Interpreter', 'Linker'], correctAnswer: 0, points: 1 },
                    { id: 9, question: 'Which of the following is not a type of instruction?', options: ['Data transfer', 'Arithmetic', 'Logical', 'Painting'], correctAnswer: 3, points: 1 },
                    { id: 10, question: 'Which of the following is used to store the result of an operation?', options: ['Accumulator', 'Program Counter', 'Stack Pointer', 'Instruction Register'], correctAnswer: 0, points: 1 },
                    { id: 11, question: 'Which of the following is not a type of micro-operation?', options: ['Register transfer', 'Arithmetic', 'Logical', 'Painting'], correctAnswer: 3, points: 1 },
                    { id: 12, question: 'Which of the following is used to store instructions?', options: ['ROM', 'RAM', 'Cache', 'Register'], correctAnswer: 0, points: 1 },
                    { id: 13, question: 'Which of the following is not a type of instruction format?', options: ['Zero address', 'One address', 'Two address', 'Three address', 'Four address'], correctAnswer: 4, points: 1 },
                    { id: 14, question: 'Which of the following is used to store the return address?', options: ['Stack', 'Heap', 'Register', 'Accumulator'], correctAnswer: 0, points: 1 },
                    { id: 15, question: 'Which of the following is not a type of interrupt?', options: ['Hardware', 'Software', 'Manual', 'External'], correctAnswer: 2, points: 1 },
                    { id: 16, question: 'Which of the following is used to store the status of a process?', options: ['Program Status Word', 'Program Counter', 'Stack Pointer', 'Accumulator'], correctAnswer: 0, points: 1 },
                    { id: 17, question: 'Which of the following is not a type of assembly language directive?', options: ['ORG', 'END', 'MOV', 'EQU'], correctAnswer: 2, points: 1 },
                    { id: 18, question: 'Which of the following is used to store the base address?', options: ['Base Register', 'Stack Pointer', 'Accumulator', 'Program Counter'], correctAnswer: 0, points: 1 },
                    { id: 19, question: 'Which of the following is not a type of memory hierarchy?', options: ['Cache', 'RAM', 'ROM', 'CPU'], correctAnswer: 3, points: 1 },
                    { id: 20, question: 'Which of the following is used to store the result of a multiplication operation?', options: ['Accumulator', 'Multiplier', 'Product Register', 'Quotient Register'], correctAnswer: 2, points: 1 }
                ]
            }
        ];

        this.results = [
            {
                id: 1,
                examId: 1,
                examTitle: 'Java OOP Fundamentals',
                studentId: 1,
                studentName: 'Abdu Student',
                score: 85,
                correctAnswers: 17,
                totalQuestions: 20,
                timeTaken: 1200, // in seconds
                completedAt: '2024-02-01T10:30:00Z',
                answers: [1, 2, 1, 2, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2] // user's selected answers
            },
            {
                id: 2,
                examId: 2,
                examTitle: 'Fundamental Database Concepts',
                studentId: 3,
                studentName: 'Abebe Johnson',
                score: 75,
                correctAnswers: 15,
                totalQuestions: 20,
                timeTaken: 900,
                completedAt: '2024-02-02T14:15:00Z',
                answers: [0, 1, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1]
            },
            {
                id: 3,
                examId: 3,
                examTitle: 'C++ Programming Basics',
                studentId: 1,
                studentName: 'Abdu Student',
                score: 90,
                correctAnswers: 18,
                totalQuestions: 20,
                timeTaken: 1100,
                completedAt: '2024-02-03T09:00:00Z',
                answers: [0, 1, 2, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 2, 0, 1, 2]
            },
            {
                id: 4,
                examId: 4,
                examTitle: 'Computer Organization and Assembly Language',
                studentId: 3,
                studentName: 'Abebe Johnson',
                score: 80,
                correctAnswers: 16,
                totalQuestions: 20,
                timeTaken: 1300,
                completedAt: '2024-02-04T11:45:00Z',
                answers: [0, 1, 2, 3, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0]
            }
        ];

        this.categories = [
            { id: 1, name: 'Mathematics', color: '#3B82F6' },
            { id: 2, name: 'Science', color: '#10B981' },
            { id: 3, name: 'English', color: '#8B5CF6' },
            { id: 4, name: 'History', color: '#F59E0B' },
            { id: 5, name: 'Geography', color: '#EF4444' }
        ];
    }

    // User management methods
    authenticate(email, password) {
        return this.users.find(user => 
            user.email === email && user.password === password
        );
    }

    getUserById(id) {
        return this.users.find(user => user.id === id);
    }

    addUser(userData) {
        const newUser = {
            id: this.users.length + 1,
            ...userData,
            avatar: this.generateAvatar(userData.name)
        };
        this.users.push(newUser);
        return newUser;
    }

    generateAvatar(name) {
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // Exam management methods
    getAllExams() {
        return this.exams;
    }

    getExamById(id) {
        return this.exams.find(exam => exam.id === id);
    }

    addExam(examData) {
        const newExam = {
            id: this.exams.length + 1,
            ...examData,
            createdAt: new Date().toISOString().split('T')[0],
            totalQuestions: examData.questions.length
        };
        this.exams.push(newExam);
        return newExam;
    }

    updateExam(id, examData) {
        const index = this.exams.findIndex(exam => exam.id === id);
        if (index !== -1) {
            this.exams[index] = { ...this.exams[index], ...examData };
            return this.exams[index];
        }
        return null;
    }

    deleteExam(id) {
        const index = this.exams.findIndex(exam => exam.id === id);
        if (index !== -1) {
            return this.exams.splice(index, 1)[0];
        }
        return null;
    }

    getExamsByTeacher(teacherId) {
        return this.exams.filter(exam => exam.createdBy === teacherId);
    }

    // Results management methods
    addResult(resultData) {
        const newResult = {
            id: this.results.length + 1,
            ...resultData,
            completedAt: new Date().toISOString()
        };
        this.results.push(newResult);
        return newResult;
    }

    getResultsByStudent(studentId) {
        return this.results.filter(result => result.studentId === studentId);
    }

    getResultsByExam(examId) {
        return this.results.filter(result => result.examId === examId);
    }

    getAllResults() {
        return this.results;
    }

    getRecentResults(limit = 10) {
        return this.results
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
            .slice(0, limit);
    }

    // Statistics methods
    getExamStatistics(examId) {
        const results = this.getResultsByExam(examId);
        
        if (results.length === 0) {
            return {
                totalAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                passRate: 0
            };
        }

        const scores = results.map(result => result.score);
        const passedCount = scores.filter(score => score >= 60).length;

        return {
            totalAttempts: results.length,
            averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            passRate: Math.round((passedCount / results.length) * 100)
        };
    }

    getStudentStatistics(studentId) {
        const results = this.getResultsByStudent(studentId);
        
        if (results.length === 0) {
            return {
                totalExamsTaken: 0,
                averageScore: 0,
                bestScore: 0,
                totalTimeSpent: 0
            };
        }

        const scores = results.map(result => result.score);
        const totalTime = results.reduce((sum, result) => sum + result.timeTaken, 0);

        return {
            totalExamsTaken: results.length,
            averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
            bestScore: Math.max(...scores),
            totalTimeSpent: totalTime
        };
    }

    getOverallStatistics() {
        return {
            totalUsers: this.users.length,
            totalStudents: this.users.filter(user => user.role === 'student').length,
            totalTeachers: this.users.filter(user => user.role === 'teacher').length,
            totalExams: this.exams.length,
            totalResults: this.results.length,
            averageScore: this.results.length > 0 
                ? Math.round(this.results.reduce((sum, result) => sum + result.score, 0) / this.results.length)
                : 0
        };
    }

    // Utility methods
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    calculateScore(correctAnswers, totalQuestions) {
        return Math.round((correctAnswers / totalQuestions) * 100);
    }

    getGradeFromScore(score) {
        if (score >= 90) return { grade: 'A+', color: '#10B981' };
        if (score >= 80) return { grade: 'A', color: '#059669' };
        if (score >= 70) return { grade: 'B', color: '#3B82F6' };
        if (score >= 60) return { grade: 'C', color: '#F59E0B' };
        if (score >= 50) return { grade: 'D', color: '#EF4444' };
        return { grade: 'F', color: '#DC2626' };
    }

    // Search and filter methods
    searchExams(query, subject = null, difficulty = null) {
        let filteredExams = this.exams;

        if (query) {
            filteredExams = filteredExams.filter(exam =>
                exam.title.toLowerCase().includes(query.toLowerCase()) ||
                exam.subject.toLowerCase().includes(query.toLowerCase())
            );
        }

        if (subject) {
            filteredExams = filteredExams.filter(exam => exam.subject === subject);
        }

        if (difficulty) {
            filteredExams = filteredExams.filter(exam => exam.difficulty === difficulty);
        }

        return filteredExams;
    }

    // Data validation methods
    validateUser(userData) {
        const errors = [];
        
        if (!userData.name || userData.name.length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Valid email address is required');
        }
        
        if (this.users.some(user => user.email === userData.email)) {
            errors.push('Email address already exists');
        }
        
        if (!userData.password || userData.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }
        
        return errors;
    }

    validateExam(examData) {
        const errors = [];
        
        if (!examData.title || examData.title.length < 3) {
            errors.push('Exam title must be at least 3 characters long');
        }
        
        if (!examData.subject) {
            errors.push('Subject is required');
        }
        
        if (!examData.duration || examData.duration < 1) {
            errors.push('Duration must be at least 1 minute');
        }
        
        if (!examData.questions || examData.questions.length === 0) {
            errors.push('At least one question is required');
        }
        
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Data export methods
    exportResults(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.results, null, 2);
        } else if (format === 'csv') {
            const headers = ['ID', 'Exam Title', 'Student Name', 'Score', 'Completed At'];
            const rows = this.results.map(result => [
                result.id,
                result.examTitle,
                result.studentName,
                result.score,
                result.completedAt
            ]);
            
            return [headers, ...rows]
                .map(row => row.join(','))
                .join('\n');
        }
    }

    // Reset methods (for testing)
    resetDatabase() {
        this.__proto__.constructor.call(this);
    }

    clearResults() {
        this.results = [];
    }
}

// Create and export database instance
const db = new Database();

// Attach db to window for browser use
if (typeof window !== 'undefined') {
    window.db = db;
}

// --- UI Logic for Login and Dashboard ---
document.addEventListener('DOMContentLoaded', function () {
    const dashboard = document.getElementById('dashboard');
    const studentDashboard = document.getElementById('studentDashboard');
    const teacherDashboard = document.getElementById('teacherDashboard');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const switchAuthMode = document.getElementById('switchAuthMode');
    const resultsPage = document.getElementById('resultsPage');
    let isLoginMode = true;

    // Hide teacher dashboard by default, show student dashboard
    studentDashboard.classList.remove('hidden');
    teacherDashboard.classList.add('hidden');

    // --- AUTH LOGIC (Login/Signup) ---
    let currentUser = null;

    function showAuthModal() {
        authModal.classList.remove('hidden');
        dashboard.classList.add('hidden');
        resultsPage.classList.add('hidden');
        document.getElementById('examInterface').classList.add('hidden');
        // Reset login/signup form fields and errors
        authForm.reset();
        document.getElementById('signupFields').classList.add('hidden');
        isLoginMode = true;
        authTitle.textContent = 'Login';
        authSubmitBtn.textContent = 'Login';
        switchAuthMode.textContent = 'Sign up';
    }
    function hideAuthModal() {
        authModal.classList.add('hidden');
        dashboard.classList.remove('hidden');
    }
    // Show/hide signup fields based on mode
    function switchMode() {
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? 'Login' : 'Sign Up';
        authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
        switchAuthMode.textContent = isLoginMode ? 'Sign up' : 'Login';
        document.getElementById('signupFields').classList.toggle('hidden', isLoginMode);
        // Clear form fields on mode switch
        authForm.reset();
        // Remove teacher option from role selector in signup mode
        const roleSelect = document.getElementById('authRole');
        if (!isLoginMode) {
            // In signup mode, only allow student
            roleSelect.value = 'student';
            roleSelect.disabled = true;
        } else {
            // In login mode, allow both
            roleSelect.disabled = false;
        }
    }
    switchAuthMode.addEventListener('click', function(e) {
        e.preventDefault();
        switchMode();
    });

    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const role = document.getElementById('authRole').value;
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value;
        const loginId = document.getElementById('authId').value.trim();
        // --- MASTER TEACHER ACCOUNT (PRIVATE) ---
        const MASTER_TEACHER = {
            username: 'teacher',
            password: '123456',
            name: 'TeacherX',
            role: 'teacher',
            id: 9999,
            userId: 'MT1234',
            email: 'teacher@private.local',
            avatar: 'MT'
        };
        // --- MASTER STUDENT ACCOUNT (PRIVATE) ---
        const MASTER_STUDENT = {
            username: 'student',
            password: '123456',
            name: 'StudentX',
            role: 'student',
            id: 8888,
            userId: 'MS1234',
            email: 'student@private.local',
            avatar: 'MS'
        };
        if (isLoginMode) {
            if (!username || !password || !loginId) {
                alert('Please enter username, password, and ID.');
                return;
            }
            // Check for master teacher login (username or email, password, and ID)
            if (
                (username === MASTER_TEACHER.username || username === MASTER_TEACHER.email) &&
                password === MASTER_TEACHER.password &&
                (loginId === MASTER_TEACHER.userId || loginId === MASTER_TEACHER.id.toString())
            ) {
                currentUser = MASTER_TEACHER;
                hideAuthModal();
                showDashboardForRole('teacher');
                return;
            }
            // Check for master student login (username or email, password, and ID)
            if (
                (username === MASTER_STUDENT.username || username === MASTER_STUDENT.email) &&
                password === MASTER_STUDENT.password &&
                (loginId === MASTER_STUDENT.userId || loginId === MASTER_STUDENT.id.toString())
            ) {
                currentUser = MASTER_STUDENT;
                hideAuthModal();
                showDashboardForRole('student');
                return;
            }
            // Accept both username and email for login (regular users), require ID match and role
            const user = db.users.find(u =>
                (u.email === username || u.email.split('@')[0] === username) &&
                u.password === password &&
                (u.userId === loginId || u.id?.toString() === loginId) &&
                u.role === role
            );
            if (user) {
                currentUser = user;
                hideAuthModal();
                showDashboardForRole(user.role);
            } else {
                alert('Invalid credentials. Please check your username, password, ID, and role.');
            }
        } else {
            // Signup
            // Only allow student signup
            if (role !== 'student') {
                alert('Only student sign up is allowed.');
                return;
            }
            const fullName = document.getElementById('signupFullName').value.trim();
            const userId = document.getElementById('signupId').value.trim();
            if (!fullName || !userId) {
                alert('Please enter your full name and ID.');
                return;
            }
            if (db.users.some(u => u.email === username)) {
                alert('Username already exists.');
                return;
            }
            if (db.users.some(u => u.userId === userId)) {
                alert('ID already exists.');
                return;
            }
            if (username.length < 3 || password.length < 6) {
                alert('Username must be at least 3 chars and password at least 6 chars.');
                return;
            }
            const user = db.addUser({ name: fullName, email: username, password, role, userId });
            currentUser = user;
            hideAuthModal();
            showDashboardForRole(user.role);
        }
    });

    // Logout button logic (single setup)
    function setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = function() {
                currentUser = null;
                showAuthModal();
            };
        }
    }
    setupLogoutButton();

    // Ensure logout button works after login and after DOM updates
    // window.addEventListener('DOMContentLoaded', function() {
    //     showAuthModal();
    //     setupLogoutButton();
    // });
    // Also call after showing dashboard for role
    function showDashboardForRole(role) {
        if (role === 'student') {
            document.getElementById('studentDashboard').classList.remove('hidden');
            document.getElementById('teacherDashboard').classList.add('hidden');
            renderExamsList();
        } else {
            document.getElementById('teacherDashboard').classList.remove('hidden');
            document.getElementById('studentDashboard').classList.add('hidden');
            renderTeacherDashboard();
        }
        setupLogoutButton();
    }

    function renderTeacherDashboard() {
        // Stats
        document.getElementById('totalExams').textContent = db.exams.length;
        document.getElementById('totalAttempts').textContent = db.results.length;
        document.getElementById('avgScore').textContent = db.results.length > 0 ? Math.round(db.results.reduce((sum, r) => sum + r.score, 0) / db.results.length) + '%' : '0%';

        // --- Modern Analytics Section ---
        let oldChart = document.getElementById('teacherAnalytics');
        if (oldChart) oldChart.remove();
        const analyticsSection = document.createElement('section');
        analyticsSection.id = 'teacherAnalytics';
        analyticsSection.style.margin = '2rem 0 1.5rem 0';
        analyticsSection.style.background = 'var(--card-bg, #fff)';
        analyticsSection.style.borderRadius = '1rem';
        analyticsSection.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
        analyticsSection.style.padding = '2rem 1.5rem';
        analyticsSection.style.fontFamily = 'var(--pixel-font, monospace)';
        analyticsSection.innerHTML = `<h3 style="margin-bottom:1.5rem;font-size:1.2rem;letter-spacing:1px;display:flex;align-items:center;gap:0.5em;"><span style='font-size:1.3em;'>📊</span> Exam Performance Analytics</h3>`;
        // Grid of stat cards for each exam
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
        grid.style.gap = '1.5rem';
        db.exams.forEach(exam => {
            const stats = db.getExamStatistics(exam.id);
            const card = document.createElement('div');
            card.style.background = 'var(--card-inner-bg, #f9fafb)';
            card.style.border = '1.5px solid #e5e7eb';
            card.style.borderRadius = '0.7rem';
            card.style.padding = '1.2rem 1rem 1rem 1rem';
            card.style.fontSize = '1rem';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            card.style.transition = 'box-shadow 0.2s';
            card.style.boxShadow = '0 1px 4px rgba(36,36,36,0.06)';
            card.onmouseover = () => card.style.boxShadow = '0 4px 16px rgba(36,36,36,0.13)';
            card.onmouseout = () => card.style.boxShadow = '0 1px 4px rgba(36,36,36,0.06)';
            card.innerHTML = `
                <div style="font-weight:700;font-size:1.08rem;margin-bottom:0.3rem;display:flex;align-items:center;gap:0.5em;"><span style='font-size:1.1em;'>📝</span> ${exam.title}</div>
                <div style="font-size:0.93rem;color:#6b7280;margin-bottom:0.5rem;">${exam.subject}</div>
                <div style="display:flex;gap:1em;margin-bottom:0.5rem;">
                    <span style="font-size:0.92em;">Attempts: <b>${stats.totalAttempts}</b></span>
                    <span style="font-size:0.92em;">Avg: <b>${stats.averageScore}%</b></span>
                </div>
                <div style="height:16px;background:#e5e7eb;border-radius:7px;overflow:hidden;margin-bottom:0.5rem;">
                    <div style="background:#3b82f6;height:100%;width:${stats.averageScore}%;min-width:2px;transition:width 0.5s;"></div>
                </div>
                <div style="font-size:0.91em;display:flex;gap:1em;">
                    <span>High: <b>${stats.highestScore}%</b></span>
                    <span>Low: <b>${stats.lowestScore}%</b></span>
                    <span>Pass: <b>${stats.passRate}%</b></span>
                </div>
            `;
            grid.appendChild(card);
        });
        analyticsSection.appendChild(grid);
        // Insert after stats-list
        const statsList = document.querySelector('.stats-list');
        if (statsList) statsList.parentNode.insertBefore(analyticsSection, statsList.nextSibling);

        // --- Modern Teacher Review Table ---
        let oldReview = document.getElementById('teacherReviewTable');
        if (oldReview) oldReview.remove();
        const reviewSection = document.createElement('section');
        reviewSection.id = 'teacherReviewTable';
        reviewSection.style.margin = '2.5rem 0 1.5rem 0';
        reviewSection.style.background = 'var(--card-bg, #fff)';
        reviewSection.style.borderRadius = '1rem';
        reviewSection.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
        reviewSection.style.padding = '2rem 1.5rem';
        reviewSection.style.fontFamily = 'var(--pixel-font, monospace)';
        reviewSection.innerHTML = `<h3 style="margin-bottom:1.5rem;font-size:1.2rem;letter-spacing:1px;display:flex;align-items:center;gap:0.5em;"><span style='font-size:1.3em;'>📋</span> All Student Attempts</h3>`;
        const tableWrap = document.createElement('div');
        tableWrap.style.overflowX = 'auto';
        tableWrap.style.maxHeight = '340px';
        tableWrap.style.borderRadius = '0.7rem';
        tableWrap.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)';
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.97rem';
        table.innerHTML = `
            <thead>
                <tr style="background:var(--table-head-bg,#f3f4f6);color:#23272f;">
                    <th style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;">Student</th>
                    <th style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;">Exam</th>
                    <th style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;">Score</th>
                    <th style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;">Correct</th>
                    <th style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;">Time</th>
                    <th style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;">Date</th>
                </tr>
            </thead>
            <tbody>
                ${db.getAllResults().map(r => `
                    <tr style="background:var(--table-row-bg,#fff);color:#23272f;transition:background 0.2s;">
                        <td style='padding:10px 12px;border:1px solid #e5e7eb;'>${r.studentName}</td>
                        <td style='padding:10px 12px;border:1px solid #e5e7eb;'>${r.examTitle}</td>
                        <td style='padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:${r.score >= 60 ? '#10B981' : '#EF4444'};'>${r.score}%</td>
                        <td style='padding:10px 12px;border:1px solid #e5e7eb;'>${r.correctAnswers}/${r.totalQuestions}</td>
                        <td style='padding:10px 12px;border:1px solid #e5e7eb;'>${db.formatTime(r.timeTaken)}</td>
                        <td style='padding:10px 12px;border:1px solid #e5e7eb;'>${r.completedAt.split('T')[0]}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        tableWrap.appendChild(table);
        reviewSection.appendChild(tableWrap);
        // Insert after analyticsSection
        analyticsSection.parentNode.insertBefore(reviewSection, analyticsSection.nextSibling);

        // Recent Results (unchanged)
        const recentResults = db.getRecentResults(5);
        const recentResultsDiv = document.getElementById('recentResults');
        recentResultsDiv.innerHTML = '';
        recentResults.forEach(result => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<div class="result-info"><h4>${result.studentName}</h4><p>${result.examTitle}</p></div><div class="result-score"><span class="score ${result.score >= 60 ? 'score-pass' : 'score-fail'}">${result.score}%</span><br><span class="date">${result.completedAt.split('T')[0]}</span></div>`;
            recentResultsDiv.appendChild(div);
        });
    }

    // --- Exam Creation Modal (basic, dynamic) ---
    const createExamBtn = document.getElementById('createExamBtn');
    const createExamModal = document.getElementById('createExamModal');
    const closeModal = document.getElementById('closeModal');
    const cancelCreate = document.getElementById('cancelCreate');
    const createExamForm = document.getElementById('createExamForm');
    const questionsContainer = document.getElementById('questionsContainer');
    const addQuestionBtn = document.getElementById('addQuestionBtn');

    if (createExamBtn) {
        createExamBtn.addEventListener('click', () => {
            createExamModal.classList.remove('hidden');
            questionsContainer.innerHTML = '<label>Questions</label>';
            addQuestionBlock();
        });
    }
    if (closeModal) closeModal.addEventListener('click', () => createExamModal.classList.add('hidden'));
    if (cancelCreate) cancelCreate.addEventListener('click', () => createExamModal.classList.add('hidden'));

    function addQuestionBlock() {
        const idx = questionsContainer.querySelectorAll('.question-block').length;
        const block = document.createElement('div');
        block.className = 'question-block';
        block.innerHTML = `
            <div class="form-group">
                <label>Question</label>
                <input type="text" class="form-input question-input" required>
            </div>
            <div class="options-grid">
                <div><input type="text" class="form-input option-input" placeholder="Option 1" required></div>
                <div><input type="text" class="form-input option-input" placeholder="Option 2" required></div>
                <div><input type="text" class="form-input option-input" placeholder="Option 3" required></div>
                <div><input type="text" class="form-input option-input" placeholder="Option 4" required></div>
            </div>
            <div class="form-group">
                <label>Correct Answer (1-4)</label>
                <input type="number" class="form-input correct-input" min="1" max="4" value="1" required>
            </div>
            <div class="form-group">
                <label>Points</label>
                <input type="number" class="form-input points-input" min="1" value="1" required>
            </div>
            <button type="button" class="remove-question">Remove</button>
        `;
        block.querySelector('.remove-question').addEventListener('click', () => block.remove());
        questionsContainer.appendChild(block);
    }
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', addQuestionBlock);

    if (createExamForm) {
        createExamForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Gather exam data
            const title = document.getElementById('examTitleInput').value.trim();
            const duration = parseInt(document.getElementById('examDuration').value);
            const subject = document.getElementById('examSubject').value.trim();
            const questions = [];
            questionsContainer.querySelectorAll('.question-block').forEach(block => {
                const q = block.querySelector('.question-input').value.trim();
                const opts = Array.from(block.querySelectorAll('.option-input')).map(i => i.value.trim());
                const correct = parseInt(block.querySelector('.correct-input').value) - 1;
                const points = parseFloat(block.querySelector('.points-input').value);
                if (q && opts.every(o => o) && correct >= 0 && correct < 4) {
                    questions.push({
                        id: questions.length + 1,
                        question: q,
                        options: opts,
                        correctAnswer: correct,
                        points: points
                    });
                }
            });
            if (!title || !subject || !duration || questions.length === 0) {
                alert('Please fill all exam fields and add at least one question.');
                return;
            }
            db.addExam({
                title,
                subject,
                duration,
                questions,
                createdBy: currentUser.id,
                difficulty: 'Custom'
            });
            createExamModal.classList.add('hidden');
            renderTeacherDashboard();
        });
    }

    // Student Dashboard: Render Exams and Features
    function renderExamsList() {
        const examsList = document.getElementById('examsList');
        examsList.innerHTML = '';
        const exams = db.getAllExams();
        if (exams.length === 0) {
            examsList.innerHTML = '<div style="padding:2rem;text-align:center;color:#6b7280;">No exams available.</div>';
        } else {
            exams.forEach(exam => {
                const card = document.createElement('div');
                card.className = 'exam-card';
                card.innerHTML = `
                    <div class="exam-card-header">
                        <div class="exam-icon">${exam.subject[0]}</div>
                        <div>
                            <div class="exam-title">${exam.title}</div>
                            <div class="exam-subject">${exam.subject}</div>
                        </div>
                    </div>
                    <div class="exam-details">
                        <div class="exam-detail"><span>Duration:</span><span>${exam.duration} min</span></div>
                        <div class="exam-detail"><span>Questions:</span><span>${exam.totalQuestions}</span></div>
                        <div class="exam-detail"><span>Difficulty:</span><span>${exam.difficulty || 'N/A'}</span></div>
                    </div>
                    <button class="btn btn-primary btn-full start-exam-btn" data-id="${exam.id}">Start Exam</button>
                `;
                examsList.appendChild(card);
            });
            // Add event listeners
            examsList.querySelectorAll('.start-exam-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const examId = parseInt(this.getAttribute('data-id'));
                    startExam(examId);
                });
            });
        }
        renderStudentStats();
        renderStudentRecentResults();
    }

    // Student Stats Card
    function renderStudentStats() {
        const statsCard = document.getElementById('studentStatsCard');
        if (!currentUser || !statsCard) return;
        const stats = db.getStudentStatistics(currentUser.id);
        statsCard.innerHTML = `
            <div style="background:#fff;border-radius:0.75rem;box-shadow:0 1px 4px rgba(36,36,36,0.06);padding:1.2rem 1.5rem;min-width:200px;">
                <div style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem;color:#23272f;">Your Stats</div>
                <div style="color:#3b82f6;font-size:1.5rem;font-weight:700;">${stats.averageScore}%</div>
                <div style="font-size:0.95rem;color:#6b7280;margin-bottom:0.7rem;">Average Score</div>
                <div style="display:flex;justify-content:space-between;font-size:0.95rem;color:#23272f;">
                    <span>Exams Taken</span><span>${stats.totalExamsTaken}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.95rem;color:#23272f;">
                    <span>Best Score</span><span>${stats.bestScore}%</span>
                </div>
            </div>
        `;
    }

    // Student Recent Results
    function renderStudentRecentResults() {
        const recentDiv = document.getElementById('studentRecentResults');
        if (!currentUser || !recentDiv) return;
        const results = db.getResultsByStudent(currentUser.id).slice(-5).reverse();
        if (results.length === 0) {
            recentDiv.innerHTML = '';
            return;
        }
        recentDiv.innerHTML = `<h3 style="font-size:1.15rem;font-weight:600;margin-bottom:1rem;color:#23272f;">Recent Attempts</h3>`;
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<div class="result-info"><h4>${result.examTitle}</h4><p>${result.completedAt.split('T')[0]}</p></div><div class="result-score"><span class="score ${result.score >= 60 ? 'score-pass' : 'score-fail'}">${result.score}%</span><br><span class="date">${db.formatTime(result.timeTaken)}</span></div>`;
            recentDiv.appendChild(div);
        });
    }

    // Password visibility toggle for login and signup
    const authPassword = document.getElementById('authPassword');
    const toggleAuthPassword = document.getElementById('toggleAuthPassword');
    if (authPassword && toggleAuthPassword) {
        toggleAuthPassword.addEventListener('click', function() {
            const svg = toggleAuthPassword.querySelector('svg');
            if (authPassword.type === 'password') {
                authPassword.type = 'text';
                // Change SVG fill to a lighter color for feedback
                svg.setAttribute('fill', '#81b8e7');
            } else {
                authPassword.type = 'password';
                svg.setAttribute('fill', '#1A508B');
            }
        });
    }

    // --- THEME TOGGLE LOGIC ---
    const themeToggle = document.getElementById('themeToggle');
    function setTheme(dark) {
        if (dark) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            setTheme(!document.body.classList.contains('dark-mode'));
        });
    }
    // On load, set theme from localStorage
    window.addEventListener('DOMContentLoaded', function() {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') setTheme(true);
        else setTheme(false);
    });

    // --- EXAM INTERFACE LOGIC ---
    let currentExam = null;
    let currentExamAnswers = [];
    let currentExamIndex = 0;
    let currentExamStartTime = 0;
    let examTimerInterval = null;

    function showExamInterface() {
        dashboard.classList.add('hidden');
        document.getElementById('examInterface').classList.remove('hidden');
        if (currentExam && typeof renderExamQuestion === 'function') {
            renderExamQuestion();
        }
    }

    function startExamTimer(duration) {
        let timer = duration, minutes, seconds;
        examTimerInterval = setInterval(function () {
            minutes = parseInt((timer / 60), 10);
            seconds = parseInt((timer % 60), 10);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;
            document.getElementById('examTimer').textContent = minutes + ":" + seconds;
            if (--timer < 0) {
                clearInterval(examTimerInterval);
                document.getElementById('examTimer').textContent = "00:00";
                submitExam();
            }
        }, 1000);
    }

    function renderExamQuestion() {
        if (!currentExam || !currentExam.questions || currentExam.questions.length === 0) {
            document.getElementById('questionContainer').innerHTML = '<div style="padding:2rem;text-align:center;color:#ef4444;">No questions available for this exam.</div>';
            return;
        }
        const q = currentExam.questions[currentExamIndex];
        const container = document.getElementById('questionContainer');
        container.innerHTML = `
            <div class="question-title">Question ${currentExamIndex + 1} of ${currentExam.questions.length}</div>
            <div class="question-text">${q.question}</div>
            <div class="options-list">
                ${q.options.map((opt, i) => `
                    <label class="option-item">
                        <input type="radio" name="option" value="${i}" ${currentExamAnswers[currentExamIndex] == i ? 'checked' : ''}>
                        ${opt}
                    </label>
                `).join('')}
            </div>
        `;
        container.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', function() {
                currentExamAnswers[currentExamIndex] = parseInt(this.value);
                document.getElementById('nextBtn').disabled = false;
            });
        });
        document.getElementById('prevBtn').disabled = currentExamIndex === 0;
        document.getElementById('nextBtn').textContent = currentExamIndex === currentExam.questions.length - 1 ? 'Submit' : 'Next';
        document.getElementById('nextBtn').disabled = currentExamAnswers[currentExamIndex] == null;
    }

    function updateExamProgress() {
        const progressBar = document.getElementById('examProgressBar');
        const progressText = document.getElementById('examProgressText');
        const total = currentExam.questions.length;
        const current = currentExamIndex + 1;
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current} / ${total}`;
    }

    function submitExam() {
        clearInterval(examTimerInterval);
        const correctAnswers = currentExamAnswers.filter((ans, index) => ans === currentExam.questions[index].correctAnswer).length;
        const score = db.calculateScore(correctAnswers, currentExam.questions.length);
        db.addResult({
            examId: currentExam.id,
            examTitle: currentExam.title,
            studentId: currentUser.id,
            studentName: currentUser.name,
            score,
            correctAnswers: correctAnswers,
            totalQuestions: currentExam.questions.length,
            timeTaken: Math.floor((Date.now() - currentExamStartTime) / 1000),
            answers: currentExamAnswers
        });
        showResultsPage(score, correctAnswers, currentExam.questions.length, Math.floor((Date.now() - currentExamStartTime) / 1000));
    }

    function hideExamInterface() {
        document.getElementById('examInterface').classList.add('hidden');
        dashboard.classList.remove('hidden');
    }

    function showResultsPage(score, correct, total, timeTaken) {
        hideExamInterface();
        const resultsPage = document.getElementById('resultsPage');
        resultsPage.classList.remove('hidden');
        resultsPage.classList.add('results-modal'); // Show as modal overlay
        document.getElementById('finalScore').textContent = score + '%';
        document.getElementById('correctAnswers').textContent = `${correct}/${total}`;
        document.getElementById('timeTaken').textContent = db.formatTime(timeTaken);
        let userInfo = '';
        if (currentUser && currentUser.name && (currentUser.userId || currentUser.email)) {
            userInfo = `<div style=\"margin-bottom:1rem;color:#3b82f6;font-weight:600;\">${currentUser.name}${currentUser.userId ? ' (ID: ' + currentUser.userId + ')' : ''}</div>`;
        }
        const resultsHeader = resultsPage.querySelector('.results-header');
        if (resultsHeader && !resultsHeader.querySelector('.user-info')) {
            const div = document.createElement('div');
            div.className = 'user-info';
            div.innerHTML = userInfo;
            resultsHeader.insertBefore(div, resultsHeader.children[1]);
        } else if (resultsHeader && resultsHeader.querySelector('.user-info')) {
            resultsHeader.querySelector('.user-info').innerHTML = userInfo;
        }
        // Remove answer review section if present
        let oldBreakdown = document.getElementById('resultsBreakdown');
        if (oldBreakdown) oldBreakdown.remove();
        // Do NOT append answer review anymore
        document.getElementById('backToDashboard').onclick = function() {
            resultsPage.classList.add('hidden');
            resultsPage.classList.remove('results-modal'); // Remove modal overlay
            dashboard.classList.remove('hidden');
            renderExamsList();
        };
    }

    function startExam(examId) {
        currentExam = db.getExamById(examId);
        currentExamAnswers = Array(currentExam.questions.length).fill(null);
        currentExamIndex = 0;
        currentExamStartTime = Date.now();
        document.getElementById('examTitle').textContent = currentExam.title;
        showExamInterface();
        startExamTimer(currentExam.duration * 60);
        renderExamQuestion();
        updateExamProgress();
    }

    // Unified navigation for exam (no duplicate listeners)
    document.getElementById('nextBtn').addEventListener('click', function() {
        if (currentExamIndex < currentExam.questions.length - 1) {
            if (currentExamAnswers[currentExamIndex] == null) {
                alert('Please select an answer before proceeding to the next question.');
                return;
            }
            currentExamIndex++;
            renderExamQuestion();
            updateExamProgress();
        } else {
            const unanswered = currentExamAnswers.findIndex(ans => ans == null);
            if (unanswered !== -1) {
                alert('Please answer all questions before submitting.');
                return;
            }
            submitExam();
        }
    });
    document.getElementById('prevBtn').addEventListener('click', function() {
        if (currentExamIndex > 0) {
            currentExamIndex--;
            renderExamQuestion();
            updateExamProgress();
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            currentUser = null;
            showAuthModal();
        });
    }

    // About overlay show/hide logic with new .active class
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutOverlay = document.getElementById('aboutOverlay');
    const closeAbout = document.getElementById('closeAbout');

    if (aboutBtn && aboutOverlay && closeAbout) {
      aboutBtn.addEventListener('click', () => {
        aboutOverlay.classList.add('active');
      });
      closeAbout.addEventListener('click', () => {
        aboutOverlay.classList.remove('active');
      });
      aboutOverlay.addEventListener('click', (e) => {
        if (e.target === aboutOverlay) {
          aboutOverlay.classList.remove('active');
        }
      });
    }

    // Student Dashboard Stats and Recent Results rendering
    function renderStudentStats(stats) {
      const statExamsTaken = document.getElementById('statExamsTaken');
      const statAvgScore = document.getElementById('statAvgScore');
      if (statExamsTaken && statAvgScore) {
        statExamsTaken.textContent = stats.examsTaken || 0;
        statAvgScore.textContent = (stats.avgScore || 0) + '%';
      }
    }

    function renderRecentResults(results) {
      const recentResultsList = document.getElementById('recentResultsList');
      if (!recentResultsList) return;
      recentResultsList.innerHTML = '';
      if (!results || results.length === 0) {
        recentResultsList.innerHTML = '<div style="color:#888;font-size:1rem;">No recent results yet.</div>';
        return;
      }
      results.slice(0, 5).forEach(r => {
        const item = document.createElement('div');
        item.className = 'recent-result-item';
        item.innerHTML = `<span>${r.examTitle}</span><span class="score">${r.score}%</span>`;
        recentResultsList.appendChild(item);
      });
    }

    // Example usage (replace with real data from your app logic):
    // renderStudentStats({ examsTaken: 3, avgScore: 87 });
    // renderRecentResults([
    //   { examTitle: 'Java OOP', score: 90 },
    //   { examTitle: 'C++', score: 80 },
    // ]);
});