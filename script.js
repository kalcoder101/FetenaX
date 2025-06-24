// Database simulation for Online Exam System
class Database {
    constructor() {
        this.users = [
            {
                id: 1,
                email: 'student@demo.com',
                password: 'password123',
                role: 'student',
                name: 'John Student',
                avatar: 'JS'
            },
            {
                id: 2,
                email: 'teacher@demo.com',
                password: 'password123',
                role: 'teacher',
                name: 'Jane Teacher',
                avatar: 'JT'
            },
            {
                id: 3,
                email: 'alice@demo.com',
                password: 'password123',
                role: 'student',
                name: 'Alice Johnson',
                avatar: 'AJ'
            }
        ];

        this.exams = [
            {
                id: 1,
                title: 'Mathematics Quiz',
                subject: 'Mathematics',
                duration: 30,
                totalQuestions: 5,
                difficulty: 'Medium',
                createdBy: 2,
                createdAt: '2024-01-15',
                questions: [
                    {
                        id: 1,
                        question: 'What is 2 + 2?',
                        options: ['3', '4', '5', '6'],
                        correctAnswer: 1,
                        points: 2
                    },
                    {
                        id: 2,
                        question: 'What is the square root of 16?',
                        options: ['2', '3', '4', '5'],
                        correctAnswer: 2,
                        points: 2
                    },
                    {
                        id: 3,
                        question: 'What is 10 × 5?',
                        options: ['45', '50', '55', '60'],
                        correctAnswer: 1,
                        points: 2
                    },
                    {
                        id: 4,
                        question: 'What is 15 ÷ 3?',
                        options: ['3', '4', '5', '6'],
                        correctAnswer: 2,
                        points: 2
                    },
                    {
                        id: 5,
                        question: 'What is 7 × 8?',
                        options: ['54', '56', '58', '60'],
                        correctAnswer: 1,
                        points: 2
                    }
                ]
            },
            {
                id: 2,
                title: 'Science Basics',
                subject: 'Science',
                duration: 25,
                totalQuestions: 4,
                difficulty: 'Easy',
                createdBy: 2,
                createdAt: '2024-01-20',
                questions: [
                    {
                        id: 1,
                        question: 'What is the chemical symbol for water?',
                        options: ['H2O', 'CO2', 'NaCl', 'O2'],
                        correctAnswer: 0,
                        points: 2.5
                    },
                    {
                        id: 2,
                        question: 'How many planets are in our solar system?',
                        options: ['7', '8', '9', '10'],
                        correctAnswer: 1,
                        points: 2.5
                    },
                    {
                        id: 3,
                        question: 'What gas do plants absorb from the atmosphere?',
                        options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
                        correctAnswer: 1,
                        points: 2.5
                    },
                    {
                        id: 4,
                        question: 'What is the fastest land animal?',
                        options: ['Lion', 'Cheetah', 'Tiger', 'Leopard'],
                        correctAnswer: 1,
                        points: 2.5
                    }
                ]
            },
            {
                id: 3,
                title: 'English Grammar',
                subject: 'English',
                duration: 20,
                totalQuestions: 3,
                difficulty: 'Easy',
                createdBy: 2,
                createdAt: '2024-01-25',
                questions: [
                    {
                        id: 1,
                        question: 'Which word is a noun?',
                        options: ['Run', 'Beautiful', 'Book', 'Quickly'],
                        correctAnswer: 2,
                        points: 3.33
                    },
                    {
                        id: 2,
                        question: 'What is the past tense of "go"?',
                        options: ['Goed', 'Gone', 'Went', 'Going'],
                        correctAnswer: 2,
                        points: 3.33
                    },
                    {
                        id: 3,
                        question: 'Which sentence is grammatically correct?',
                        options: [
                            'She don\'t like pizza',
                            'She doesn\'t like pizza',
                            'She not like pizza',
                            'She doesn\'t likes pizza'
                        ],
                        correctAnswer: 1,
                        points: 3.34
                    }
                ]
            }
        ];

        this.results = [
            {
                id: 1,
                examId: 1,
                examTitle: 'Mathematics Quiz',
                studentId: 1,
                studentName: 'John Student',
                score: 85,
                correctAnswers: 4,
                totalQuestions: 5,
                timeTaken: 1200, // in seconds
                completedAt: '2024-02-01T10:30:00Z',
                answers: [1, 2, 1, 2, 1] // user's selected answers
            },
            {
                id: 2,
                examId: 2,
                examTitle: 'Science Basics',
                studentId: 3,
                studentName: 'Alice Johnson',
                score: 75,
                correctAnswers: 3,
                totalQuestions: 4,
                timeTaken: 900,
                completedAt: '2024-02-02T14:15:00Z',
                answers: [0, 1, 1, 0]
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

    // Demo users (for login info)
    if (!db.users.some(u => u.email === 'student1')) {
        db.addUser({ name: 'Demo Student', email: 'student1', password: 'studentpass', role: 'student' });
    }
    if (!db.users.some(u => u.email === 'teacher1')) {
        db.addUser({ name: 'Demo Teacher', email: 'teacher1', password: 'teacherpass', role: 'teacher' });
    }

    function showAuthModal() {
        authModal.classList.remove('hidden');
        dashboard.classList.add('hidden');
        resultsPage.classList.add('hidden');
        document.getElementById('examInterface').classList.add('hidden');
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
        if (isLoginMode) {
            const user = db.users.find(u => u.email === username && u.password === password && u.role === role);
            if (user) {
                currentUser = user;
                hideAuthModal();
                showDashboardForRole(user.role);
            } else {
                alert('Invalid credentials. Try the demo logins below.');
            }
        } else {
            // Signup
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

        // --- Analytics Chart (text-based for now) ---
        let oldChart = document.getElementById('teacherAnalytics');
        if (oldChart) oldChart.remove();
        const chartDiv = document.createElement('div');
        chartDiv.id = 'teacherAnalytics';
        chartDiv.style.margin = '1.5rem 0';
        chartDiv.style.background = '#fff';
        chartDiv.style.borderRadius = '0.75rem';
        chartDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)';
        chartDiv.style.padding = '1.5rem';
        chartDiv.innerHTML = `<h3 style="margin-bottom:1rem;">Exam Performance Analytics</h3>`;
        // Bar chart for each exam (text-based)
        db.exams.forEach(exam => {
            const stats = db.getExamStatistics(exam.id);
            const bar = `<div style="margin-bottom:0.5rem;">
                <strong>${exam.title}</strong> (${stats.totalAttempts} attempts)<br>
                <div style="background:#eee;height:18px;border-radius:8px;overflow:hidden;">
                    <div style="background:#333;height:100%;width:${stats.averageScore}%;min-width:2px;transition:width 0.5s;"></div>
                </div>
                <span style="font-size:0.9em;">Avg: ${stats.averageScore}%, High: ${stats.highestScore}%, Low: ${stats.lowestScore}%, Pass Rate: ${stats.passRate}%</span>
            </div>`;
            chartDiv.innerHTML += bar;
        });
        // Insert after stats-list
        const statsList = document.querySelector('.stats-list');
        if (statsList) statsList.parentNode.insertBefore(chartDiv, statsList.nextSibling);

        // --- Teacher Review Table ---
        let oldReview = document.getElementById('teacherReviewTable');
        if (oldReview) oldReview.remove();
        const reviewDiv = document.createElement('div');
        reviewDiv.id = 'teacherReviewTable';
        reviewDiv.style.margin = '2rem 0';
        reviewDiv.innerHTML = `<h3 style="margin-bottom:1rem;">All Student Attempts</h3>`;
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr style="background:#f3f4f6;">
                    <th style="padding:8px;border:1px solid #e5e7eb;">Student</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Exam</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Score</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Correct</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Time</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Date</th>
                </tr>
            </thead>
            <tbody>
                ${db.getAllResults().map(r => `
                    <tr>
                        <td style='padding:8px;border:1px solid #e5e7eb;'>${r.studentName}</td>
                        <td style='padding:8px;border:1px solid #e5e7eb;'>${r.examTitle}</td>
                        <td style='padding:8px;border:1px solid #e5e7eb;'>${r.score}%</td>
                        <td style='padding:8px;border:1px solid #e5e7eb;'>${r.correctAnswers}/${r.totalQuestions}</td>
                        <td style='padding:8px;border:1px solid #e5e7eb;'>${db.formatTime(r.timeTaken)}</td>
                        <td style='padding:8px;border:1px solid #e5e7eb;'>${r.completedAt.split('T')[0]}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        reviewDiv.appendChild(table);
        // Insert after chartDiv
        chartDiv.parentNode.insertBefore(reviewDiv, chartDiv.nextSibling);

        // Recent Results
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
    function addPasswordToggle(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const wrapper = input.parentElement;
        const toggle = document.createElement('span');
        toggle.textContent = '👁️';
        toggle.style.cursor = 'pointer';
        toggle.style.position = 'absolute';
        toggle.style.right = '1rem';
        toggle.style.top = '50%';
        toggle.style.transform = 'translateY(-50%)';
        toggle.style.fontSize = '1.1rem';
        toggle.title = 'Show/Hide Password';
        wrapper.style.position = 'relative';
        wrapper.appendChild(toggle);
        toggle.addEventListener('click', function() {
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    }
    addPasswordToggle('authPassword');
    addPasswordToggle('signupPassword');

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
        document.getElementById('finalScore').textContent = score + '%';
        document.getElementById('correctAnswers').textContent = `${correct}/${total}`;
        document.getElementById('timeTaken').textContent = db.formatTime(timeTaken);
        let userInfo = '';
        if (currentUser && currentUser.name && (currentUser.userId || currentUser.email)) {
            userInfo = `<div style="margin-bottom:1rem;color:#3b82f6;font-weight:600;">${currentUser.name}${currentUser.userId ? ' (ID: ' + currentUser.userId + ')' : ''}</div>`;
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
        let oldBreakdown = document.getElementById('resultsBreakdown');
        if (oldBreakdown) oldBreakdown.remove();
        const breakdown = document.createElement('div');
        breakdown.id = 'resultsBreakdown';
        breakdown.style.marginTop = '2rem';
        breakdown.innerHTML = `<h3 style="margin-bottom:1rem;">Answer Review</h3>`;
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr style="background:#f3f4f6;">
                    <th style="padding:8px;border:1px solid #e5e7eb;">#</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Question</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Your Answer</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Correct Answer</th>
                    <th style="padding:8px;border:1px solid #e5e7eb;">Result</th>
                </tr>
            </thead>
            <tbody>
                ${currentExam.questions.map((q, i) => {
                    const userAns = currentExamAnswers[i];
                    const isCorrect = userAns === q.correctAnswer;
                    return `
                        <tr>
                            <td style='padding:8px;border:1px solid #e5e7eb;text-align:center;'>${i+1}</td>
                            <td style='padding:8px;border:1px solid #e5e7eb;'>${q.question}</td>
                            <td style='padding:8px;border:1px solid #e5e7eb;'>${userAns !== null && userAns !== undefined ? q.options[userAns] : '<em>No answer</em>'}</td>
                            <td style='padding:8px;border:1px solid #e5e7eb;'>${q.options[q.correctAnswer]}</td>
                            <td style='padding:8px;border:1px solid #e5e7eb;text-align:center;'><span style='color:${isCorrect ? '#10b981' : '#ef4444'};font-weight:600;'>${isCorrect ? '✔' : '✘'}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        breakdown.appendChild(table);
        resultsPage.querySelector('.results-container').appendChild(breakdown);
        document.getElementById('backToDashboard').onclick = function() {
            resultsPage.classList.add('hidden');
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
});