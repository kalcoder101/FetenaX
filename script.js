// script.js - FetenaX Frontend Logic connected to PHP API

document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const dashboard = document.getElementById('dashboard');
    const studentDashboard = document.getElementById('studentDashboard');
    const teacherDashboard = document.getElementById('teacherDashboard');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const switchAuthMode = document.getElementById('switchAuthMode');
    const resultsPage = document.getElementById('resultsPage');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeToggle = document.getElementById('themeToggle');

    // --- State variables ---
    let currentUser = null;
    let isLoginMode = true;

    // --- SVG Icon Library ---
    const ICONS = {
        login: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none" /><path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" stroke-width="2" fill="none" /></svg>`,
        signup: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none" /><path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" stroke-width="2" fill="none" /><path d="M19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>`,
        chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
        fileLg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
        users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`,
        search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`
    };

    // --- Format helper ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // --- API Request Wrapper ---
    async function apiRequest(action, data = {}, method = 'POST') {
        const url = 'api.php';
        let options = {
            method: method,
            headers: {}
        };

        if (method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify({ action, ...data });
        } else {
            const queryParams = new URLSearchParams({ action, ...data }).toString();
            return fetch(`${url}?${queryParams}`).then(res => res.json());
        }

        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            return { status: 'error', message: 'Network error. Please try again.' };
        }
    }

    // --- Auth Logic ---
    async function checkAuthStatus() {
        const res = await apiRequest('status', {}, 'GET');
        if (res.status === 'success' && res.user) {
            currentUser = res.user;
            hideAuthModal();
            showDashboardForRole(currentUser.role);
        } else {
            showAuthModal();
        }
    }

    function showAuthModal() {
        authModal.classList.remove('hidden');
        dashboard.classList.add('hidden');
        resultsPage.classList.add('hidden');
        document.getElementById('examInterface').classList.add('hidden');
        logoutBtn.classList.add('hidden');
        authForm.reset();
        document.getElementById('signupFields').classList.add('hidden');
        isLoginMode = true;
        authTitle.textContent = 'Login';
        authSubmitBtn.innerHTML = `${ICONS.login} Login`;
        switchAuthMode.innerHTML = `${ICONS.signup} Sign up`;
    }

    function hideAuthModal() {
        authModal.classList.add('hidden');
        dashboard.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
    }

    function switchMode() {
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? 'Login' : 'Sign Up';
        authSubmitBtn.innerHTML = isLoginMode
            ? `${ICONS.login} Login`
            : `${ICONS.signup} Sign up`;
        switchAuthMode.innerHTML = isLoginMode
            ? `${ICONS.signup} Sign up`
            : `${ICONS.login} Login`;
        document.getElementById('signupFields').classList.toggle('hidden', isLoginMode);
        authForm.reset();
    }

    switchAuthMode.addEventListener('click', function (e) {
        e.preventDefault();
        switchMode();
    });

    // ---- FIXED: Simplified login — only username + password ----
    authForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value;

        if (isLoginMode) {
            if (!username || !password) {
                alert('Please enter your username/ID and password.');
                return;
            }
            const res = await apiRequest('login', { username, password });
            if (res.status === 'success') {
                currentUser = res.user;
                hideAuthModal();
                showDashboardForRole(currentUser.role);
            } else {
                alert(res.message || 'Login failed.');
            }
        } else {
            const fullName = document.getElementById('signupFullName').value.trim();
            const userId = document.getElementById('signupUserId').value.trim();
            if (!fullName || !username || !password || !userId) {
                alert('Please fill in all signup fields (Full Name, Username, Password, Student ID).');
                return;
            }
            const res = await apiRequest('signup', { name: fullName, username, password, userId });
            if (res.status === 'success') {
                currentUser = res.user;
                hideAuthModal();
                showDashboardForRole(currentUser.role);
            } else {
                alert(res.message || 'Sign up failed.');
            }
        }
    });

    async function handleLogout() {
        const res = await apiRequest('logout');
        if (res.status === 'success') {
            currentUser = null;
            showAuthModal();
        }
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);

    function showCustomConfirm(title, message, onConfirm) {
        const modal = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const msgEl = document.getElementById('confirmModalMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        titleEl.textContent = title;
        msgEl.textContent = message;
        modal.classList.remove('hidden');

        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newOkBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (onConfirm) onConfirm();
        });
        newCancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    function switchTab(role, tabId) {
        const container = role === 'student' ? studentDashboard : teacherDashboard;
        const nav = role === 'student' ? document.getElementById('studentNav') : document.getElementById('teacherNav');
        container.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.remove('hidden');
        nav.querySelectorAll('.menu-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        const mainContentTitle = document.getElementById('mainContentTitle');
        const mainContentSubtitle = document.getElementById('mainContentSubtitle');
        const titles = {
            'student-exams':    { title: 'Available Exams',      subtitle: 'Select an exam and test your knowledge' },
            'student-history':  { title: 'My Performance',       subtitle: 'Track your progress and attempt history' },
            'teacher-overview': { title: 'Dashboard Overview',   subtitle: 'Real-time statistics and recent activity summary' },
            'teacher-exams':    { title: 'Exam Settings',        subtitle: 'Create, analyse and manage examinations' },
            'teacher-students': { title: 'Student Accounts',     subtitle: 'Manage student registrations and credentials' },
            'teacher-attempts': { title: 'Review Attempts',      subtitle: 'Inspect student exam papers and results' }
        };
        if (titles[tabId] && mainContentTitle && mainContentSubtitle) {
            mainContentTitle.textContent = titles[tabId].title;
            mainContentSubtitle.textContent = titles[tabId].subtitle;
        }
    }

    function showDashboardForRole(role) {
        dashboard.classList.remove('hidden');
        const topNavbar = document.querySelector('.navbar');
        if (topNavbar) topNavbar.classList.add('hidden');

        const studentNav = document.getElementById('studentNav');
        const teacherNav = document.getElementById('teacherNav');

        const initials = (currentUser.name || currentUser.email || 'US').substring(0, 2).toUpperCase();
        document.getElementById('sidebarAvatar').textContent = initials;
        document.getElementById('sidebarUserName').textContent = currentUser.name || currentUser.email;
        document.getElementById('sidebarUserRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);

        if (role === 'student') {
            studentDashboard.classList.remove('hidden');
            teacherDashboard.classList.add('hidden');
            studentNav.classList.remove('hidden');
            teacherNav.classList.add('hidden');
            studentNav.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
            studentNav.querySelector('[data-tab="student-exams"]').classList.add('active');
            switchTab('student', 'student-exams');
            loadStudentDashboard();
        } else {
            teacherDashboard.classList.remove('hidden');
            studentDashboard.classList.add('hidden');
            teacherNav.classList.remove('hidden');
            studentNav.classList.add('hidden');
            teacherNav.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
            teacherNav.querySelector('[data-tab="teacher-overview"]').classList.add('active');
            switchTab('teacher', 'teacher-overview');
            loadTeacherDashboard();
        }
    }

    // =========================================================================
    // --- STUDENT DASHBOARD ---
    // =========================================================================
    async function loadStudentDashboard() {
        const examsRes   = await apiRequest('get_exams', {}, 'GET');
        const resultsRes = await apiRequest('get_student_results', {}, 'GET');

        // ---- Available Exams List ----
        const examsList = document.getElementById('examsList');
        examsList.innerHTML = '';

        if (examsRes.status === 'success' && examsRes.exams) {
            if (examsRes.exams.length === 0) {
                examsList.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">No exams available yet.</div>';
            } else {
                examsRes.exams.forEach(exam => {
                    const card = document.createElement('div');
                    card.className = 'exam-card';
                    card.dataset.title   = (exam.title || '').toLowerCase();
                    card.dataset.subject = (exam.subject || '').toLowerCase();
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

                examsList.querySelectorAll('.start-exam-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        startExam(parseInt(this.getAttribute('data-id')));
                    });
                });
            }
        }

        // ---- Live Search for Exam Cards ----
        const examSearchInput = document.getElementById('studentExamSearch');
        if (examSearchInput) {
            const freshSearch = examSearchInput.cloneNode(true);
            examSearchInput.parentNode.replaceChild(freshSearch, examSearchInput);
            freshSearch.value = '';
            freshSearch.addEventListener('input', function () {
                const q = this.value.toLowerCase().trim();
                document.querySelectorAll('#examsList .exam-card').forEach(card => {
                    const matches = card.dataset.title.includes(q) || card.dataset.subject.includes(q);
                    card.style.display = matches ? '' : 'none';
                });
                const visible = [...document.querySelectorAll('#examsList .exam-card')].filter(c => c.style.display !== 'none');
                const noResult = document.getElementById('examNoResult');
                if (q && visible.length === 0) {
                    if (!noResult) {
                        const msg = document.createElement('div');
                        msg.id = 'examNoResult';
                        msg.style.cssText = 'padding:1.5rem;text-align:center;color:var(--color-text-secondary);grid-column:1/-1;';
                        msg.textContent = `No exams found for "${this.value}".`;
                        examsList.appendChild(msg);
                    }
                } else if (noResult) {
                    noResult.remove();
                }
            });
        }

        // ---- Stats Card ----
        const statsCard = document.getElementById('studentStatsCard');
        if (resultsRes.status === 'success' && resultsRes.stats) {
            const s = resultsRes.stats;
            statsCard.innerHTML = `
                <div style="background:var(--glass-bg);border-radius:0.75rem;box-shadow:var(--color-shadow);padding:1.2rem 1.5rem;min-width:200px;border:1px solid var(--color-border);">
                    <div style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem;color:var(--color-text);">Your Stats</div>
                    <div style="color:var(--color-primary);font-size:1.8rem;font-weight:700;">${s.averageScore}%</div>
                    <div style="font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:0.9rem;">Average Score</div>
                    <div style="display:flex;justify-content:space-between;font-size:0.95rem;color:var(--color-text);margin-bottom:0.35rem;">
                        <span>Exams Taken</span><span><b>${s.totalExamsTaken}</b></span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.95rem;color:var(--color-text);">
                        <span>Best Score</span><span><b>${s.bestScore}%</b></span>
                    </div>
                </div>
            `;
        }

        // ---- Recent Results with Filter ----
        const studentRecentResults = document.getElementById('studentRecentResults');
        studentRecentResults.innerHTML = '';

        let allResults = [];
        if (resultsRes.status === 'success' && resultsRes.results) {
            allResults = resultsRes.results;
        }

        if (allResults.length > 0) {
            const listDiv = document.createElement('div');
            listDiv.className = 'recent-results-list';
            listDiv.id = 'attemptsListContainer';

            allResults.forEach(result => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.dataset.passed = result.score >= 60 ? 'true' : 'false';
                div.innerHTML = `
                    <div class="result-info">
                        <h4>${result.examTitle}</h4>
                        <p>${result.completedAt.split(' ')[0]}</p>
                    </div>
                    <div class="result-score">
                        <span class="score ${result.score >= 60 ? 'score-pass' : 'score-fail'}">${result.score}%</span>
                        <br>
                        <span class="date">${formatTime(result.timeTaken)}</span>
                    </div>
                `;
                listDiv.appendChild(div);
            });
            studentRecentResults.appendChild(listDiv);
        } else {
            studentRecentResults.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">No attempts yet. Take your first exam!</div>';
        }

        // ---- Bind Attempt Filter Buttons (All / Passed / Failed) ----
        bindAttemptFilters();
    }

    function bindAttemptFilters() {
        const filterAll  = document.getElementById('filterAttemptAll');
        const filterPass = document.getElementById('filterAttemptPass');
        const filterFail = document.getElementById('filterAttemptFail');
        if (!filterAll || !filterPass || !filterFail) return;

        // Clone to clear any stale listeners
        const newAll  = filterAll.cloneNode(true);
        const newPass = filterPass.cloneNode(true);
        const newFail = filterFail.cloneNode(true);
        filterAll.parentNode.replaceChild(newAll, filterAll);
        filterPass.parentNode.replaceChild(newPass, filterPass);
        filterFail.parentNode.replaceChild(newFail, filterFail);

        function applyFilter(type) {
            newAll.classList.toggle('active',  type === 'all');
            newPass.classList.toggle('active', type === 'pass');
            newFail.classList.toggle('active', type === 'fail');

            const container = document.getElementById('attemptsListContainer');
            if (!container) return;
            let visibleCount = 0;
            container.querySelectorAll('.result-item').forEach(item => {
                const passed = item.dataset.passed === 'true';
                let show = true;
                if (type === 'pass') show = passed;
                if (type === 'fail') show = !passed;
                item.style.display = show ? '' : 'none';
                if (show) visibleCount++;
            });

            const noMsg = document.getElementById('filterNoResult');
            if (visibleCount === 0) {
                if (!noMsg) {
                    const m = document.createElement('div');
                    m.id = 'filterNoResult';
                    m.style.cssText = 'padding:1.5rem;text-align:center;color:var(--color-text-secondary);';
                    m.textContent = type === 'pass' ? 'No passed attempts yet.' : 'No failed attempts.';
                    const sr = document.getElementById('studentRecentResults');
                    if (sr) sr.appendChild(m);
                }
            } else if (noMsg) {
                noMsg.remove();
            }
        }

        newAll.addEventListener('click',  () => applyFilter('all'));
        newPass.addEventListener('click', () => applyFilter('pass'));
        newFail.addEventListener('click', () => applyFilter('fail'));
    }

    // =========================================================================
    // --- TEACHER DASHBOARD ---
    // =========================================================================
    async function loadTeacherDashboard() {
        const statsRes    = await apiRequest('teacher_stats',    {}, 'GET');
        const analyticsRes= await apiRequest('teacher_analytics',{}, 'GET');
        const attemptsRes = await apiRequest('teacher_attempts', {}, 'GET');
        const studentsRes = await apiRequest('teacher_students', {}, 'GET');

        // ---- Stats Cards ----
        if (statsRes.status === 'success') {
            document.getElementById('totalExams').textContent    = statsRes.totalExams;
            document.getElementById('totalAttempts').textContent = statsRes.totalAttempts;
            document.getElementById('avgScore').textContent      = statsRes.avgScore + '%';
        }

        // ---- Recent Activity (Overview tab) ----
        const recentResultsDiv = document.getElementById('recentResults');
        recentResultsDiv.innerHTML = '';
        if (attemptsRes.status === 'success' && attemptsRes.attempts) {
            if (attemptsRes.attempts.length === 0) {
                recentResultsDiv.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;">No activity yet.</div>';
            } else {
                attemptsRes.attempts.slice(0, 6).forEach(attempt => {
                    const div = document.createElement('div');
                    div.className = 'result-item';
                    div.innerHTML = `
                        <div class="result-info">
                            <h4>${attempt.studentName}</h4>
                            <p>${attempt.examTitle}</p>
                        </div>
                        <div class="result-score">
                            <span class="score ${attempt.score >= 60 ? 'score-pass' : 'score-fail'}">${attempt.score}%</span>
                            <br>
                            <span class="date">${attempt.completedAt.split(' ')[0]}</span>
                        </div>
                    `;
                    recentResultsDiv.appendChild(div);
                });
            }
        }

        // ---- Analytics Cards (with Delete button) ----
        const analyticsDiv = document.getElementById('teacherAnalytics');
        analyticsDiv.innerHTML = `
            <h3 style="margin-bottom:1.5rem;font-size:1.15rem;font-weight:700;color:var(--color-text);display:flex;align-items:center;gap:0.6em;">
                ${ICONS.chart}
                Exam Performance Analytics
            </h3>
        `;
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1.5rem;';

        if (analyticsRes.status === 'success' && analyticsRes.analytics) {
            if (analyticsRes.analytics.length === 0) {
                grid.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;">No exams created yet.</div>';
            } else {
                analyticsRes.analytics.forEach(exam => {
                    const card = document.createElement('div');
                    card.className = 'exam-analytics-card';
                    card.innerHTML = `
                        <div style="font-weight:700;font-size:1.05rem;margin-bottom:0.25rem;display:flex;align-items:center;gap:0.5em;color:var(--color-text);">
                            ${ICONS.file} ${exam.title}
                        </div>
                        <div style="font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:0.6rem;">${exam.subject}</div>
                        <div style="display:flex;gap:1.2em;margin-bottom:0.5rem;font-size:0.92em;color:var(--color-text);">
                            <span>Attempts: <b>${exam.totalAttempts}</b></span>
                            <span>Avg: <b>${exam.averageScore}%</b></span>
                        </div>
                        <div style="height:10px;background:var(--color-border);border-radius:99px;overflow:hidden;margin-bottom:0.6rem;">
                            <div style="background:var(--color-primary);height:100%;width:${exam.averageScore}%;min-width:2px;border-radius:99px;transition:width 0.5s;"></div>
                        </div>
                        <div style="font-size:0.89em;display:flex;gap:0.8em;justify-content:space-between;color:var(--color-text);">
                            <span>High: <b style="color:var(--color-success);">${exam.highestScore}%</b></span>
                            <span>Low: <b style="color:var(--color-danger);">${exam.lowestScore}%</b></span>
                            <span>Pass: <b>${exam.passRate}%</b></span>
                        </div>
                    `;

                    // Delete Exam Button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-danger btn-small';
                    deleteBtn.style.cssText = 'margin-top:0.85rem;width:100%;font-size:0.87rem;justify-content:center;';
                    deleteBtn.innerHTML = `${ICONS.trash} Delete Exam`;
                    const examId    = exam.id;
                    const examTitle = exam.title;
                    deleteBtn.addEventListener('click', () => {
                        showCustomConfirm(
                            'Delete Exam',
                            `Permanently delete "${examTitle}"? This will also remove all student results for this exam.`,
                            async () => {
                                const res = await apiRequest('teacher_delete_exam', { examId });
                                if (res.status === 'success') {
                                    loadTeacherDashboard();
                                } else {
                                    alert(res.message || 'Failed to delete exam.');
                                }
                            }
                        );
                    });
                    card.appendChild(deleteBtn);
                    grid.appendChild(card);
                });
            }
        }
        analyticsDiv.appendChild(grid);

        // ---- Attempts Review Table ----
        const reviewDiv = document.getElementById('teacherReviewTable');
        reviewDiv.innerHTML = `
            <h3 style="margin-bottom:1.25rem;font-size:1.1rem;font-weight:700;color:var(--color-text);display:flex;align-items:center;gap:0.6em;">
                ${ICONS.fileLg} All Student Attempts
            </h3>
        `;
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'overflow-x:auto;max-height:420px;border-radius:0.7rem;box-shadow:0 1px 3px rgba(0,0,0,0.07);';

        if (attemptsRes.status === 'success' && attemptsRes.attempts && attemptsRes.attempts.length > 0) {
            const table = document.createElement('table');
            table.id = 'attemptsDataTable';
            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.95rem;';
            table.innerHTML = `
                <thead>
                    <tr style="background:var(--glass-bg);color:var(--color-text);position:sticky;top:0;z-index:1;">
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Student</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Exam</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Score</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Correct</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Time</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${attemptsRes.attempts.map(r => `
                        <tr style="background:var(--glass-bg);color:var(--color-text);" data-search="${(r.studentName + ' ' + r.examTitle).toLowerCase()}">
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${r.studentName}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${r.examTitle}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);font-weight:700;color:${r.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${r.score}%</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${r.correctAnswers}/${r.totalQuestions}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${formatTime(r.timeTaken)}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${r.completedAt.split(' ')[0]}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            tableWrap.appendChild(table);
        } else {
            tableWrap.innerHTML = '<div style="color:var(--color-text-secondary);padding:1.2rem;">No attempts submitted yet.</div>';
        }
        reviewDiv.appendChild(tableWrap);

        // Live search for attempts
        const attemptSearchInput = document.getElementById('teacherAttemptSearch');
        if (attemptSearchInput) {
            const freshInput = attemptSearchInput.cloneNode(true);
            attemptSearchInput.parentNode.replaceChild(freshInput, attemptSearchInput);
            freshInput.value = '';
            freshInput.addEventListener('input', function () {
                const q = this.value.toLowerCase().trim();
                tableWrap.querySelectorAll('tbody tr[data-search]').forEach(row => {
                    row.style.display = row.dataset.search.includes(q) ? '' : 'none';
                });
            });
        }

        // ---- Student Management Table ----
        const userMgmtDiv = document.getElementById('teacherUserMgmt');
        userMgmtDiv.innerHTML = `
            <h3 style="margin-bottom:1.25rem;font-size:1.1rem;font-weight:700;color:var(--color-text);display:flex;align-items:center;gap:0.6em;">
                ${ICONS.users} Student Accounts
            </h3>
        `;
        const userTableWrap = document.createElement('div');
        userTableWrap.style.cssText = 'overflow-x:auto;border-radius:0.7rem;box-shadow:0 1px 3px rgba(0,0,0,0.07);';

        if (studentsRes.status === 'success' && studentsRes.students && studentsRes.students.length > 0) {
            const table = document.createElement('table');
            table.id = 'studentsDataTable';
            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.95rem;';
            table.innerHTML = `
                <thead>
                    <tr style="background:var(--glass-bg);color:var(--color-text);">
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Name</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Email / Username</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Student ID</th>
                        <th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentsRes.students.map(s => `
                        <tr style="background:var(--glass-bg);color:var(--color-text);" data-search="${(s.name + ' ' + s.email + ' ' + s.userId).toLowerCase()}">
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${s.name}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${s.email}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">${s.userId}</td>
                            <td style="padding:9px 12px;border:1px solid var(--color-border);">
                                <button class="btn btn-secondary btn-small reset-pw" data-id="${s.id}" data-name="${s.name}" style="margin-right:0.4rem;">Reset Password</button>
                                <button class="btn btn-danger btn-small remove-student" data-id="${s.id}">Remove</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            userTableWrap.appendChild(table);

            // Bind reset password buttons
            table.querySelectorAll('.reset-pw').forEach(btn => {
                btn.addEventListener('click', function () {
                    const studentId   = parseInt(this.getAttribute('data-id'));
                    const studentName = this.getAttribute('data-name');

                    const modal    = document.getElementById('customResetPasswordModal');
                    const form     = document.getElementById('resetPasswordForm');
                    const input    = document.getElementById('newStudentPasswordInput');
                    const closeBtn = document.getElementById('closeResetPasswordModal');
                    const cancelBtn= document.getElementById('cancelResetPasswordBtn');
                    const titleEl  = document.getElementById('resetPasswordTitle');

                    titleEl.textContent = `Reset Password — ${studentName}`;
                    input.value = '';
                    modal.classList.remove('hidden');

                    const newForm      = form.cloneNode(true);
                    const newCloseBtn  = closeBtn.cloneNode(true);
                    const newCancelBtn = cancelBtn.cloneNode(true);
                    form.parentNode.replaceChild(newForm, form);
                    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

                    newCloseBtn.addEventListener('click',  () => modal.classList.add('hidden'));
                    newCancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

                    newForm.addEventListener('submit', async function (e) {
                        e.preventDefault();
                        const newPassword = newForm.querySelector('#newStudentPasswordInput').value;
                        if (newPassword.length < 6) {
                            alert('Password must be at least 6 characters.');
                            return;
                        }
                        const res = await apiRequest('teacher_reset_password', { studentId, newPassword });
                        if (res.status === 'success') {
                            alert('Password reset successfully.');
                            modal.classList.add('hidden');
                        } else {
                            alert(res.message || 'Failed to reset password.');
                        }
                    });
                });
            });

            // Bind remove student buttons
            table.querySelectorAll('.remove-student').forEach(btn => {
                btn.addEventListener('click', function () {
                    const studentId = parseInt(this.getAttribute('data-id'));
                    showCustomConfirm(
                        'Remove Student',
                        'Remove this student account? All their exam results will also be deleted.',
                        async () => {
                            const res = await apiRequest('teacher_remove_student', { studentId });
                            if (res.status === 'success') {
                                loadTeacherDashboard();
                            } else {
                                alert(res.message || 'Failed to remove student.');
                            }
                        }
                    );
                });
            });
        } else {
            userTableWrap.innerHTML = '<div style="color:var(--color-text-secondary);padding:1.2rem;">No student accounts registered yet.</div>';
        }
        userMgmtDiv.appendChild(userTableWrap);

        // Live search for students table
        const studentSearchInput = document.getElementById('teacherStudentSearch');
        if (studentSearchInput) {
            const freshInput = studentSearchInput.cloneNode(true);
            studentSearchInput.parentNode.replaceChild(freshInput, studentSearchInput);
            freshInput.value = '';
            freshInput.addEventListener('input', function () {
                const q = this.value.toLowerCase().trim();
                userTableWrap.querySelectorAll('tbody tr[data-search]').forEach(row => {
                    row.style.display = row.dataset.search.includes(q) ? '' : 'none';
                });
            });
        }
    }

    // =========================================================================
    // --- EXAM CREATION MODAL (Teacher) ---
    // =========================================================================
    const createExamBtn   = document.getElementById('createExamBtn');
    const createExamModal = document.getElementById('createExamModal');
    const closeModal      = document.getElementById('closeModal');
    const cancelCreate    = document.getElementById('cancelCreate');
    const createExamForm  = document.getElementById('createExamForm');
    const questionsContainer = document.getElementById('questionsContainer');
    const addQuestionBtn  = document.getElementById('addQuestionBtn');

    if (createExamBtn) {
        createExamBtn.addEventListener('click', () => {
            createExamModal.classList.remove('hidden');
            questionsContainer.innerHTML = '<label style="font-weight:600;font-size:0.95rem;color:var(--color-text-secondary);margin-bottom:0.5rem;display:block;">Questions</label>';
            addQuestionBlock();
        });
    }
    if (closeModal)    closeModal.addEventListener('click',   () => createExamModal.classList.add('hidden'));
    if (cancelCreate)  cancelCreate.addEventListener('click', () => createExamModal.classList.add('hidden'));

    function addQuestionBlock() {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.style.cssText = 'border:1.5px solid var(--color-border);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--glass-bg);';
        block.innerHTML = `
            <div class="form-group">
                <label>Question Text</label>
                <input type="text" class="form-input question-input" required placeholder="Enter question...">
            </div>
            <div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                <input type="text" class="form-input option-input" placeholder="Option A" required>
                <input type="text" class="form-input option-input" placeholder="Option B" required>
                <input type="text" class="form-input option-input" placeholder="Option C" required>
                <input type="text" class="form-input option-input" placeholder="Option D" required>
            </div>
            <div class="form-group">
                <label>Correct Option (1=A, 2=B, 3=C, 4=D)</label>
                <input type="number" class="form-input correct-input" min="1" max="4" value="1" required>
            </div>
            <button type="button" class="btn btn-danger btn-small remove-question">Remove Question</button>
        `;
        block.querySelector('.remove-question').addEventListener('click', () => block.remove());
        questionsContainer.appendChild(block);
    }
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', addQuestionBlock);

    if (createExamForm) {
        createExamForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const title    = document.getElementById('examTitleInput').value.trim();
            const duration = parseInt(document.getElementById('examDuration').value);
            const subject  = document.getElementById('examSubject').value.trim();
            const questions = [];

            questionsContainer.querySelectorAll('.question-block').forEach(block => {
                const qText   = block.querySelector('.question-input').value.trim();
                const opts    = Array.from(block.querySelectorAll('.option-input')).map(i => i.value.trim());
                const correct = parseInt(block.querySelector('.correct-input').value) - 1;
                if (qText && opts.every(o => o) && correct >= 0 && correct < 4) {
                    questions.push({ question: qText, options: opts, correctAnswer: correct });
                }
            });

            if (!title || !subject || duration <= 0 || questions.length === 0) {
                alert('Please fill in exam details and add at least one complete question.');
                return;
            }

            const res = await apiRequest('teacher_create_exam', { title, subject, duration, questions });
            if (res.status === 'success') {
                alert('Exam created successfully!');
                createExamModal.classList.add('hidden');
                loadTeacherDashboard();
            } else {
                alert(res.message || 'Failed to create exam.');
            }
        });
    }

    // =========================================================================
    // --- EXAM TAKING INTERFACE ---
    // =========================================================================
    let currentExam = null;
    let currentExamAnswers = [];
    let currentExamFlags   = [];
    let currentExamIndex   = 0;
    let currentExamStartTime = 0;
    let examTimerInterval  = null;

    let warningsCount = 0;
    function preventDefaultAction(e) { e.preventDefault(); }
    function handleWindowBlur() {
        if (!currentExam) return;
        warningsCount++;
        alert(`Security Warning #${warningsCount}: You navigated away from the active exam. Three violations trigger automatic submission.`);
        if (warningsCount >= 3) {
            alert('Automatic submission triggered due to repeated focus/tab violations.');
            submitExam();
        }
    }
    function handleVisibilityChange() {
        if (document.hidden) handleWindowBlur();
    }
    function enableExamProtection() {
        warningsCount = 0;
        document.addEventListener('contextmenu',  preventDefaultAction);
        document.addEventListener('copy',         preventDefaultAction);
        document.addEventListener('cut',          preventDefaultAction);
        document.addEventListener('paste',        preventDefaultAction);
        document.addEventListener('selectstart',  preventDefaultAction);
        window.addEventListener('blur',           handleWindowBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    function disableExamProtection() {
        document.removeEventListener('contextmenu',  preventDefaultAction);
        document.removeEventListener('copy',         preventDefaultAction);
        document.removeEventListener('cut',          preventDefaultAction);
        document.removeEventListener('paste',        preventDefaultAction);
        document.removeEventListener('selectstart',  preventDefaultAction);
        window.removeEventListener('blur',           handleWindowBlur);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    async function startExam(examId) {
        const res = await apiRequest('get_exam', { examId }, 'GET');
        if (res.status === 'error' || !res.exam) {
            alert(res.message || 'Failed to load exam.');
            return;
        }

        currentExam = res.exam;
        const total = currentExam.questions.length;
        currentExamAnswers = Array(total).fill(null);
        currentExamFlags   = Array(total).fill(false);

        if (res.progress) {
            currentExam.questions.forEach((q, idx) => {
                if (res.progress[q.id]) {
                    currentExamAnswers[idx] = res.progress[q.id].selectedAnswer;
                    currentExamFlags[idx]   = res.progress[q.id].isFlagged;
                }
            });
        }

        currentExamIndex     = 0;
        currentExamStartTime = Date.now();

        document.getElementById('candidateName').textContent    = currentUser.name;
        document.getElementById('candidateId').textContent      = currentUser.userId;
        document.getElementById('examSubjectName').textContent  = currentExam.subject;
        document.getElementById('examTitle').textContent        = currentExam.title;

        dashboard.classList.add('hidden');
        document.getElementById('examInterface').classList.remove('hidden');
        const navbar = document.querySelector('.navbar');
        const footer = document.querySelector('.site-footer');
        if (navbar) navbar.classList.add('hidden');
        if (footer) footer.classList.add('hidden');

        enableExamProtection();
        startExamTimer(currentExam.duration * 60);
        renderQuestion();
        renderQuestionsGrid();
    }

    function startExamTimer(durationSeconds) {
        clearInterval(examTimerInterval);
        let timeRemaining = durationSeconds;
        function updateTimerDisplay() {
            if (timeRemaining < 0) {
                clearInterval(examTimerInterval);
                document.getElementById('examTimer').textContent = '00:00';
                autoSubmitExam();
                return;
            }
            const min = Math.floor(timeRemaining / 60);
            const sec = timeRemaining % 60;
            document.getElementById('examTimer').textContent =
                `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
            if (timeRemaining <= 60) {
                document.getElementById('examTimer').style.color = 'var(--color-danger)';
            }
            timeRemaining--;
        }
        updateTimerDisplay();
        examTimerInterval = setInterval(updateTimerDisplay, 1000);
    }

    function renderQuestion() {
        const q = currentExam.questions[currentExamIndex];
        const container = document.getElementById('questionContainer');
        container.innerHTML = `
            <div class="question-header-strip">
                <span class="question-number-label">Question ${currentExamIndex + 1} of ${currentExam.questions.length}</span>
                <span class="question-points">(${q.points || 1} Point)</span>
            </div>
            <div class="question-text">${q.question}</div>
            <div class="options-list">
                ${q.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isChecked = currentExamAnswers[currentExamIndex] === i ? 'checked' : '';
                    return `
                        <label class="option-item ${isChecked ? 'selected' : ''}">
                            <input type="radio" name="optionRadio" value="${i}" ${isChecked}>
                            <span class="option-letter">${letter}</span>
                            <span class="option-text-content">${opt}</span>
                        </label>
                    `;
                }).join('')}
            </div>
        `;

        container.querySelectorAll('input[name="optionRadio"]').forEach(radio => {
            radio.addEventListener('change', async function () {
                const answer = parseInt(this.value);
                currentExamAnswers[currentExamIndex] = answer;
                container.querySelectorAll('.option-item').forEach(lbl => lbl.classList.remove('selected'));
                this.closest('.option-item').classList.add('selected');
                const questionId = currentExam.questions[currentExamIndex].id;
                await apiRequest('save_answer', { examId: currentExam.id, questionId, selectedAnswer: answer });
                updateQuestionsGridItem(currentExamIndex);
            });
        });

        document.getElementById('prevBtn').disabled = currentExamIndex === 0;
        const nextBtn = document.getElementById('nextBtn');
        if (currentExamIndex === currentExam.questions.length - 1) {
            nextBtn.textContent = 'Submit Exam';
            nextBtn.className   = 'btn btn-success';
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.className   = 'btn btn-primary';
        }

        const flagBtn = document.getElementById('flagBtn');
        if (currentExamFlags[currentExamIndex]) {
            flagBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/></svg> Unflag`;
            flagBtn.className = 'btn btn-warning';
        } else {
            flagBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg> Flag`;
            flagBtn.className = 'btn btn-warning-outline';
        }
    }

    document.getElementById('flagBtn').addEventListener('click', async function () {
        if (!currentExam) return;
        const newFlagState = !currentExamFlags[currentExamIndex];
        currentExamFlags[currentExamIndex] = newFlagState;
        const questionId = currentExam.questions[currentExamIndex].id;
        await apiRequest('toggle_flag', {
            examId: currentExam.id,
            questionId,
            isFlagged: newFlagState ? 1 : 0
        });
        renderQuestion();
        updateQuestionsGridItem(currentExamIndex);
    });

    document.getElementById('prevBtn').addEventListener('click', function () {
        if (currentExamIndex > 0) {
            currentExamIndex--;
            renderQuestion();
            highlightActiveGridItem();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', function () {
        if (currentExamIndex < currentExam.questions.length - 1) {
            currentExamIndex++;
            renderQuestion();
            highlightActiveGridItem();
        } else {
            confirmAndSubmit();
        }
    });

    function renderQuestionsGrid() {
        const grid = document.getElementById('questionsMapGrid');
        grid.innerHTML = '';
        currentExam.questions.forEach((_, idx) => {
            const cell = document.createElement('button');
            cell.className = 'grid-cell-btn';
            cell.innerHTML = `<span class="cell-num">${idx + 1}</span><span class="cell-shading"></span><span class="cell-flag-dot"></span>`;
            cell.addEventListener('click', function () {
                currentExamIndex = idx;
                renderQuestion();
                highlightActiveGridItem();
            });
            grid.appendChild(cell);
            updateQuestionsGridItem(idx);
        });
        highlightActiveGridItem();
    }

    function updateQuestionsGridItem(idx) {
        const grid = document.getElementById('questionsMapGrid');
        const cell = grid.children[idx];
        if (!cell) return;
        cell.classList.toggle('answered', currentExamAnswers[idx] !== null);
        cell.classList.toggle('flagged',  currentExamFlags[idx]);
    }

    function highlightActiveGridItem() {
        const grid = document.getElementById('questionsMapGrid');
        Array.from(grid.children).forEach((cell, idx) => {
            cell.classList.toggle('active', idx === currentExamIndex);
        });
    }

    function confirmAndSubmit() {
        const unanswered = currentExamAnswers.filter(a => a === null).length;
        const msg = unanswered > 0
            ? `You have ${unanswered} unanswered question(s). Submit anyway?`
            : 'Are you sure you want to submit your exam?';
        showCustomConfirm('Submit Exam', msg, () => submitExam());
    }

    async function autoSubmitExam() {
        alert('Time is up! Your exam is being submitted automatically.');
        submitExam();
    }

    async function submitExam() {
        clearInterval(examTimerInterval);
        disableExamProtection();
        const timeTaken = Math.floor((Date.now() - currentExamStartTime) / 1000);
        const res = await apiRequest('submit_exam', { examId: currentExam.id, timeTaken });

        if (res.status === 'success') {
            document.getElementById('finalScore').textContent    = res.score + '%';
            document.getElementById('correctAnswers').textContent= `${res.correctAnswers}/${res.totalQuestions}`;
            document.getElementById('timeTaken').textContent     = formatTime(res.timeTaken);

            document.getElementById('examInterface').classList.add('hidden');
            const rp = document.getElementById('resultsPage');
            rp.classList.remove('hidden');
            rp.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(20,20,20,0.82);z-index:10000;display:flex;align-items:center;justify-content:center;';
            document.body.style.overflow = 'hidden';
        } else {
            alert(res.message || 'Failed to submit exam.');
        }
    }

    document.getElementById('backToDashboard').addEventListener('click', function () {
        const rp = document.getElementById('resultsPage');
        rp.classList.add('hidden');
        rp.removeAttribute('style');
        document.body.style.overflow = '';
        currentExam = null;
        loadStudentDashboard();
        dashboard.classList.remove('hidden');
    });

    // =========================================================================
    // --- ABOUT MODAL ---
    // =========================================================================
    const aboutBtn     = document.getElementById('aboutBtn');
    const aboutOverlay = document.getElementById('aboutOverlay');
    const closeAbout   = document.getElementById('closeAbout');
    if (aboutBtn && aboutOverlay && closeAbout) {
        aboutBtn.addEventListener('click',  () => aboutOverlay.classList.remove('hidden'));
        closeAbout.addEventListener('click',() => aboutOverlay.classList.add('hidden'));
        aboutOverlay.addEventListener('click', e => {
            if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden');
        });
    }
    const mainAboutBtn = document.getElementById('mainAboutBtn');
    if (mainAboutBtn && aboutOverlay) {
        mainAboutBtn.addEventListener('click', () => aboutOverlay.classList.remove('hidden'));
    }

    // =========================================================================
    // --- THEME TOGGLE ---
    // =========================================================================
    function setTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }
    if (themeToggle) themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark-mode')));
    const mainThemeToggle = document.getElementById('mainThemeToggle');
    if (mainThemeToggle) mainThemeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark-mode')));
    setTheme(localStorage.getItem('theme') === 'dark');

    // =========================================================================
    // --- PASSWORD VISIBILITY ---
    // =========================================================================
    const authPassword       = document.getElementById('authPassword');
    const toggleAuthPassword = document.getElementById('toggleAuthPassword');
    if (authPassword && toggleAuthPassword) {
        toggleAuthPassword.addEventListener('click', function () {
            const eyeIcon = document.getElementById('eyeIcon');
            if (authPassword.type === 'password') {
                authPassword.type = 'text';
                if (eyeIcon) eyeIcon.setAttribute('fill', '#81b8e7');
            } else {
                authPassword.type = 'password';
                if (eyeIcon) eyeIcon.setAttribute('fill', '#1A508B');
            }
        });
    }

    // =========================================================================
    // --- SIDEBAR NAVIGATION ---
    // =========================================================================
    document.querySelectorAll('#studentNav .menu-item').forEach(btn => {
        btn.addEventListener('click', function () {
            switchTab('student', this.getAttribute('data-tab'));
        });
    });
    document.querySelectorAll('#teacherNav .menu-item').forEach(btn => {
        btn.addEventListener('click', function () {
            switchTab('teacher', this.getAttribute('data-tab'));
        });
    });

    // =========================================================================
    // --- INIT ---
    // =========================================================================
    checkAuthStatus();
});
