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

    // --- Global Search Cache — populated when each dashboard loads,
    //     consumed by the top-bar search box for quick filtering. ---
    let searchCache = {
        exams: [],      // visible exams (student view) OR all exams (teacher view)
        students: [],   // teacher view only
        attempts: []    // both views (recent attempts / own attempts)
    };

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
        // Reset to login mode
        setAuthMode(true);
    }

    function hideAuthModal() {
        authModal.classList.add('hidden');
        dashboard.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
    }

    // Set auth mode (true = login, false = signup) and update all UI elements
    function setAuthMode(loginMode) {
        isLoginMode = loginMode;
        const titleEl    = document.getElementById('authTitle');
        const subtitleEl = document.getElementById('authSubtitle');
        const submitText = document.getElementById('authSubmitText');
        const demoHint   = document.getElementById('authDemoHint');
        const signupFlds = document.getElementById('signupFields');
        const tabLogin   = document.getElementById('authTabLogin');
        const tabSignup  = document.getElementById('authTabSignup');

        if (loginMode) {
            if (titleEl)    titleEl.textContent = 'Welcome back';
            if (subtitleEl) subtitleEl.textContent = 'Sign in to your account to continue';
            if (submitText) submitText.textContent = 'Sign In';
            if (demoHint)   demoHint.style.display = 'flex';
            if (signupFlds) signupFlds.classList.add('hidden');
            if (tabLogin)   tabLogin.classList.add('active');
            if (tabSignup)  tabSignup.classList.remove('active');
        } else {
            if (titleEl)    titleEl.textContent = 'Create your account';
            if (subtitleEl) subtitleEl.textContent = 'Sign up as a student to start taking exams';
            if (submitText) submitText.textContent = 'Create Account';
            if (demoHint)   demoHint.style.display = 'none';
            if (signupFlds) signupFlds.classList.remove('hidden');
            if (tabLogin)   tabLogin.classList.remove('active');
            if (tabSignup)  tabSignup.classList.add('active');
        }
    }

    // Wire up the Login / Sign Up tabs
    const authTabLogin  = document.getElementById('authTabLogin');
    const authTabSignup = document.getElementById('authTabSignup');
    if (authTabLogin)  authTabLogin.addEventListener('click',  () => { setAuthMode(true);  authForm.reset(); });
    if (authTabSignup) authTabSignup.addEventListener('click', () => { setAuthMode(false); authForm.reset(); });

    // Keep the hidden switchAuthMode button working for any legacy code
    if (switchAuthMode) {
        switchAuthMode.addEventListener('click', function (e) {
            e.preventDefault();
            setAuthMode(!isLoginMode);
            authForm.reset();
        });
    }

    // ---- Login / Signup submit ----
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

    function showToast(message, type = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;
                display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;
            `;
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        const bg = type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)';
        toast.style.cssText = `
            background:${bg};color:#fff;padding:0.65rem 1.2rem;border-radius:0.65rem;
            font-size:0.9rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);
            transform:translateY(8px);opacity:0;transition:all 0.25s;pointer-events:auto;
            font-family:'Plus Jakarta Sans','Inter',sans-serif;
        `;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
        setTimeout(() => {
            toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
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
            'student-exams':        { title: 'Available Exams',      subtitle: 'Select an exam and test your knowledge' },
            'student-history':      { title: 'My Performance',       subtitle: 'Track your progress and attempt history' },
            'student-leaderboard':  { title: 'Leaderboard',          subtitle: 'See how you rank against other students' },
            'student-calendar':     { title: 'Calendar',             subtitle: 'Upcoming exams and your attempt history' },
            'student-settings':     { title: 'Profile Settings',     subtitle: 'Update your name, avatar and password' },
            'teacher-overview':     { title: 'Dashboard Overview',   subtitle: 'Real-time statistics and recent activity summary' },
            'teacher-exams':        { title: 'Exam Settings',        subtitle: 'Create, analyse and manage examinations' },
            'teacher-students':     { title: 'Student Accounts',     subtitle: 'Manage student registrations and credentials' },
            'teacher-attempts':     { title: 'Review Attempts',      subtitle: 'Inspect student exam papers and results' },
            'teacher-bank':         { title: 'Question Bank',        subtitle: 'Manage reusable questions for any exam' },
            'teacher-groups':       { title: 'Class Groups',         subtitle: 'Organise students into groups and assign exams' },
            'teacher-settings':     { title: 'Profile Settings',     subtitle: 'Update your name, avatar and password' },
        };
        if (titles[tabId] && mainContentTitle && mainContentSubtitle) {
            mainContentTitle.textContent = titles[tabId].title;
            mainContentSubtitle.textContent = titles[tabId].subtitle;
        }

        // Lazy-load tab content
        if (tabId === 'student-leaderboard')  loadLeaderboard();
        if (tabId === 'student-calendar')     loadCalendar();
        if (tabId === 'student-settings')     loadSettingsPanel('student');
        if (tabId === 'teacher-bank')         loadTeacherBank();
        if (tabId === 'teacher-groups')       loadTeacherGroups();
        if (tabId === 'teacher-settings')     loadSettingsPanel('teacher');
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

        // Refresh global search cache (student side)
        searchCache.exams     = (examsRes.status === 'success' && examsRes.exams) ? examsRes.exams : [];
        searchCache.attempts  = (resultsRes.status === 'success' && resultsRes.results) ? resultsRes.results : [];
        searchCache.students  = [];

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
                        <div style="display:flex;gap:0.5rem;margin-top:0.25rem;">
                            <button class="btn btn-primary btn-full start-exam-btn" data-id="${exam.id}" style="flex:1;">Start Exam</button>
                            <button class="btn btn-secondary practice-btn" data-id="${exam.id}" title="Practice Mode — instant feedback, not saved" style="flex:0 0 auto;padding:0.6rem 0.85rem;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                            </button>
                        </div>
                    `;
                    examsList.appendChild(card);
                });

                examsList.querySelectorAll('.start-exam-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        startExam(parseInt(this.getAttribute('data-id')));
                    });
                });
                examsList.querySelectorAll('.practice-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        startPractice(parseInt(this.getAttribute('data-id')));
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

        // ---- Stats Card (4-card grid + subject breakdown) ----
        const statsCard = document.getElementById('studentStatsCard');
        if (resultsRes.status === 'success' && resultsRes.stats) {
            const s = resultsRes.stats;

            const statCards = [
                { icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`, value: s.totalExamsTaken, label: 'Exams Taken' },
                { icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`, value: s.averageScore + '%', label: 'Average Score' },
                { icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`, value: s.bestScore + '%', label: 'Best Score' },
                { icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`, value: (s.passRate || 0) + '%', label: 'Pass Rate' }
            ];

            let statsHTML = '<div class="student-perf-stats-grid">';
            statCards.forEach(sc => {
                statsHTML += `
                    <div class="perf-stat-card">
                        <div class="perf-stat-icon">${sc.icon}</div>
                        <div class="perf-stat-body">
                            <div class="perf-stat-num">${sc.value}</div>
                            <div class="perf-stat-lbl">${sc.label}</div>
                        </div>
                    </div>`;
            });
            statsHTML += '</div>';

            // Subject breakdown
            if (resultsRes.subjectStats && resultsRes.subjectStats.length > 0) {
                statsHTML += '<div class="subject-breakdown-section">';
                statsHTML += '<div class="subject-breakdown-title">Performance by Subject</div>';
                resultsRes.subjectStats.forEach(sub => {
                    const avg = sub.avgScore || 0;
                    const barColor = avg >= 75 ? 'var(--color-success)' : avg >= 50 ? '#f59e0b' : 'var(--color-danger)';
                    statsHTML += `
                        <div class="subject-bar-row">
                            <div class="subject-bar-name" title="${sub.subject}">${sub.subject}</div>
                            <div class="subject-bar-track">
                                <div class="subject-bar-fill" style="width:${avg}%;background:${barColor};"></div>
                            </div>
                            <div class="subject-bar-pct">${avg}%</div>
                        </div>`;
                });
                statsHTML += '</div>';
            }

            statsCard.innerHTML = statsHTML;
        }

        // ---- Badges & Achievements Showcase ----
        renderBadgesSection(resultsRes);

        // ---- Recent Results with Filter ----
        const studentRecentResults = document.getElementById('studentRecentResults');
        studentRecentResults.innerHTML = '';

        let allResults = [];
        if (resultsRes.status === 'success' && resultsRes.results) {
            allResults = resultsRes.results;
        }

        if (allResults.length > 0) {
            const listDiv = document.createElement('div');
            listDiv.className = 'recent-results-list-v2';
            listDiv.id = 'attemptsListContainer';
            listDiv.style.cssText = 'display:flex;flex-direction:column;gap:0.55rem;';

            allResults.forEach((result, idx) => {
                const div = document.createElement('div');
                div.className = 'attempt-card-v2 ' + (result.score >= 60 ? 'is-pass' : 'is-fail');
                div.dataset.passed = result.score >= 60 ? 'true' : 'false';

                // Donut ring SVG (mini score ring on each card)
                const score = parseInt(result.score) || 0;
                const r = 22;
                const circ = 2 * Math.PI * r;
                const dashOffset = circ - (score / 100) * circ;
                const ringColor = score >= 75 ? '#2ecc71' : score >= 60 ? '#3498db' : '#e74c3c';

                // Score trend chip (first attempt has no trend)
                const isLatest = idx === 0;
                const prevScore = idx < allResults.length - 1 ? parseInt(allResults[idx + 1].score) : null;
                let trendHTML = '';
                if (prevScore !== null && !isNaN(prevScore)) {
                    const delta = score - prevScore;
                    if (delta > 0)       trendHTML = `<span class="attempt-trend trend-up">▲ +${delta}</span>`;
                    else if (delta < 0)  trendHTML = `<span class="attempt-trend trend-down">▼ ${delta}</span>`;
                    else                 trendHTML = `<span class="attempt-trend trend-flat">═ 0</span>`;
                }

                div.innerHTML = `
                    <div class="acv-rank">#${idx + 1}</div>
                    <div class="acv-ring-wrap">
                        <svg class="acv-ring" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--color-border)" stroke-width="5"/>
                            <circle cx="28" cy="28" r="${r}" fill="none" stroke="${ringColor}" stroke-width="5"
                                stroke-linecap="round"
                                stroke-dasharray="${circ}"
                                stroke-dashoffset="${dashOffset}"
                                transform="rotate(-90 28 28)"/>
                        </svg>
                        <div class="acv-ring-pct" style="color:${ringColor};">${score}<span class="acv-pct-sym">%</span></div>
                    </div>
                    <div class="acv-main">
                        <div class="acv-title-row">
                            <span class="acv-title">${escapeHtmlNotif(result.examTitle)}</span>
                            ${isLatest ? '<span class="acv-latest-pill">Latest</span>' : ''}
                        </div>
                        <div class="acv-meta-row">
                            <span class="acv-meta-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                ${(result.completedAt || '').split(' ')[0]}
                            </span>
                            <span class="acv-meta-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
                                ${result.correctAnswers}/${result.totalQuestions} correct
                            </span>
                            <span class="acv-meta-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${formatTime(result.timeTaken)}
                            </span>
                            ${trendHTML}
                        </div>
                    </div>
                    <div class="acv-actions">
                        <div class="acv-status-pill ${result.score >= 60 ? 'pass' : 'fail'}">
                            ${result.score >= 60 ? '✓ Passed' : '✗ Failed'}
                        </div>
                        <button class="btn btn-secondary btn-small acv-review-btn" data-result-id="${result.id}" title="View full results">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Review
                        </button>
                    </div>
                `;
                listDiv.appendChild(div);
            });
            studentRecentResults.appendChild(listDiv);

            // Wire Review buttons — open past attempt
            listDiv.querySelectorAll('.acv-review-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    openPastAttempt(parseInt(btn.dataset.resultId));
                });
            });
        } else {
            studentRecentResults.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);font-size:0.95rem;">No attempts yet. Take your first exam!</div>';
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
            container.querySelectorAll('.attempt-card-v2').forEach(item => {
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

        // Refresh global search cache (teacher side)
        searchCache.exams     = (analyticsRes.status === 'success' && analyticsRes.analytics) ? analyticsRes.analytics : [];
        searchCache.attempts  = (attemptsRes.status  === 'success' && attemptsRes.attempts)   ? attemptsRes.attempts   : [];
        searchCache.students  = (studentsRes.status  === 'success' && studentsRes.students)  ? studentsRes.students  : [];

        // ---- CSV Export: populate exam filter + wire button ----
        const csvExamFilter = document.getElementById('csvExamFilter');
        const csvExportBtn  = document.getElementById('csvExportBtn');
        if (csvExamFilter && analyticsRes.status === 'success') {
            const cur = csvExamFilter.value;
            csvExamFilter.innerHTML = '<option value="0">All Exams</option>';
            (analyticsRes.analytics || []).forEach(e => {
                const o = document.createElement('option');
                o.value = e.id; o.textContent = e.title;
                csvExamFilter.appendChild(o);
            });
            csvExamFilter.value = cur;
        }
        function updateCsvLink() {
            if (!csvExportBtn) return;
            const eid  = csvExamFilter ? csvExamFilter.value : '0';
            const from = document.getElementById('csvDateFrom')?.value || '';
            const to   = document.getElementById('csvDateTo')?.value   || '';
            let url = 'api.php?action=teacher_export_csv';
            if (eid && eid !== '0') url += `&examId=${eid}`;
            if (from) url += `&dateFrom=${from}`;
            if (to)   url += `&dateTo=${to}`;
            csvExportBtn.href = url;
        }
        updateCsvLink();
        ['csvExamFilter','csvDateFrom','csvDateTo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { const clone = el.cloneNode(true); el.parentNode.replaceChild(clone, el); clone.addEventListener('change', updateCsvLink); }
        });

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

        // Loading state — shown immediately, replaced when data arrives
        if (analyticsDiv) {
            analyticsDiv.innerHTML = `
                <div class="analytics-loading-state">
                    <div class="als-spinner"></div>
                    <div class="als-text">Loading analytics…</div>
                </div>
            `;
        }

        // Compute overall stats summary
        let totalExamsCount   = 0;
        let totalAttemptsSum  = 0;
        let overallAvg        = 0;
        let overallPassRate   = 0;
        if (analyticsRes.status === 'success' && analyticsRes.analytics) {
            totalExamsCount = analyticsRes.analytics.length;
            analyticsRes.analytics.forEach(e => {
                totalAttemptsSum += (e.totalAttempts || 0);
            });
            const withAttempts = analyticsRes.analytics.filter(e => e.totalAttempts > 0);
            if (withAttempts.length > 0) {
                overallAvg = Math.round(withAttempts.reduce((s, e) => s + (e.averageScore || 0), 0) / withAttempts.length);
                overallPassRate = Math.round(withAttempts.reduce((s, e) => s + (e.passRate || 0), 0) / withAttempts.length);
            }
        }

        // Build header + summary banner
        if (analyticsDiv) {
            const apiError = analyticsRes.status !== 'success';
            const isEmpty  = (!apiError) && totalExamsCount === 0;

            if (apiError) {
                analyticsDiv.innerHTML = `
                    <div class="analytics-error-state">
                        <div class="aes-icon">⚠</div>
                        <div class="aes-title">Failed to load analytics</div>
                        <div class="aes-desc">${analyticsRes.message || 'The server did not respond correctly. Try refreshing the page.'}</div>
                        <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
                    </div>
                `;
            } else if (isEmpty) {
                analyticsDiv.innerHTML = `
                    <div class="analytics-empty-state">
                        <div class="aems-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        </div>
                        <div class="aems-title">No exams created yet</div>
                        <div class="aems-desc">You haven't created any exams. Click the button below to build your first exam — it only takes a minute.</div>
                        <button id="emptyStateCreateBtn" class="btn btn-primary" style="margin-top:0.8rem;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Create Your First Exam
                        </button>
                    </div>
                `;
                const emptyBtn = document.getElementById('emptyStateCreateBtn');
                if (emptyBtn) emptyBtn.addEventListener('click', () => createExamBtn && createExamBtn.click());
            } else {
                // Non-empty state: header + summary banner + grid (grid appended below)
                analyticsDiv.innerHTML = `
                    <div class="analytics-page-header">
                        <div class="aph-left">
                            <h3 class="aph-title">
                                ${ICONS.chart} Exam Performance Analytics
                            </h3>
                            <span class="aph-count">${totalExamsCount} exam${totalExamsCount === 1 ? '' : 's'} · ${totalAttemptsSum} total attempt${totalAttemptsSum === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                    <div class="analytics-summary-banner">
                        <div class="asb-card">
                            <div class="asb-icon asb-icon-exams">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div class="asb-body">
                                <div class="asb-val">${totalExamsCount}</div>
                                <div class="asb-lbl">Total Exams</div>
                            </div>
                        </div>
                        <div class="asb-card">
                            <div class="asb-icon asb-icon-attempts">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                            </div>
                            <div class="asb-body">
                                <div class="asb-val">${totalAttemptsSum}</div>
                                <div class="asb-lbl">Total Attempts</div>
                            </div>
                        </div>
                        <div class="asb-card">
                            <div class="asb-icon asb-icon-avg">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            </div>
                            <div class="asb-body">
                                <div class="asb-val">${overallAvg}%</div>
                                <div class="asb-lbl">Overall Avg Score</div>
                            </div>
                        </div>
                        <div class="asb-card">
                            <div class="asb-icon asb-icon-pass">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div class="asb-body">
                                <div class="asb-val" style="color:${overallPassRate >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${overallPassRate}%</div>
                                <div class="asb-lbl">Overall Pass Rate</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // Only build the grid if we have data (skip on error/empty states)
        if (analyticsRes.status === 'success' && analyticsRes.analytics && analyticsRes.analytics.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'analytics-cards-grid';

            analyticsRes.analytics.forEach(exam => {
                const card = document.createElement('div');
                card.className = 'exam-analytics-card';

                const avgPct = exam.averageScore || 0;
                const passRate = exam.passRate || 0;
                const barClass = avgPct >= 75 ? 'bar-high' : avgPct >= 50 ? 'bar-mid' : 'bar-low';
                const diffColor = { Easy: 'var(--color-success)', Medium: '#f59e0b', Hard: 'var(--color-danger)' }[exam.difficulty] || 'var(--color-primary)';
                const hasAttempts = exam.totalAttempts > 0;

                // Mini sparkline of pass rate vs avg score
                card.innerHTML = `
                    <div class="eac-header">
                        <div class="eac-title-row">
                            <span class="eac-diff-dot" style="background:${diffColor};" title="${exam.difficulty}"></span>
                            <span class="eac-title" title="${exam.title}">${exam.title}</span>
                        </div>
                        <div class="eac-meta-row">
                            <span class="eac-chip">${exam.subject}</span>
                            <span class="eac-chip" style="color:${diffColor};background:${diffColor}18;">${exam.difficulty}</span>
                            <span class="eac-chip">${exam.totalQuestions}Q · ${exam.duration}min</span>
                            ${!hasAttempts ? '<span class="eac-chip eac-chip-muted">No attempts yet</span>' : ''}
                        </div>
                    </div>
                    <div class="eac-score-section">
                        <div class="eac-score-circle" style="--score-color:${avgPct >= 75 ? '#2ecc71' : avgPct >= 50 ? '#f59e0b' : '#e74c3c'};">
                            <svg viewBox="0 0 60 60" class="eac-score-svg">
                                <circle cx="30" cy="30" r="24" fill="none" stroke="var(--color-border)" stroke-width="6"/>
                                <circle cx="30" cy="30" r="24" fill="none" stroke="var(--score-color)" stroke-width="6"
                                    stroke-linecap="round"
                                    stroke-dasharray="${2 * Math.PI * 24}"
                                    stroke-dashoffset="${2 * Math.PI * 24 - (avgPct / 100) * 2 * Math.PI * 24}"
                                    transform="rotate(-90 30 30)"/>
                            </svg>
                            <div class="eac-score-pct">${avgPct}<span class="eac-pct-sym">%</span></div>
                            <div class="eac-score-lbl">Avg</div>
                        </div>
                        <div class="eac-stats-trio">
                            <div class="eac-stat-mini">
                                <div class="val">${exam.totalAttempts}</div>
                                <div class="lbl">Attempts</div>
                            </div>
                            <div class="eac-stat-mini">
                                <div class="val" style="color:var(--color-success);">${hasAttempts ? exam.highestScore + '%' : '—'}</div>
                                <div class="lbl">Best</div>
                            </div>
                            <div class="eac-stat-mini">
                                <div class="val" style="color:${passRate >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${hasAttempts ? passRate + '%' : '—'}</div>
                                <div class="lbl">Pass Rate</div>
                            </div>
                        </div>
                    </div>
                    <div class="eac-action-row">
                        <button class="btn btn-secondary btn-small eac-preview-btn" title="Preview this exam as a student would see it">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Preview
                        </button>
                        <button class="btn btn-secondary btn-small eac-analytics-btn" title="View per-question analytics">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            Analytics
                        </button>
                        <button class="btn btn-secondary btn-small eac-edit-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                        <button class="btn btn-danger btn-small eac-delete-btn">
                            ${ICONS.trash} Delete
                        </button>
                    </div>
                `;

                // Wire Preview button
                const previewBtn = card.querySelector('.eac-preview-btn');
                if (previewBtn) previewBtn.addEventListener('click', () => previewExam(exam.id));

                // Wire Analytics button
                const analyticsBtn = card.querySelector('.eac-analytics-btn');
                if (analyticsBtn) analyticsBtn.addEventListener('click', () => openQuestionAnalytics(exam.id, exam.title));

                // Wire Edit + Delete buttons
                const editBtn = card.querySelector('.eac-edit-btn');
                if (editBtn) editBtn.addEventListener('click', () => openEditExam(exam.id));

                const deleteBtn = card.querySelector('.eac-delete-btn');
                if (deleteBtn) {
                    const examId    = exam.id;
                    const examTitle = exam.title;
                    deleteBtn.addEventListener('click', () => {
                        showCustomConfirm(
                            'Delete Exam',
                            `Permanently delete "${examTitle}"? This will also remove all student results for this exam.`,
                            async () => {
                                const res = await apiRequest('teacher_delete_exam', { examId });
                                if (res.status === 'success') {
                                    showToast('Exam deleted.', 'success');
                                    loadTeacherDashboard();
                                } else {
                                    alert(res.message || 'Failed to delete exam.');
                                }
                            }
                        );
                    });
                }

                grid.appendChild(card);
            });
            analyticsDiv.appendChild(grid);
        }

        // ---- Attempts Review Table ----
        const reviewDiv = document.getElementById('teacherReviewTable');
        reviewDiv.innerHTML = `
            <h3 style="margin-bottom:1.25rem;font-size:1.1rem;font-weight:700;color:var(--color-text);display:flex;align-items:center;gap:0.6em;">
                ${ICONS.fileLg} All Student Attempts
            </h3>
        `;
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'overflow:auto;max-height:55vh;border-radius:0.7rem;box-shadow:0 1px 3px rgba(0,0,0,0.07);';

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
        userTableWrap.style.cssText = 'overflow:auto;max-height:55vh;border-radius:0.7rem;box-shadow:0 1px 3px rgba(0,0,0,0.07);';

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
                            <td style="padding:9px 12px;border:1px solid var(--color-border);white-space:nowrap;">
                                <button class="btn btn-primary btn-small view-profile" data-id="${s.id}" data-name="${s.name}" style="margin-right:0.4rem;">View Profile</button>
                                <button class="btn btn-secondary btn-small reset-pw" data-id="${s.id}" data-name="${s.name}" style="margin-right:0.4rem;">Reset Password</button>
                                <button class="btn btn-danger btn-small remove-student" data-id="${s.id}">Remove</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            userTableWrap.appendChild(table);

            // Bind View Profile buttons
            table.querySelectorAll('.view-profile').forEach(btn => {
                btn.addEventListener('click', function () {
                    const studentId   = parseInt(this.getAttribute('data-id'));
                    const studentName = this.getAttribute('data-name');
                    openStudentProfile(studentId, studentName);
                });
            });

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
            // Reset form fields to defaults
            const titleInput = document.getElementById('examTitleInput');
            const subjectInput = document.getElementById('examSubject');
            const durationInput = document.getElementById('examDuration');
            const difficultyInput = document.getElementById('examDifficulty');
            const passMarkInput = document.getElementById('examPassMark');
            const optShuffle = document.getElementById('optShuffle');
            const optShuffleOptions = document.getElementById('optShuffleOptions');
            const optShowCorrect = document.getElementById('optShowCorrect');
            const optAllowReview = document.getElementById('optAllowReview');
            const optAttempts = document.getElementById('optAttempts');
            const examCategory = document.getElementById('examCategory');
            const examAvailableFrom = document.getElementById('examAvailableFrom');
            const examAvailableUntil = document.getElementById('examAvailableUntil');
            const examAccessPassword = document.getElementById('examAccessPassword');
            if (titleInput)     titleInput.value = '';
            if (subjectInput)   subjectInput.value = '';
            if (durationInput)  durationInput.value = '30';
            if (difficultyInput) difficultyInput.value = 'Medium';
            if (passMarkInput)  passMarkInput.value = '60';
            if (optShuffle)     optShuffle.checked = false;
            if (optShuffleOptions) optShuffleOptions.checked = false;
            if (optShowCorrect) optShowCorrect.checked = true;
            if (optAllowReview) optAllowReview.checked = false;
            if (optAttempts)    optAttempts.value = '1';
            if (examCategory)   examCategory.value = '';
            if (examAvailableFrom)   examAvailableFrom.value = '';
            if (examAvailableUntil)  examAvailableUntil.value = '';
            if (examAccessPassword)  examAccessPassword.value = '';
            const submitText = document.getElementById('createExamSubmitText');
            const modalTitle = document.getElementById('createExamTitle');
            if (submitText) submitText.textContent = 'Publish Exam';
            if (modalTitle) modalTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> Create New Exam`;
            questionsContainer.innerHTML = '';
            updateQuestionCount();
            addQuestionBlock();
            updateExamSummary();
        });
    }

    function updateQuestionCount() {
        const badge = document.getElementById('questionCount');
        if (!badge) return;
        const n = questionsContainer ? questionsContainer.querySelectorAll('.question-block').length : 0;
        badge.textContent = n + (n === 1 ? ' Question' : ' Questions');
        updateExamSummary();
    }

    // Live Exam Summary card — re-computes stats from form fields whenever they change
    function updateExamSummary() {
        const title     = (document.getElementById('examTitleInput')?.value || '').trim();
        const subject   = (document.getElementById('examSubject')?.value || '').trim();
        const duration  = document.getElementById('examDuration')?.value || '30';
        const difficulty= document.getElementById('examDifficulty')?.value || 'Medium';
        const passMark  = document.getElementById('examPassMark')?.value || '60';
        const shuffle   = document.getElementById('optShuffle')?.checked;
        const review    = document.getElementById('optShowCorrect')?.checked;
        const attempts  = document.getElementById('optAttempts')?.value || '1';

        const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

        setText('sumTitle',      title || '—');
        setText('sumSubject',    subject || '—');
        setText('sumDifficulty', difficulty);
        setText('sumDuration',   duration + ' min');
        setText('sumPassMark',   passMark + '%');

        // Count questions + total points
        const blocks = questionsContainer ? questionsContainer.querySelectorAll('.question-block') : [];
        let totalPoints = 0;
        blocks.forEach(b => {
            const ptsInput = b.querySelector('input.points-input');
            const pts = ptsInput ? parseInt(ptsInput.value) || 1 : 1;
            totalPoints += pts;
        });
        setText('sumQuestionCount', blocks.length);
        setText('sumTotalPoints',   totalPoints);

        // Options pills
        const optsEl = document.getElementById('sumOptions');
        if (optsEl) {
            optsEl.innerHTML = `
                <span class="ces-opt-pill ${shuffle ? 'on' : ''}">Shuffle: ${shuffle ? 'On' : 'Off'}</span>
                <span class="ces-opt-pill ${review ? 'on' : ''}">Review: ${review ? 'On' : 'Off'}</span>
                <span class="ces-opt-pill">Attempts: ${attempts}</span>
            `;
        }
    }

    // Bind live summary updates to all relevant inputs
    ['examTitleInput','examSubject','examDuration','examDifficulty','examPassMark',
     'optShuffle','optShuffleOptions','optShowCorrect','optAllowReview','optAttempts',
     'examCategory','examAvailableFrom','examAvailableUntil','examAccessPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const evt = (el.type === 'checkbox') ? 'change' : 'input';
        el.addEventListener(evt, updateExamSummary);
    });

    if (closeModal)    closeModal.addEventListener('click',   () => createExamModal.classList.add('hidden'));
    if (cancelCreate)  cancelCreate.addEventListener('click', () => createExamModal.classList.add('hidden'));

    function addQuestionBlock() {
        const idx = questionsContainer.querySelectorAll('.question-block').length + 1;
        const block = document.createElement('div');
        block.className = 'question-block';

        const uid = 'q' + Date.now() + '_' + idx;
        block.innerHTML = `
            <div class="question-block-header">
                <span class="question-block-num">Question ${idx}</span>
                <button type="button" class="btn btn-danger btn-small remove-question" style="padding:0.2rem 0.65rem;font-size:0.78rem;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:3px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
                    Remove
                </button>
            </div>
            <div class="form-group" style="margin-bottom:0.6rem;">
                <label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Question Text</label>
                <input type="text" class="form-input question-input" required placeholder="Enter your question here…">
            </div>
            <div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.7rem;">
                <div style="position:relative;">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">A</span>
                    <input type="text" class="form-input option-input" placeholder="Option A" required style="padding-left:26px;">
                </div>
                <div style="position:relative;">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">B</span>
                    <input type="text" class="form-input option-input" placeholder="Option B" required style="padding-left:26px;">
                </div>
                <div style="position:relative;">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">C</span>
                    <input type="text" class="form-input option-input" placeholder="Option C" required style="padding-left:26px;">
                </div>
                <div style="position:relative;">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">D</span>
                    <input type="text" class="form-input option-input" placeholder="Option D" required style="padding-left:26px;">
                </div>
            </div>
            <div class="correct-answer-row">
                <label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Correct Answer:</label>
                <label class="correct-opt"><input type="radio" name="${uid}" value="0" checked> A</label>
                <label class="correct-opt"><input type="radio" name="${uid}" value="1"> B</label>
                <label class="correct-opt"><input type="radio" name="${uid}" value="2"> C</label>
                <label class="correct-opt"><input type="radio" name="${uid}" value="3"> D</label>
                <div class="question-points-input" style="margin-left:auto;">
                    <label>Points:</label>
                    <input type="number" class="form-input points-input" min="1" max="100" value="1" style="width:58px;padding:0.3rem 0.5rem;font-size:0.85rem;">
                </div>
            </div>
        `;

        block.querySelector('.remove-question').addEventListener('click', () => {
            block.remove();
            updateQuestionCount();
            // Re-number remaining blocks
            questionsContainer.querySelectorAll('.question-block-num').forEach((el, i) => {
                el.textContent = `Question ${i + 1}`;
            });
        });
        // Update live summary when points change
        const ptsInput = block.querySelector('.points-input');
        if (ptsInput) ptsInput.addEventListener('input', updateExamSummary);
        questionsContainer.appendChild(block);
        updateQuestionCount();
    }
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', addQuestionBlock);

    if (createExamForm) {
        createExamForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const title      = document.getElementById('examTitleInput').value.trim();
            const duration   = parseInt(document.getElementById('examDuration').value);
            const subject    = document.getElementById('examSubject').value.trim();
            const difficulty = (document.getElementById('examDifficulty') || {}).value || 'Medium';
            const questions  = [];

            let formError = null;
            questionsContainer.querySelectorAll('.question-block').forEach((block, bi) => {
                if (formError) return;
                const qText   = block.querySelector('.question-input').value.trim();
                const opts    = Array.from(block.querySelectorAll('.option-input')).map(i => i.value.trim());
                const radioSel = block.querySelector('input[type="radio"]:checked');
                const correct = radioSel ? parseInt(radioSel.value) : 0;
                const pointsEl = block.querySelector('.points-input');
                const pts = pointsEl ? Math.max(1, parseInt(pointsEl.value) || 1) : 1;

                if (!qText) { formError = `Question ${bi + 1}: question text is empty.`; return; }
                if (opts.some(o => !o)) { formError = `Question ${bi + 1}: all 4 options are required.`; return; }
                questions.push({ question: qText, options: opts, correctAnswer: correct, points: pts });
            });

            if (formError) { alert(formError); return; }
            if (!title || !subject || duration <= 0 || questions.length === 0) {
                alert('Please fill in all exam details and add at least one question.');
                return;
            }

            const submitBtn = createExamForm.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating…'; }

            // Gather all new fields
            const payload = {
                title, subject, difficulty, duration, questions,
                passMark:         parseInt(document.getElementById('examPassMark')?.value || '60'),
                shuffleQuestions: document.getElementById('optShuffle')?.checked || false,
                shuffleOptions:   document.getElementById('optShuffleOptions')?.checked || false,
                showCorrectAnswers: document.getElementById('optShowCorrect')?.checked ?? true,
                allowReReview:    document.getElementById('optAllowReview')?.checked || false,
                maxAttempts:      parseInt(document.getElementById('optAttempts')?.value || '1'),
                accessPassword:   document.getElementById('examAccessPassword')?.value || '',
                availableFrom:    document.getElementById('examAvailableFrom')?.value || '',
                availableUntil:   document.getElementById('examAvailableUntil')?.value || '',
                category:         document.getElementById('examCategory')?.value || ''
            };

            const res = await apiRequest('teacher_create_exam', payload);

            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Publish Exam'; }

            if (res.status === 'success') {
                createExamModal.classList.add('hidden');
                questionsContainer.innerHTML = '';
                updateQuestionCount();
                showToast('Exam created successfully!', 'success');
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

    async function startExam(examId, accessPassword) {
        // First try without password; if server says ACCESS_PASSWORD_REQUIRED, show the password modal
        const res = await apiRequest('get_exam', { examId, accessPassword: accessPassword || '' }, 'GET');
        if (res.status === 'error' || !res.exam) {
            // Check if it's a password-required error
            if (res.message === 'ACCESS_PASSWORD_REQUIRED') {
                promptExamPassword(examId);
                return;
            }
            alert(res.message || 'Failed to load exam.');
            return;
        }
        await loadExamIntoInterface(res);
    }

    // Show the exam password modal and retry startExam when submitted
    function promptExamPassword(examId) {
        const modal  = document.getElementById('examPasswordModal');
        const form   = document.getElementById('examPasswordForm');
        const input  = document.getElementById('examPasswordInput');
        const errEl  = document.getElementById('examPasswordError');
        const closeBtn  = document.getElementById('closeExamPassword');
        const cancelBtn = document.getElementById('cancelExamPassword');
        if (!modal || !form) { alert('This exam requires a password.'); return; }

        input.value = '';
        errEl.style.display = 'none';
        errEl.textContent = '';
        modal.classList.remove('hidden');

        const close = () => modal.classList.add('hidden');
        const newClose  = closeBtn.cloneNode(true);  closeBtn.parentNode.replaceChild(newClose, closeBtn);
        const newCancel = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        const newForm   = form.cloneNode(true);      form.parentNode.replaceChild(newForm, form);

        newClose.addEventListener('click', close);
        newCancel.addEventListener('click', close);
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pw = newForm.querySelector('#examPasswordInput').value.trim();
            if (!pw) return;
            // Try loading with this password — but we need to check if it's accepted before closing the modal
            const checkRes = await apiRequest('get_exam', { examId, accessPassword: pw }, 'GET');
            if (checkRes.status === 'error') {
                if (checkRes.message === 'ACCESS_PASSWORD_REQUIRED') {
                    errEl.textContent = 'Incorrect access code. Please try again.';
                    errEl.style.display = 'block';
                } else {
                    alert(checkRes.message || 'Failed to load exam.');
                    close();
                }
                return;
            }
            // Password accepted — close modal and load exam
            close();
            await loadExamIntoInterface(checkRes);
        });
    }

    // Shared helper: loads a fetched exam into the exam-taking interface
    async function loadExamIntoInterface(res) {
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
        document.body.style.overflow = 'hidden';

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
        // Preview mode — just return to dashboard, don't save anything
        if (currentExam && currentExam._isPreview) {
            if (confirm('Exit preview mode? No answers will be saved.')) {
                currentExam = null;
                document.getElementById('examInterface').classList.add('hidden');
                document.getElementById('examTimerContainer')?.classList.remove('practice-hidden');
                dashboard.classList.remove('hidden');
                loadTeacherDashboard();
            }
            return;
        }
        clearInterval(examTimerInterval);
        disableExamProtection();
        const timeTaken = Math.floor((Date.now() - currentExamStartTime) / 1000);
        const res = await apiRequest('submit_exam', { examId: currentExam.id, timeTaken });

        if (res.status === 'success') {
            const pct = res.score;
            const circumference = 2 * Math.PI * 82; // r=82 → ≈515.2
            const fillOffset = circumference - (pct / 100) * circumference;
            const ring = document.getElementById('scoreRingFill');
            if (ring) {
                ring.style.strokeDasharray  = circumference;
                ring.style.strokeDashoffset = circumference; // start at 0
                ring.classList.remove('ring-pass','ring-fail');
                ring.classList.add(pct >= 60 ? 'ring-pass' : 'ring-fail');
                requestAnimationFrame(() => {
                    ring.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
                    ring.style.strokeDashoffset = fillOffset;
                });
            }

            // --- Hero stats ---
            document.getElementById('finalScore').textContent     = pct + '%';
            document.getElementById('correctAnswers').textContent = `${res.correctAnswers}/${res.totalQuestions}`;
            document.getElementById('timeTaken').textContent      = formatTime(res.timeTaken);

            // --- New stats: Total Questions + Points ---
            const totalQsEl = document.getElementById('resultsTotalQs');
            if (totalQsEl) totalQsEl.textContent = res.totalQuestions;

            // Compute points from answerReview (sum of points where correct vs total)
            let earnedPts = 0, totalPts = 0;
            let correctCt = 0, wrongCt = 0, unansweredCt = 0;
            if (res.answerReview && res.answerReview.length > 0) {
                res.answerReview.forEach(item => {
                    const pts = item.points || 1;
                    totalPts += pts;
                    if (item.selectedAnswer === null || item.selectedAnswer === undefined) {
                        unansweredCt++;
                    } else if (item.isCorrect) {
                        earnedPts += pts;
                        correctCt++;
                    } else {
                        wrongCt++;
                    }
                });
            }
            const pointsEl = document.getElementById('resultsPoints');
            if (pointsEl) pointsEl.textContent = totalPts > 0 ? `${earnedPts}/${totalPts}` : '—';

            // --- Performance Breakdown bar ---
            const totalForBar = Math.max(res.totalQuestions, 1);
            const bdCorrect   = document.getElementById('bdCorrect');
            const bdWrong     = document.getElementById('bdWrong');
            const bdUnanswered= document.getElementById('bdUnanswered');
            if (bdCorrect) bdCorrect.style.width   = ((correctCt    / totalForBar) * 100) + '%';
            if (bdWrong)   bdWrong.style.width     = ((wrongCt      / totalForBar) * 100) + '%';
            if (bdUnanswered) bdUnanswered.style.width = ((unansweredCt / totalForBar) * 100) + '%';
            const bdCorrectTxt    = document.getElementById('bdCorrectTxt');
            const bdWrongTxt      = document.getElementById('bdWrongTxt');
            const bdUnansweredTxt = document.getElementById('bdUnansweredTxt');
            if (bdCorrectTxt)    bdCorrectTxt.textContent    = `${correctCt} correct`;
            if (bdWrongTxt)      bdWrongTxt.textContent      = `${wrongCt} wrong`;
            if (bdUnansweredTxt) bdUnansweredTxt.textContent = `${unansweredCt} unanswered`;
            const pctTextEl = document.getElementById('resultsPctText');
            if (pctTextEl) pctTextEl.textContent = pct + '%';

            // --- Answer review count badge ---
            const arCountEl = document.getElementById('answerReviewCount');
            if (arCountEl) arCountEl.textContent = `${res.answerReview ? res.answerReview.length : 0} questions`;

            // --- Exam title ---
            const titleEl = document.getElementById('reviewExamTitle');
            if (titleEl) titleEl.textContent = res.examTitle || '';

            // --- Pass/Fail badge + dynamic subtitle ---
            const badge = document.getElementById('passBadge');
            const subtitleEl = document.getElementById('resultsSubtitle');
            if (badge) {
                if (pct >= 60) {
                    badge.textContent = '✓ Passed';
                    badge.className = 'pass-badge badge-pass';
                } else {
                    badge.textContent = '✗ Failed';
                    badge.className = 'pass-badge badge-fail';
                }
            }
            if (subtitleEl) {
                if (pct === 100) {
                    subtitleEl.textContent = 'Perfect score! Outstanding work. 🎯';
                } else if (pct >= 90) {
                    subtitleEl.textContent = 'Excellent performance — keep it up!';
                } else if (pct >= 75) {
                    subtitleEl.textContent = 'Great job! You\'re well above average.';
                } else if (pct >= 60) {
                    subtitleEl.textContent = 'Good effort — you passed this exam.';
                } else if (pct >= 40) {
                    subtitleEl.textContent = 'Close to the pass mark. Review the answers below and try again.';
                } else {
                    subtitleEl.textContent = 'Below the pass mark. Practice mode can help you improve.';
                }
            }

            // --- Badges earned during this exam (if any) ---
            const badgesRow = document.getElementById('resultsBadges');
            if (badgesRow) {
                if (res.newBadges && res.newBadges.length > 0) {
                    badgesRow.style.display = 'flex';
                    badgesRow.innerHTML = '<span class="results-badges-label">🏅 New badges:</span>' +
                        res.newBadges.map(b => `
                            <span class="results-badge-chip" title="${b.label} — ${b.earnedAt || ''}">
                                <span class="rb-icon">${b.icon}</span>
                                <span class="rb-label">${b.label}</span>
                            </span>
                        `).join('');
                } else {
                    badgesRow.style.display = 'none';
                    badgesRow.innerHTML = '';
                }
            }

            // --- Answer review list ---
            const reviewList = document.getElementById('answerReviewList');
            if (reviewList && res.answerReview && res.answerReview.length > 0) {
                reviewList.innerHTML = '';
                const optLetters = ['A','B','C','D'];
                res.answerReview.forEach((item, idx) => {
                    const div = document.createElement('div');
                    div.className = 'ar-item ' + (item.isCorrect ? 'ar-correct' : 'ar-wrong');
                    const selLetter = item.selectedAnswer !== null ? optLetters[item.selectedAnswer] : '—';
                    const corrLetter = optLetters[item.correctAnswer];
                    const selText    = item.selectedAnswer !== null ? item.options[item.selectedAnswer] : 'No answer';
                    const corrText   = item.options[item.correctAnswer];
                    const statusBadge = item.selectedAnswer === null
                        ? '<span class="ar-status ar-status-skipped">Skipped</span>'
                        : (item.isCorrect
                            ? '<span class="ar-status ar-status-correct">Correct</span>'
                            : '<span class="ar-status ar-status-wrong">Wrong</span>');
                    const ptsLabel = (item.points && item.points > 1)
                        ? `<span class="ar-pts">${item.points} pts</span>` : '';
                    div.innerHTML = `
                        <div class="ar-icon">${item.isCorrect ? '✓' : (item.selectedAnswer === null ? '○' : '✗')}</div>
                        <div class="ar-body">
                            <div class="ar-qnum">Q${idx + 1} ${statusBadge} ${ptsLabel}</div>
                            <div class="ar-qtext">${item.question}</div>
                            <div class="ar-answer-row">
                                ${item.isCorrect
                                    ? `<span class="ar-your-answer">Your answer: <b>${selLetter}. ${selText}</b></span>`
                                    : `<span class="ar-your-answer">Your answer: <b>${selLetter}. ${selText}</b></span>
                                       &nbsp;·&nbsp;
                                       <span class="ar-correct-answer">Correct: <b>${corrLetter}. ${corrText}</b></span>`
                                }
                            </div>
                        </div>
                    `;
                    reviewList.appendChild(div);
                });
            } else if (reviewList) {
                reviewList.innerHTML = '<div style="color:var(--color-text-secondary);font-size:0.88rem;text-align:center;padding:1rem;">No answer data available.</div>';
            }

            document.getElementById('examInterface').classList.add('hidden');
            const rp = document.getElementById('resultsPage');
            rp.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // --- Toast new badges (if any) ---
            if (res.newBadges && res.newBadges.length > 0) {
                res.newBadges.forEach((badge, i) => {
                    setTimeout(() => {
                        showToast(`${badge.icon} New badge earned: ${badge.label}!`, 'success');
                    }, 600 + i * 1200);
                });
            }
        } else {
            alert(res.message || 'Failed to submit exam.');
        }
    }

    // "Practice Again" button — restarts the same exam in practice mode
    const practiceAgainBtn = document.getElementById('practiceAgainBtn');
    if (practiceAgainBtn) {
        practiceAgainBtn.addEventListener('click', function () {
            const rp = document.getElementById('resultsPage');
            rp.classList.add('hidden');
            rp.removeAttribute('style');
            document.body.style.overflow = '';
            if (currentExam && currentExam.id) {
                startPractice(currentExam.id);
            } else {
                // Fallback: go back to dashboard
                document.getElementById('examInterface').classList.add('hidden');
                dashboard.classList.remove('hidden');
                loadStudentDashboard();
            }
        });
    }

    function closeResultsPage() {
        const rp = document.getElementById('resultsPage');
        rp.classList.add('hidden');
        rp.removeAttribute('style');
        document.body.style.overflow = '';
        document.getElementById('examInterface').classList.add('hidden');
        currentExam = null;
        const navbar = document.querySelector('.navbar');
        const footer = document.querySelector('.site-footer');
        if (footer) footer.classList.remove('hidden');
        loadStudentDashboard();
        dashboard.classList.remove('hidden');
    }
    document.getElementById('backToDashboard').addEventListener('click', closeResultsPage);
    // New header back button — same behavior
    const resultsBackBtn = document.getElementById('resultsBackBtn');
    if (resultsBackBtn) resultsBackBtn.addEventListener('click', closeResultsPage);

    // =========================================================================
    // --- ABOUT PAGE (full-page with back button) ---
    // =========================================================================
    const aboutFullPage = document.getElementById('aboutFullPage');
    const aboutBackBtn  = document.getElementById('aboutBackBtn');
    const aboutBtn      = document.getElementById('aboutBtn');
    const mainAboutBtn  = document.getElementById('mainAboutBtn');

    function openAboutPage() {
        if (aboutFullPage) aboutFullPage.classList.remove('hidden');
    }
    function closeAboutPage() {
        if (aboutFullPage) aboutFullPage.classList.add('hidden');
    }
    if (aboutBtn)     aboutBtn.addEventListener('click', openAboutPage);
    if (mainAboutBtn) mainAboutBtn.addEventListener('click', openAboutPage);
    if (aboutBackBtn) aboutBackBtn.addEventListener('click', closeAboutPage);
    // Esc closes About page
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && aboutFullPage && !aboutFullPage.classList.contains('hidden')) {
            closeAboutPage();
        }
    });

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
    // --- PRACTICE MODE ---
    // =========================================================================
    let practiceData = null;

    async function startPractice(examId) {
        const res = await apiRequest('practice_exam', { examId }, 'POST');
        if (res.status !== 'success') { alert(res.message || 'Failed to load practice exam.'); return; }

        practiceData = { exam: res.exam, questions: res.questions, idx: 0, answers: {}, correct: 0 };
        const exam = res.exam;

        document.getElementById('examTitle').innerHTML =
            exam.title + ' <span class="practice-mode-badge">Practice</span>';
        document.getElementById('examTimerContainer').classList.add('practice-hidden');
        document.getElementById('candidateName').textContent = currentUser.name;
        document.getElementById('candidateId').textContent   = currentUser.userId || '';
        document.getElementById('examSubjectName').textContent = exam.subject;

        dashboard.classList.add('hidden');
        document.getElementById('examInterface').classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        renderPracticeQuestion();
        buildPracticeGrid();
    }

    function renderPracticeQuestion() {
        const { questions, idx, answers } = practiceData;
        const q = questions[idx];
        const optLetters = ['A','B','C','D'];
        const qContainer = document.getElementById('questionContainer');
        const pts = q.points > 1 ? `<span class="question-pts-badge">${q.points} pts</span>` : '';

        qContainer.innerHTML = `
            <div class="question-number">Question ${idx + 1} of ${questions.length} ${pts}</div>
            <div class="question-text">${q.question}</div>
            <div class="options-list" id="practiceOptions">
                ${q.options.map((opt, i) => `
                    <div class="option-item practice-opt" data-idx="${i}" style="position:relative;cursor:pointer;">
                        <span class="option-letter">${optLetters[i]}</span>
                        <span class="option-text">${opt}</span>
                    </div>`).join('')}
            </div>
            <div id="practiceExplanation" style="display:none;margin-top:0.75rem;padding:0.75rem 1rem;border-radius:0.6rem;font-size:0.9rem;"></div>
        `;

        // If already answered, show feedback
        if (answers[idx] !== undefined) showPracticeFeedback(answers[idx], false);

        qContainer.querySelectorAll('.practice-opt').forEach(opt => {
            opt.addEventListener('click', function () {
                if (practiceData.answers[idx] !== undefined) return; // already answered
                const chosen = parseInt(this.dataset.idx);
                practiceData.answers[idx] = chosen;
                if (chosen === q.correctAnswer) practiceData.correct++;
                showPracticeFeedback(chosen, true);
                buildPracticeGrid();
            });
        });

        // nav buttons
        document.getElementById('prevBtn').disabled = idx === 0;
        document.getElementById('nextBtn').textContent = idx === questions.length - 1 ? 'Finish' : 'Next';
    }

    function showPracticeFeedback(chosen, animate) {
        const q = practiceData.questions[practiceData.idx];
        document.querySelectorAll('#practiceOptions .practice-opt').forEach((opt, i) => {
            opt.classList.remove('practice-correct','practice-wrong');
            if (i === q.correctAnswer) opt.classList.add('practice-correct');
            else if (i === chosen && chosen !== q.correctAnswer) opt.classList.add('practice-wrong');
        });
        const expEl = document.getElementById('practiceExplanation');
        if (expEl) {
            const pass = chosen === q.correctAnswer;
            expEl.style.display = 'block';
            expEl.style.cssText += `;background:${pass ? 'rgba(110,154,114,0.1)' : 'rgba(224,122,95,0.1)'};color:var(--color-text);border:1.5px solid ${pass ? 'var(--color-success)' : 'var(--color-danger)'};`;
            expEl.textContent = pass ? '✓ Correct!' : `✗ Incorrect. Correct answer: ${['A','B','C','D'][q.correctAnswer]}. ${q.options[q.correctAnswer]}`;
        }
    }

    function buildPracticeGrid() {
        const { questions, idx, answers } = practiceData;
        const grid = document.getElementById('questionsMapGrid');
        grid.innerHTML = '';
        questions.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'question-nav-btn';
            btn.textContent = i + 1;
            if (i === idx) btn.classList.add('active');
            if (answers[i] !== undefined) {
                btn.classList.add(answers[i] === questions[i].correctAnswer ? 'practice-correct-nav' : 'practice-wrong-nav');
            }
            btn.style.cssText = answers[i] !== undefined
                ? `background:${answers[i] === questions[i].correctAnswer ? 'var(--color-success)' : 'var(--color-danger)'};color:#fff;border-color:transparent;`
                : (i === idx ? '' : '');
            btn.addEventListener('click', () => { practiceData.idx = i; renderPracticeQuestion(); });
            grid.appendChild(btn);
        });
    }

    // Practice prev/next (re-wire on each render)
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (practiceData && practiceData.idx > 0) { practiceData.idx--; renderPracticeQuestion(); }
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (!practiceData) return;
        if (practiceData.idx < practiceData.questions.length - 1) {
            practiceData.idx++;
            renderPracticeQuestion();
        } else {
            showPracticeSummary();
        }
    });

    function showPracticeSummary() {
        const { questions, correct } = practiceData;
        const total = questions.length;
        const pct   = Math.round((correct / total) * 100);
        const overlay = document.createElement('div');
        overlay.className = 'practice-summary-modal';
        overlay.innerHTML = `
            <div class="practice-summary-box">
                <div class="practice-summary-score" style="color:${pct >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${pct}%</div>
                <div class="practice-summary-label">Practice Complete</div>
                <div class="practice-summary-stats">
                    <div class="practice-stat-pill">${correct}/${total} <span>Correct</span></div>
                    <div class="practice-stat-pill">${pct >= 60 ? 'PASS' : 'FAIL'} <span>Result</span></div>
                </div>
                <button class="btn btn-primary" style="width:100%;" id="practiceDoneBtn">Back to Dashboard</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#practiceDoneBtn').addEventListener('click', () => {
            overlay.remove();
            document.getElementById('examInterface').classList.add('hidden');
            document.getElementById('examTimerContainer').classList.remove('practice-hidden');
            document.body.style.overflow = '';
            practiceData = null;
            dashboard.classList.remove('hidden');
            loadStudentDashboard();
        });
    }

    // =========================================================================
    // --- EDIT EXISTING EXAM ---
    // =========================================================================
    async function openEditExam(examId) {
        // Fetch existing data
        const res = await apiRequest('get_exam', { examId }, 'POST');
        if (res.status !== 'success') { alert('Failed to load exam.'); return; }
        const exam = res.exam;
        const qs   = exam.questions || [];

        // Populate create modal fields
        document.getElementById('examTitleInput').value    = exam.title;
        document.getElementById('examSubject').value       = exam.subject;
        document.getElementById('examDuration').value      = exam.duration;
        document.getElementById('examDifficulty').value    = exam.difficulty || 'Medium';

        // Clear + rebuild questions
        const qc = document.getElementById('questionsContainer');
        qc.innerHTML = '';
        qs.forEach(q => {
            addQuestionBlock();
            const block = qc.lastElementChild;
            block.querySelector('.question-input').value = q.question;
            const opts = block.querySelectorAll('.option-input');
            q.options.forEach((o, i) => { if (opts[i]) opts[i].value = o; });
            const radio = block.querySelector(`input[type="radio"][value="${q.correctAnswer}"]`);
            if (radio) radio.checked = true;
            const ptsIn = block.querySelector('.points-input');
            if (ptsIn) ptsIn.value = q.points || 1;
        });
        updateQuestionCount();

        // Change modal title and form mode
        const modalTitle = document.getElementById('createExamTitle');
        if (modalTitle) modalTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit Exam`;
        const submitText = document.getElementById('createExamSubmitText');
        if (submitText) submitText.textContent = 'Save Changes';

        document.getElementById('createExamModal').dataset.editId = examId;
        document.getElementById('createExamModal').classList.remove('hidden');
    }

    // Override createExamForm submit to handle edit mode
    const _createForm = document.getElementById('createExamForm');
    if (_createForm) {
        const originalHandler = _createForm.onsubmit;
        _createForm.addEventListener('submit', async function(e2) {
            const editId = parseInt(document.getElementById('createExamModal').dataset.editId || '0');
            if (!editId) return; // handled by existing submit handler
            e2.stopImmediatePropagation();
            e2.preventDefault();

            const title      = document.getElementById('examTitleInput').value.trim();
            const subject    = document.getElementById('examSubject').value.trim();
            const duration   = parseInt(document.getElementById('examDuration').value);
            const difficulty = (document.getElementById('examDifficulty') || {}).value || 'Medium';
            const questions  = [];
            let formError    = null;

            document.getElementById('questionsContainer').querySelectorAll('.question-block').forEach((block, bi) => {
                if (formError) return;
                const qText  = block.querySelector('.question-input').value.trim();
                const opts   = Array.from(block.querySelectorAll('.option-input')).map(i => i.value.trim());
                const radio  = block.querySelector('input[type="radio"]:checked');
                const correct = radio ? parseInt(radio.value) : 0;
                const pts    = Math.max(1, parseInt(block.querySelector('.points-input')?.value || 1));
                if (!qText) { formError = `Q${bi+1}: question text is empty.`; return; }
                if (opts.some(o => !o)) { formError = `Q${bi+1}: all 4 options required.`; return; }
                questions.push({ question: qText, options: opts, correctAnswer: correct, points: pts });
            });
            if (formError) { alert(formError); return; }

            const submitBtn = document.querySelector('button[form="createExamForm"]');
            if (submitBtn) { submitBtn.disabled = true; if (submitBtn.querySelector('#createExamSubmitText')) submitBtn.querySelector('#createExamSubmitText').textContent = 'Saving…'; else submitBtn.textContent = 'Saving…'; }

            const res = await apiRequest('teacher_edit_exam', { examId: editId, title, subject, duration, difficulty, questions });

            if (submitBtn) { submitBtn.disabled = false; if (submitBtn.querySelector('#createExamSubmitText')) submitBtn.querySelector('#createExamSubmitText').textContent = 'Save Changes'; }

            if (res.status === 'success') {
                delete document.getElementById('createExamModal').dataset.editId;
                document.getElementById('createExamModal').classList.add('hidden');
                document.getElementById('questionsContainer').innerHTML = '';
                updateQuestionCount();
                showToast('Exam updated!', 'success');
                loadTeacherDashboard();
                // Reset modal title
                const hdr = document.getElementById('createExamTitle');
                if (hdr) hdr.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> Create New Exam`;
                const sbText = document.getElementById('createExamSubmitText');
                if (sbText) sbText.textContent = 'Publish Exam';
            } else {
                alert(res.message || 'Update failed.');
            }
        }, true); // capture phase so it fires before default handler
    }

    // =========================================================================
    // --- LEADERBOARD ---
    // =========================================================================
    async function loadLeaderboard() {
        const select  = document.getElementById('leaderboardExamSelect');
        const examId  = select ? parseInt(select.value) : 0;
        const res     = await apiRequest('get_leaderboard', { examId }, 'POST');
        const container = document.getElementById('leaderboardContainer');
        if (!container) return;

        if (res.status !== 'success') { container.innerHTML = '<p>Failed to load leaderboard.</p>'; return; }

        // Populate exam dropdown (once)
        if (select && select.options.length <= 1 && res.exams) {
            res.exams.forEach(e => {
                const o = document.createElement('option');
                o.value = e.id; o.textContent = e.title;
                select.appendChild(o);
            });
            const cloneSel = select.cloneNode(true);
            select.parentNode.replaceChild(cloneSel, select);
            cloneSel.addEventListener('change', loadLeaderboard);
        }

        const rows = res.leaderboard || [];
        if (rows.length === 0) {
            container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">No results yet for this exam.</div>';
            return;
        }

        const medals = ['🥇','🥈','🥉'];
        const avatarColors = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];
        const list = document.createElement('div');
        list.className = 'leaderboard-list';
        rows.forEach((row, i) => {
            const rankClass = i < 3 ? `rank-${i+1}` : '';
            const scoreNum  = parseInt(row.bestScore);
            const scoreClass = scoreNum >= 75 ? 'high' : scoreNum >= 50 ? 'mid' : 'low';
            const initials  = (row.name || '??').substring(0, 2).toUpperCase();
            const color     = avatarColors[i % avatarColors.length];
            const div = document.createElement('div');
            div.className = `lb-row ${rankClass}`;
            div.innerHTML = `
                <div class="lb-rank">${medals[i] || `#${i+1}`}</div>
                <div class="lb-avatar" style="background:${color};">${initials}</div>
                <div class="lb-name">${row.name}</div>
                <div class="lb-attempts">${row.attempts} attempt${row.attempts !== 1 ? 's' : ''}</div>
                <div class="lb-score ${scoreClass}">${scoreNum}%</div>
            `;
            list.appendChild(div);
        });
        container.innerHTML = '';
        container.appendChild(list);
    }

    // =========================================================================
    // --- PROFILE SETTINGS (shared by student + teacher) ---
    // =========================================================================
    const AVATAR_PALETTE = ['#e74c3c','#e67e22','#f39c12','#2ecc71','#1abc9c','#3498db','#9b59b6','#34495e','#16a085','#c0392b'];

    function loadSettingsPanel(role) {
        const containerId = role === 'student' ? 'studentSettingsContent' : 'teacherSettingsContent';
        const container   = document.getElementById(containerId);
        if (!container) return;

        const avatarStr  = currentUser.avatar || '';
        const parts      = avatarStr.includes(':') ? avatarStr.split(':') : ['#3498db', avatarStr || 'US'];
        let   selColor   = parts[0];
        const initials   = parts[1] || (currentUser.name || 'US').substring(0,2).toUpperCase();

        container.innerHTML = `
            <div class="settings-panel">
                <div class="settings-section">
                    <div class="settings-section-title">Avatar</div>
                    <div class="avatar-preview" id="settingsAvatarPreview" style="background:${selColor};">${initials}</div>
                    <div class="avatar-picker" id="avatarPicker">
                        ${AVATAR_PALETTE.map(c => `<div class="avatar-swatch ${c===selColor?'selected':''}" style="background:${c};" data-color="${c}"></div>`).join('')}
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">Profile</div>
                    <div class="form-group"><label>Display Name</label>
                        <input type="text" id="settingsName" class="form-input" value="${currentUser.name || ''}" placeholder="Your name"></div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">Change Password <span style="font-weight:400;opacity:0.6;">(leave blank to keep current)</span></div>
                    <div class="form-group"><label>Current Password</label>
                        <input type="password" id="settingsCurPass" class="form-input" placeholder="Required to change password"></div>
                    <div class="form-group"><label>New Password</label>
                        <input type="password" id="settingsNewPass" class="form-input" placeholder="Min 6 characters"></div>
                </div>
                <button id="saveSettingsBtn" class="btn btn-primary" style="width:100%;">Save Changes</button>
                <div id="settingsMsg" style="margin-top:0.75rem;text-align:center;font-size:0.9rem;"></div>
            </div>
        `;

        // Avatar swatch click
        let currentColor = selColor;
        container.querySelectorAll('.avatar-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                container.querySelectorAll('.avatar-swatch').forEach(s => s.classList.remove('selected'));
                sw.classList.add('selected');
                currentColor = sw.dataset.color;
                const nameVal = document.getElementById('settingsName').value.trim();
                const ini = nameVal ? nameVal.substring(0,2).toUpperCase() : initials;
                document.getElementById('settingsAvatarPreview').style.background = currentColor;
            });
        });

        document.getElementById('settingsName').addEventListener('input', function() {
            const ini = this.value.trim().substring(0,2).toUpperCase() || initials;
            document.getElementById('settingsAvatarPreview').textContent = ini;
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            const name     = document.getElementById('settingsName').value.trim();
            const curPass  = document.getElementById('settingsCurPass').value;
            const newPass  = document.getElementById('settingsNewPass').value;
            const ini      = name ? name.substring(0,2).toUpperCase() : initials;
            const avatar   = `${currentColor}:${ini}`;
            const msgEl    = document.getElementById('settingsMsg');

            const payload  = { name, avatar };
            if (newPass) { payload.newPassword = newPass; payload.currentPassword = curPass; }

            const res = await apiRequest('update_profile', payload);
            if (res.status === 'success') {
                currentUser = res.user;
                // Update sidebar avatar
                const sidebarAv = document.getElementById('sidebarAvatar');
                if (sidebarAv) { sidebarAv.textContent = ini; sidebarAv.style.background = currentColor; }
                const sidebarName = document.getElementById('sidebarUserName');
                if (sidebarName) sidebarName.textContent = name;
                msgEl.style.color = 'var(--color-success)';
                msgEl.textContent = '✓ Profile saved!';
                document.getElementById('settingsCurPass').value = '';
                document.getElementById('settingsNewPass').value = '';
                showToast('Profile updated!', 'success');
            } else {
                msgEl.style.color = 'var(--color-danger)';
                msgEl.textContent = res.message || 'Failed to save.';
            }
        });
    }

    // =========================================================================
    // --- QUESTION BANK (Teacher tab) ---
    // =========================================================================
    async function loadTeacherBank() {
        const container = document.getElementById('teacherBankContent');
        if (!container) return;
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading question bank…</div>';

        // Fetch bank questions (no filter initially)
        let res;
        try {
            const r = await fetch('api.php?action=teacher_get_bank', { credentials: 'same-origin' });
            res = await r.json();
        } catch (e) {
            container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load question bank. Please try again.</div>';
            return;
        }
        if (res.status !== 'success') {
            container.innerHTML = `<div style="padding:1.5rem;color:var(--color-danger);">${res.message || 'Failed to load question bank.'}</div>`;
            return;
        }

        const questions = res.questions || [];
        const subjects  = res.subjects  || [];
        const total     = res.totalCount || questions.length;

        // Top toolbar: search + subject filter + add button
        const toolbar = document.createElement('div');
        toolbar.className = 'bank-toolbar';
        toolbar.innerHTML = `
            <div class="bank-search-wrap">
                <svg class="bank-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="bankSearchInput" class="form-input bank-search-input" placeholder="Search questions…" autocomplete="off">
            </div>
            <select id="bankSubjectFilter" class="form-input form-select bank-subject-filter">
                <option value="">All Subjects</option>
                ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <div class="bank-stats-pill">${total} question${total === 1 ? '' : 's'} in bank</div>
            <button id="bankAddNewBtn" class="btn btn-primary bank-add-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Question
            </button>
        `;
        container.innerHTML = '';
        container.appendChild(toolbar);

        // List wrapper — scrolls internally
        const listWrap = document.createElement('div');
        listWrap.className = 'bank-list-wrap';
        listWrap.id = 'bankListWrap';
        container.appendChild(listWrap);

        // Render questions into the list wrapper
        function renderList(qs) {
            listWrap.innerHTML = '';
            if (!qs || qs.length === 0) {
                listWrap.innerHTML = `
                    <div class="bank-empty-state">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                        <div class="bank-empty-title">No questions match your filters</div>
                        <div class="bank-empty-desc">Try a different search term or subject, or add a new question to the bank.</div>
                    </div>
                `;
                return;
            }
            const letters = ['A','B','C','D'];
            qs.forEach(q => {
                const row = document.createElement('div');
                row.className = 'bank-question-row';
                const diffColor = { Easy: 'var(--color-success)', Medium: '#f59e0b', Hard: 'var(--color-danger)' }[q.difficulty] || 'var(--color-primary)';
                row.innerHTML = `
                    <div class="bqr-main">
                        <div class="bqr-question">${escapeHtmlBank(q.question)}</div>
                        <div class="bqr-meta">
                            <span class="bqr-chip bqr-chip-subject">${escapeHtmlBank(q.subject || '—')}</span>
                            <span class="bqr-chip" style="color:${diffColor};background:${diffColor}18;">${escapeHtmlBank(q.difficulty || 'Medium')}</span>
                            <span class="bqr-chip bqr-chip-correct">Correct: ${letters[q.correctAnswer] || '—'}</span>
                            <span class="bqr-chip bqr-chip-usage">Used ${q.usageCount || 0}×</span>
                        </div>
                        <div class="bqr-options">
                            ${[0,1,2,3].map(i => `
                                <div class="bqr-option ${i === q.correctAnswer ? 'is-correct' : ''}">
                                    <span class="bqr-opt-letter">${letters[i]}</span>
                                    <span class="bqr-opt-text">${escapeHtmlBank(q['option' + (i+1)])}</span>
                                    ${i === q.correctAnswer ? '<span class="bqr-opt-check">✓</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="bqr-actions">
                        <button class="btn btn-secondary btn-small bqr-use-btn" data-id="${q.id}">Use in Exam</button>
                        <button class="btn btn-danger btn-small bqr-delete-btn" data-id="${q.id}" data-q="${escapeHtmlBank(q.question.substring(0, 60))}">Delete</button>
                    </div>
                `;
                listWrap.appendChild(row);
            });

            // Wire delete buttons
            listWrap.querySelectorAll('.bqr-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const qid = parseInt(btn.dataset.id);
                    const preview = btn.dataset.q;
                    showCustomConfirm('Delete Question', `Delete this question from the bank?\n\n"${preview}…"`, async () => {
                        const r = await apiRequest('teacher_delete_from_bank', { questionId: qid });
                        if (r.status === 'success') {
                            showToast('Question deleted.', 'success');
                            loadTeacherBank();
                        } else {
                            alert(r.message || 'Failed to delete.');
                        }
                    });
                });
            });

            // Wire "Use in Exam" — opens the Create Exam modal with this question preloaded
            listWrap.querySelectorAll('.bqr-use-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const qid = parseInt(btn.dataset.id);
                    const r = await apiRequest('teacher_import_from_bank', { questionIds: [qid] });
                    if (r.status !== 'success') { alert(r.message || 'Import failed.'); return; }
                    // Open create exam modal
                    if (createExamBtn) createExamBtn.click();
                    // Wait a tick for modal to open + first question block to be added
                    setTimeout(() => {
                        // Remove the default empty block first
                        const qc = document.getElementById('questionsContainer');
                        if (qc) qc.innerHTML = '';
                        updateQuestionCount();
                        // Add the imported question as a block
                        r.questions.forEach(q => {
                            addQuestionBlock();
                            const block = qc.lastElementChild;
                            block.querySelector('.question-input').value = q.question;
                            const opts = block.querySelectorAll('.option-input');
                            q.options.forEach((o, i) => { if (opts[i]) opts[i].value = o; });
                            const radio = block.querySelector(`input[type="radio"][value="${q.correctAnswer}"]`);
                            if (radio) radio.checked = true;
                        });
                        updateQuestionCount();
                        showToast('Question loaded into new exam.', 'success');
                    }, 100);
                });
            });
        }

        renderList(questions);

        // Live search + subject filter (re-fetch from server)
        let searchDebounce = null;
        const searchInput = document.getElementById('bankSearchInput');
        const subjectSel  = document.getElementById('bankSubjectFilter');
        async function refetchBank() {
            const search  = searchInput.value.trim();
            const subject = subjectSel.value;
            let url = 'api.php?action=teacher_get_bank';
            if (search)  url += `&search=${encodeURIComponent(search)}`;
            if (subject) url += `&subject=${encodeURIComponent(subject)}`;
            listWrap.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">Filtering…</div>';
            try {
                const r = await fetch(url, { credentials: 'same-origin' });
                const data = await r.json();
                if (data.status === 'success') renderList(data.questions || []);
                else listWrap.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Filter failed.</div>';
            } catch (e) {
                listWrap.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Network error.</div>';
            }
        }
        if (searchInput) searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(refetchBank, 250);
        });
        if (subjectSel) subjectSel.addEventListener('change', refetchBank);

        // Add new question button — opens inline form
        const addBtn = document.getElementById('bankAddNewBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => openBankAddForm(container, () => loadTeacherBank()));
        }
    }

    // Inline "Add Question to Bank" form (rendered as a modal-style overlay inside the tab)
    function openBankAddForm(parentContainer, onSaved) {
        // Build the form
        const formWrap = document.createElement('div');
        formWrap.className = 'bank-add-form-overlay';
        formWrap.innerHTML = `
            <div class="bank-add-form-card">
                <div class="baf-header">
                    <h3>Add Question to Bank</h3>
                    <button type="button" class="baf-close-btn">&times;</button>
                </div>
                <form id="bankAddForm" class="baf-body">
                    <div class="form-group">
                        <label>Question Text <span class="req">*</span></label>
                        <textarea id="bafQuestion" class="form-input" rows="2" required placeholder="Enter the question…"></textarea>
                    </div>
                    <div class="baf-options-grid">
                        <div class="form-group"><label>A <span class="req">*</span></label><input type="text" id="bafOpt0" class="form-input" required></div>
                        <div class="form-group"><label>B <span class="req">*</span></label><input type="text" id="bafOpt1" class="form-input" required></div>
                        <div class="form-group"><label>C <span class="req">*</span></label><input type="text" id="bafOpt2" class="form-input" required></div>
                        <div class="form-group"><label>D <span class="req">*</span></label><input type="text" id="bafOpt3" class="form-input" required></div>
                    </div>
                    <div class="baf-bottom-row">
                        <div class="form-group" style="flex:1;">
                            <label>Correct Answer</label>
                            <select id="bafCorrect" class="form-input form-select">
                                <option value="0">A</option>
                                <option value="1">B</option>
                                <option value="2">C</option>
                                <option value="3">D</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Subject</label>
                            <input type="text" id="bafSubject" class="form-input" placeholder="e.g. Java OOP">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Difficulty</label>
                            <select id="bafDifficulty" class="form-input form-select">
                                <option value="Easy">Easy</option>
                                <option value="Medium" selected>Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>
                    </div>
                    <div class="baf-actions">
                        <button type="button" class="btn btn-secondary baf-cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-success">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><polyline points="20 6 9 17 4 12"/></svg>
                            Save to Bank
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(formWrap);

        const close = () => formWrap.remove();
        formWrap.querySelector('.baf-close-btn').addEventListener('click', close);
        formWrap.querySelector('.baf-cancel-btn').addEventListener('click', close);
        formWrap.addEventListener('click', e => { if (e.target === formWrap) close(); });

        formWrap.querySelector('#bankAddForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const question = formWrap.querySelector('#bafQuestion').value.trim();
            const options = [
                formWrap.querySelector('#bafOpt0').value.trim(),
                formWrap.querySelector('#bafOpt1').value.trim(),
                formWrap.querySelector('#bafOpt2').value.trim(),
                formWrap.querySelector('#bafOpt3').value.trim()
            ];
            const correctAnswer = parseInt(formWrap.querySelector('#bafCorrect').value);
            const subject = formWrap.querySelector('#bafSubject').value.trim();
            const difficulty = formWrap.querySelector('#bafDifficulty').value;
            if (!question || options.some(o => !o)) {
                alert('Question text and all 4 options are required.');
                return;
            }
            const r = await apiRequest('teacher_add_to_bank', { question, options, correctAnswer, subject, difficulty });
            if (r.status === 'success') {
                showToast('Question added to bank!', 'success');
                close();
                if (onSaved) onSaved();
            } else {
                alert(r.message || 'Failed to add question.');
            }
        });
    }

    // Simple HTML escaper for the bank list (avoids XSS from question text)
    function escapeHtmlBank(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // =========================================================================
    // --- CLASS GROUPS ---
    // =========================================================================
    async function loadTeacherGroups() {
        const container = document.getElementById('teacherGroupsContent');
        if (!container) return;
        container.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;">Loading…</div>';

        const res = await apiRequest('teacher_list_groups', {}, 'GET');
        if (res.status !== 'success') { container.innerHTML = '<p>Failed to load groups.</p>'; return; }

        const { groups, allStudents } = res;

        // Get all exams for assignment dropdown
        const exRes = await apiRequest('get_exams', {}, 'GET');
        const allExams = exRes.status === 'success' ? exRes.exams : [];

        container.innerHTML = '';
        const topBar = document.createElement('div');
        topBar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:1.25rem;';
        const createBtn = document.createElement('button');
        createBtn.className = 'btn btn-primary';
        createBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Group`;
        createBtn.addEventListener('click', () => {
            document.getElementById('groupNameInput').value = '';
            document.getElementById('createGroupModal').classList.remove('hidden');
        });
        topBar.appendChild(createBtn);
        container.appendChild(topBar);

        if (groups.length === 0) {
            container.insertAdjacentHTML('beforeend', '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">No groups yet. Create one to restrict exam access.</div>');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'groups-grid';
        groups.forEach(g => {
            const card = document.createElement('div');
            card.className = 'group-card';

            // Member chips
            const memberChips = (g.members || []).map(m =>
                `<span class="member-chip">${m.name} <button class="member-chip-remove" data-gid="${g.id}" data-sid="${m.id}" title="Remove">×</button></span>`
            ).join('') || '<span style="font-size:0.8rem;color:var(--color-text-secondary);">No members yet</span>';

            // Assigned exams
            const assignedIds = (g.exams || []).map(e => e.id);
            const examOpts = allExams.map(e =>
                `<option value="${e.id}" ${assignedIds.includes(e.id)?'selected':''}>${e.title}</option>`
            ).join('');

            card.innerHTML = `
                <div class="group-card-header">
                    <span class="group-card-name">${g.name}</span>
                    <span class="group-member-count">${g.memberCount} members</span>
                </div>
                <div class="group-member-chips" id="chips-${g.id}">${memberChips}</div>
                <div style="display:flex;gap:0.5rem;">
                    <select class="form-input form-select add-member-select" data-gid="${g.id}" style="flex:1;font-size:0.85rem;padding:0.4rem 0.7rem;">
                        <option value="">Add student…</option>
                        ${allStudents.filter(s => !assignedIds.includes(s.id) && !(g.members||[]).find(m=>m.id===s.id))
                            .map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                    <button class="btn btn-secondary btn-small add-member-btn" data-gid="${g.id}">Add</button>
                </div>
                <div>
                    <div style="font-size:0.78rem;font-weight:700;color:var(--color-text-secondary);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.05em;">Restricted Exams</div>
                    <select class="form-input form-select" multiple data-gid="${g.id}" id="examAssign-${g.id}" style="width:100%;min-height:80px;font-size:0.85rem;" size="4">
                        ${examOpts}
                    </select>
                    <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:3px;">Hold Ctrl/Cmd to select multiple</div>
                </div>
                <div class="group-card-actions">
                    <button class="btn btn-secondary btn-small save-exam-assign-btn" data-gid="${g.id}" style="flex:1;">Save Exam Access</button>
                    <button class="btn btn-danger btn-small delete-group-btn" data-gid="${g.id}" data-name="${g.name}" style="flex:0 0 auto;">Delete Group</button>
                </div>
            `;
            grid.appendChild(card);
        });
        container.appendChild(grid);

        // Wire group card events
        container.querySelectorAll('.member-chip-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const res2 = await apiRequest('teacher_group_member', { groupId: parseInt(btn.dataset.gid), studentId: parseInt(btn.dataset.sid), action2: 'remove' });
                if (res2.status === 'success') { showToast('Student removed.', 'success'); loadTeacherGroups(); }
                else alert(res2.message);
            });
        });
        container.querySelectorAll('.add-member-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const gid = parseInt(btn.dataset.gid);
                const sel = container.querySelector(`.add-member-select[data-gid="${gid}"]`);
                const sid = parseInt(sel?.value || 0);
                if (!sid) { alert('Please select a student.'); return; }
                const res2 = await apiRequest('teacher_group_member', { groupId: gid, studentId: sid, action2: 'add' });
                if (res2.status === 'success') { showToast('Student added.', 'success'); loadTeacherGroups(); }
                else alert(res2.message);
            });
        });
        container.querySelectorAll('.save-exam-assign-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const gid = parseInt(btn.dataset.gid);
                const multiSel = document.getElementById(`examAssign-${gid}`);
                const selectedIds = Array.from(multiSel.selectedOptions).map(o => parseInt(o.value));
                const currentIds  = (groups.find(g => g.id === gid)?.exams || []).map(e => e.id);
                // Add newly selected
                for (const eid of selectedIds) if (!currentIds.includes(eid)) await apiRequest('teacher_assign_exam_group', { examId: eid, groupId: gid, assign: true });
                // Remove deselected
                for (const eid of currentIds) if (!selectedIds.includes(eid)) await apiRequest('teacher_assign_exam_group', { examId: eid, groupId: gid, assign: false });
                showToast('Exam access updated!', 'success');
                loadTeacherGroups();
            });
        });
        container.querySelectorAll('.delete-group-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showCustomConfirm('Delete Group', `Delete group "${btn.dataset.name}"? Students keep their accounts.`, async () => {
                    const res2 = await apiRequest('teacher_delete_group', { groupId: parseInt(btn.dataset.gid) });
                    if (res2.status === 'success') { showToast('Group deleted.', 'success'); loadTeacherGroups(); }
                    else alert(res2.message);
                });
            });
        });
    }

    // Create group modal
    const createGroupModal  = document.getElementById('createGroupModal');
    const closeGroupModal   = document.getElementById('closeGroupModal');
    const cancelGroupCreate = document.getElementById('cancelGroupCreate');
    const confirmGroupCreate= document.getElementById('confirmGroupCreate');
    if (closeGroupModal)    closeGroupModal.addEventListener('click', () => createGroupModal.classList.add('hidden'));
    if (cancelGroupCreate)  cancelGroupCreate.addEventListener('click', () => createGroupModal.classList.add('hidden'));
    if (confirmGroupCreate) {
        confirmGroupCreate.addEventListener('click', async () => {
            const name = document.getElementById('groupNameInput').value.trim();
            if (!name) { alert('Group name is required.'); return; }
            const res = await apiRequest('teacher_create_group', { name });
            if (res.status === 'success') {
                createGroupModal.classList.add('hidden');
                showToast(res.message || 'Group created!', 'success');
                loadTeacherGroups();
            } else {
                alert(res.message || 'Failed to create group.');
            }
        });
    }

    // =========================================================================
    // --- STUDENT BADGES (render in My Performance tab) ---
    // =========================================================================
    // Master list of all possible badges (used to render locked vs unlocked states).
    const ALL_BADGES = [
        { type: 'first_pass',    label: 'First Pass',         icon: '🎯', desc: 'Pass your first exam (≥60%)' },
        { type: 'perfect_score', label: 'Perfect Score',      icon: '💯', desc: 'Score 100% on an exam' },
        { type: 'five_exams',    label: 'Five Exams Taken',   icon: '⭐', desc: 'Complete 5 exams' },
        { type: 'ten_exams',     label: 'Ten Exams Taken',    icon: '🏆', desc: 'Complete 10 exams' },
        { type: 'streak_3',      label: '3-Pass Streak',      icon: '🔥', desc: 'Pass 3 exams in a row' }
    ];

    function renderBadgesSection(resultsRes) {
        const section = document.getElementById('studentBadgesSection');
        const grid    = document.getElementById('studentBadgesGrid');
        if (!section || !grid) return;

        const earned = (resultsRes && resultsRes.badges) ? resultsRes.badges : [];
        const earnedByType = {};
        earned.forEach(b => { earnedByType[b.type] = b; });

        if (earned.length === 0) {
            // Show all-locked state — still render so the student can see what's available
            section.style.display = 'block';
            grid.innerHTML = '';
            ALL_BADGES.forEach(b => {
                const card = document.createElement('div');
                card.className = 'badge-card locked';
                card.innerHTML = `
                    <div class="badge-icon">${b.icon}</div>
                    <div class="badge-label">${b.label}</div>
                    <div class="badge-desc">${b.desc}</div>
                    <div class="badge-status">Locked</div>
                `;
                grid.appendChild(card);
            });
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = '';
        ALL_BADGES.forEach(b => {
            const earnedInfo = earnedByType[b.type];
            const card = document.createElement('div');
            card.className = 'badge-card ' + (earnedInfo ? 'earned' : 'locked');
            card.innerHTML = `
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-label">${b.label}</div>
                <div class="badge-desc">${b.desc}</div>
                <div class="badge-status">${earnedInfo ? `Earned · ${earnedInfo.earnedAt.split(' ')[0]}` : 'Locked'}</div>
            `;
            grid.appendChild(card);
        });
    }

    // =========================================================================
    // --- STUDENT PROFILE MODAL (Teacher) ---
    // =========================================================================
    const studentProfileModal  = document.getElementById('studentProfileModal');
    const closeStudentProfile  = document.getElementById('closeStudentProfile');
    if (closeStudentProfile) closeStudentProfile.addEventListener('click', () => studentProfileModal.classList.add('hidden'));

    async function openStudentProfile(studentId, studentName) {
        const body = document.getElementById('studentProfileBody');
        if (!body) return;
        body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading profile…</div>';
        studentProfileModal.classList.remove('hidden');

        const res = await apiRequest('teacher_student_profile', { studentId }, 'POST');
        if (res.status !== 'success') {
            body.innerHTML = `<div style="padding:1.5rem;color:var(--color-danger);">Failed to load profile: ${res.message || 'Unknown error'}</div>`;
            return;
        }

        const { student, attempts, stats, subjectStats, badges } = res;
        const initials = (student.name || 'ST').substring(0, 2).toUpperCase();
        const avatarStr = student.avatar || '';
        const avatarColor = avatarStr.includes(':') ? avatarStr.split(':')[0] : '#3498db';
        const avatarInitials = avatarStr.includes(':') ? avatarStr.split(':')[1] : initials;

        let html = `
            <!-- Student Info Card -->
            <div class="sp-info-card">
                <div class="sp-avatar" style="background:${avatarColor};">${avatarInitials}</div>
                <div class="sp-info">
                    <div class="sp-name">${student.name}</div>
                    <div class="sp-row"><span class="sp-lbl">Email:</span><span class="sp-val">${student.email}</span></div>
                    <div class="sp-row"><span class="sp-lbl">Student ID:</span><span class="sp-val">${student.userId}</span></div>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="sp-stats-row">
                <div class="sp-stat-pill">
                    <div class="sp-stat-num">${stats.totalAttempts}</div>
                    <div class="sp-stat-lbl">Attempts</div>
                </div>
                <div class="sp-stat-pill">
                    <div class="sp-stat-num">${stats.averageScore}%</div>
                    <div class="sp-stat-lbl">Avg Score</div>
                </div>
                <div class="sp-stat-pill">
                    <div class="sp-stat-num">${stats.bestScore}%</div>
                    <div class="sp-stat-lbl">Best Score</div>
                </div>
                <div class="sp-stat-pill">
                    <div class="sp-stat-num">${stats.passRate}%</div>
                    <div class="sp-stat-lbl">Pass Rate</div>
                </div>
            </div>
        `;

        // Subject performance bar chart
        if (subjectStats && subjectStats.length > 0) {
            html += `
                <div class="sp-section">
                    <div class="sp-section-title">Subject Performance</div>
                    <div class="sp-subject-list">
                        ${subjectStats.map(s => {
                            const avg = parseInt(s.avgScore) || 0;
                            const barColor = avg >= 75 ? 'var(--color-success)' : avg >= 50 ? '#f59e0b' : 'var(--color-danger)';
                            return `
                                <div class="sp-subject-row">
                                    <div class="sp-subject-name" title="${s.subject}">${s.subject}</div>
                                    <div class="sp-subject-track">
                                        <div class="sp-subject-fill" style="width:${avg}%;background:${barColor};"></div>
                                    </div>
                                    <div class="sp-subject-pct">${avg}%</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Badges
        if (badges && badges.length > 0) {
            html += `
                <div class="sp-section">
                    <div class="sp-section-title">Badges Earned</div>
                    <div class="sp-badges-list">
                        ${badges.map(b => `
                            <div class="sp-badge-chip" title="${b.label} — ${b.earnedAt}">
                                <span class="sp-badge-icon">${b.icon}</span>
                                <span class="sp-badge-label">${b.label}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Attempt history table
        if (attempts && attempts.length > 0) {
            html += `
                <div class="sp-section">
                    <div class="sp-section-title">Attempt History</div>
                    <div style="overflow-x:auto;border-radius:0.6rem;">
                        <table class="sp-attempts-table">
                            <thead>
                                <tr>
                                    <th>Exam</th>
                                    <th>Subject</th>
                                    <th>Score</th>
                                    <th>Correct</th>
                                    <th>Time</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${attempts.map(a => `
                                    <tr>
                                        <td>${a.examTitle}</td>
                                        <td>${a.subject || '—'}</td>
                                        <td style="font-weight:700;color:${a.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)'};">${a.score}%</td>
                                        <td>${a.correctAnswers}/${a.totalQuestions}</td>
                                        <td>${formatTime(a.timeTaken)}</td>
                                        <td>${(a.completedAt || '').split(' ')[0]}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            html += `<div class="sp-section"><div class="sp-section-title">Attempt History</div><div style="color:var(--color-text-secondary);padding:1rem;">No attempts yet.</div></div>`;
        }

        body.innerHTML = html;
    }

    // =========================================================================
    // --- BULK IMPORT STUDENTS MODAL (Teacher) ---
    // =========================================================================
    const bulkImportModal  = document.getElementById('bulkImportModal');
    const closeBulkImport  = document.getElementById('closeBulkImport');
    const cancelBulkImport = document.getElementById('cancelBulkImport');
    const bulkImportForm   = document.getElementById('bulkImportForm');
    const bulkImportBtn    = document.getElementById('bulkImportBtn');
    const bulkImportResults= document.getElementById('bulkImportResults');
    const downloadCsvTemplate = document.getElementById('downloadCsvTemplate');

    if (closeBulkImport)  closeBulkImport.addEventListener('click',  () => bulkImportModal.classList.add('hidden'));
    if (cancelBulkImport) cancelBulkImport.addEventListener('click', () => bulkImportModal.classList.add('hidden'));

    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', () => {
            bulkImportForm.reset();
            bulkImportResults.style.display = 'none';
            bulkImportResults.innerHTML = '';
            bulkImportModal.classList.remove('hidden');
        });
    }

    // CSV template download (client-side generation, no server roundtrip needed)
    if (downloadCsvTemplate) {
        downloadCsvTemplate.addEventListener('click', (e) => {
            e.preventDefault();
            const csv = 'name,email,student_id,password\nJohn Doe,john@school.com,STD001,secret123\nJane Smith,jane@school.com,STD002,pass456\n';
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fetenax_students_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (bulkImportForm) {
        bulkImportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('bulkImportFile');
            const file = fileInput.files[0];
            if (!file) { alert('Please choose a CSV file first.'); return; }

            // Show "uploading…" state
            const submitBtn = bulkImportForm.querySelector('button[type="submit"]');
            const origText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Uploading…';

            const formData = new FormData();
            formData.append('action', 'teacher_bulk_import');
            formData.append('csv', file);

            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });
                const res = await response.json();
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;

                if (res.status !== 'success') {
                    bulkImportResults.style.display = 'block';
                    bulkImportResults.innerHTML = `<div class="bulk-result-error">❌ ${res.message || 'Import failed.'}</div>`;
                    return;
                }

                // Render per-row result table
                let rowsHTML = `
                    <div class="bulk-result-summary">
                        <span class="brs-pill brs-imported">Imported: ${res.imported}</span>
                        <span class="brs-pill brs-skipped">Skipped: ${res.skipped}</span>
                        <span class="brs-pill brs-errors">Errors: ${res.errors}</span>
                        <span class="brs-pill brs-total">Total rows: ${res.total}</span>
                    </div>
                    <div style="overflow-x:auto;max-height:280px;overflow-y:auto;border-radius:0.5rem;margin-top:0.5rem;">
                        <table class="bulk-result-table">
                            <thead>
                                <tr><th>Row</th><th>Name</th><th>Email</th><th>Status</th><th>Message</th></tr>
                            </thead>
                            <tbody>
                                ${(res.rows || []).map(r => `
                                    <tr class="bulk-row-${r.status}">
                                        <td>${r.row}</td>
                                        <td>${r.name || '—'}</td>
                                        <td>${r.email || '—'}</td>
                                        <td><span class="bulk-status-chip bulk-status-${r.status}">${r.status}</span></td>
                                        <td>${r.message || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                bulkImportResults.style.display = 'block';
                bulkImportResults.innerHTML = rowsHTML;

                if (res.imported > 0) {
                    showToast(`Imported ${res.imported} student(s)!`, 'success');
                    // Refresh teacher dashboard student list after a short delay
                    setTimeout(() => loadTeacherDashboard(), 800);
                }
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
                bulkImportResults.style.display = 'block';
                bulkImportResults.innerHTML = `<div class="bulk-result-error">❌ Network error: ${err.message}</div>`;
            }
        });
    }

    // =========================================================================
    // --- BANK IMPORT PICKER (in Create Exam modal) ---
    // =========================================================================
    const bankImportModal  = document.getElementById('bankImportModal');
    const closeBankImport  = document.getElementById('closeBankImport');
    const cancelBankImport = document.getElementById('cancelBankImport');
    const confirmBankImport= document.getElementById('confirmBankImport');
    const importFromBankBtn= document.getElementById('importFromBankBtn');

    if (importFromBankBtn) {
        importFromBankBtn.addEventListener('click', async () => {
            bankImportModal.classList.remove('hidden');
            await refreshBankPicker('', '');
        });
    }
    if (closeBankImport)  closeBankImport.addEventListener('click',  () => bankImportModal.classList.add('hidden'));
    if (cancelBankImport) cancelBankImport.addEventListener('click', () => bankImportModal.classList.add('hidden'));

    async function refreshBankPicker(search, subject) {
        const list = document.getElementById('bankPickerList');
        list.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;text-align:center;">Loading…</div>';

        let url = `api.php?action=teacher_get_bank`;
        if (search)  url += `&search=${encodeURIComponent(search)}`;
        if (subject) url += `&subject=${encodeURIComponent(subject)}`;
        const res = await fetch(url, { credentials: 'same-origin' }).then(r => r.json());

        if (res.status !== 'success') { list.innerHTML = '<div style="color:var(--color-danger);padding:1rem;">Failed to load bank.</div>'; return; }

        // Populate subject filter
        const subSel = document.getElementById('bankPickerSubject');
        if (subSel && res.subjects) {
            const cur = subSel.value;
            subSel.innerHTML = '<option value="">All Subjects</option>';
            res.subjects.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; subSel.appendChild(o); });
            subSel.value = cur;
        }

        list.innerHTML = '';
        if (!res.questions || res.questions.length === 0) {
            list.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;text-align:center;">No questions in bank yet.</div>';
            return;
        }
        const letters = ['A','B','C','D'];
        res.questions.forEach(q => {
            const row = document.createElement('label');
            row.className = 'bank-picker-row';
            row.innerHTML = `
                <input type="checkbox" value="${q.id}" style="margin-top:3px;flex-shrink:0;accent-color:var(--color-primary);">
                <div>
                    <div class="bank-picker-question">${q.question}</div>
                    <div class="bank-picker-meta">${q.subject || '—'} · ${q.difficulty} · Correct: ${letters[q.correctAnswer]}</div>
                </div>
            `;
            row.addEventListener('change', () => {
                const count = document.querySelectorAll('#bankPickerList input:checked').length;
                document.getElementById('bankPickerSelCount').textContent = `${count} selected`;
                row.classList.toggle('selected', row.querySelector('input').checked);
            });
            list.appendChild(row);
        });
    }

    // Live search + subject filter in bank picker
    const bpSearch = document.getElementById('bankPickerSearch');
    const bpSubject = document.getElementById('bankPickerSubject');
    let bpDebounce;
    if (bpSearch) bpSearch.addEventListener('input', () => {
        clearTimeout(bpDebounce);
        bpDebounce = setTimeout(() => refreshBankPicker(bpSearch.value, bpSubject?.value || ''), 300);
    });
    if (bpSubject) bpSubject.addEventListener('change', () => refreshBankPicker(bpSearch?.value || '', bpSubject.value));

    if (confirmBankImport) {
        confirmBankImport.addEventListener('click', async () => {
            const ids = Array.from(document.querySelectorAll('#bankPickerList input:checked')).map(c => parseInt(c.value));
            if (ids.length === 0) { alert('Select at least one question.'); return; }
            const res = await apiRequest('teacher_import_from_bank', { questionIds: ids });
            if (res.status !== 'success') { alert(res.message || 'Import failed.'); return; }
            bankImportModal.classList.add('hidden');
            res.questions.forEach(q => {
                addQuestionBlock();
                const qc   = document.getElementById('questionsContainer');
                const block = qc.lastElementChild;
                block.querySelector('.question-input').value = q.question;
                const opts  = block.querySelectorAll('.option-input');
                q.options.forEach((o, i) => { if (opts[i]) opts[i].value = o; });
                const radio = block.querySelector(`input[type="radio"][value="${q.correctAnswer}"]`);
                if (radio) radio.checked = true;
            });
            showToast(`${res.questions.length} question(s) imported!`, 'success');
        });
    }

    // =========================================================================
    // --- GLOBAL SEARCH (top-bar quick search across cached data) ---
    // =========================================================================
    const globalSearchInput   = document.getElementById('globalSearchInput');
    const globalSearchResults = document.getElementById('globalSearchResults');
    let gsDebounce = null;

    function renderGlobalSearchResults(query) {
        if (!globalSearchResults) return;
        const q = query.toLowerCase().trim();
        if (q === '') {
            globalSearchResults.classList.add('hidden');
            globalSearchResults.innerHTML = '';
            return;
        }

        const examHits     = searchCache.exams.filter(e =>
            (e.title || '').toLowerCase().includes(q) ||
            (e.subject || '').toLowerCase().includes(q)
        ).slice(0, 6);

        const studentHits  = searchCache.students.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.userId || '').toLowerCase().includes(q)
        ).slice(0, 5);

        const attemptHits  = searchCache.attempts.filter(a =>
            (a.studentName || '').toLowerCase().includes(q) ||
            (a.examTitle || '').toLowerCase().includes(q)
        ).slice(0, 6);

        const total = examHits.length + studentHits.length + attemptHits.length;
        if (total === 0) {
            globalSearchResults.classList.remove('hidden');
            globalSearchResults.innerHTML = `<div class="gsr-empty">No matches for “${escapeHtml(query)}”.</div>`;
            return;
        }

        let html = '';
        if (examHits.length > 0) {
            html += `<div class="gsr-section-title">Exams</div>`;
            examHits.forEach(e => {
                html += `
                    <div class="gsr-item" data-kind="exam" data-id="${e.id}">
                        <div class="gsr-item-icon">${(e.subject || 'E').charAt(0).toUpperCase()}</div>
                        <div class="gsr-item-main">
                            <div class="gsr-item-title">${escapeHtml(e.title || '')}</div>
                            <div class="gsr-item-sub">${escapeHtml(e.subject || '')} · ${e.totalQuestions || 0} Qs · ${e.difficulty || '—'}</div>
                        </div>
                    </div>
                `;
            });
        }
        if (studentHits.length > 0) {
            html += `<div class="gsr-section-title">Students</div>`;
            studentHits.forEach(s => {
                html += `
                    <div class="gsr-item" data-kind="student" data-id="${s.id}" data-name="${escapeHtml(s.name || '')}">
                        <div class="gsr-item-icon">${(s.name || 'S').substring(0,1).toUpperCase()}</div>
                        <div class="gsr-item-main">
                            <div class="gsr-item-title">${escapeHtml(s.name || '')}</div>
                            <div class="gsr-item-sub">${escapeHtml(s.email || '')} · ID ${escapeHtml(s.userId || '')}</div>
                        </div>
                    </div>
                `;
            });
        }
        if (attemptHits.length > 0) {
            html += `<div class="gsr-section-title">Attempts</div>`;
            attemptHits.forEach(a => {
                html += `
                    <div class="gsr-item" data-kind="attempt" data-exam-id="${a.examId}">
                        <div class="gsr-item-icon">${(a.studentName || a.examTitle || 'A').substring(0,1).toUpperCase()}</div>
                        <div class="gsr-item-main">
                            <div class="gsr-item-title">${escapeHtml(a.studentName || 'Student')} → ${escapeHtml(a.examTitle || '')}</div>
                            <div class="gsr-item-sub">${a.score}% · ${(a.completedAt || '').split(' ')[0]}</div>
                        </div>
                    </div>
                `;
            });
        }

        globalSearchResults.classList.remove('hidden');
        globalSearchResults.innerHTML = html;

        // Wire click handlers
        globalSearchResults.querySelectorAll('.gsr-item').forEach(item => {
            item.addEventListener('click', () => {
                const kind = item.getAttribute('data-kind');
                if (kind === 'exam') {
                    const examId = parseInt(item.getAttribute('data-id'));
                    // Student → open practice; Teacher → jump to exam settings tab
                    if (currentUser.role === 'student') {
                        startExam(examId);
                    } else {
                        switchTab('teacher', 'teacher-exams');
                    }
                } else if (kind === 'student') {
                    const sid = parseInt(item.getAttribute('data-id'));
                    openStudentProfile(sid, item.getAttribute('data-name') || '');
                } else if (kind === 'attempt') {
                    // Teacher: jump to attempts tab; Student: jump to performance tab
                    if (currentUser.role === 'teacher') {
                        switchTab('teacher', 'teacher-attempts');
                    } else {
                        switchTab('student', 'student-history');
                    }
                }
                globalSearchResults.classList.add('hidden');
                if (globalSearchInput) globalSearchInput.value = '';
            });
        });
    }

    // Simple HTML-escaper for safe display of user-entered text in search results
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', function () {
            clearTimeout(gsDebounce);
            gsDebounce = setTimeout(() => renderGlobalSearchResults(this.value), 180);
        });
        globalSearchInput.addEventListener('focus', function () {
            if (this.value.trim() !== '') renderGlobalSearchResults(this.value);
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.header-search-wrap')) {
                if (globalSearchResults) globalSearchResults.classList.add('hidden');
            }
        });
        // Esc closes dropdown
        globalSearchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                globalSearchResults.classList.add('hidden');
                this.blur();
            }
        });
    }

    // =========================================================================
    // --- NOTIFICATION SYSTEM ---
    // =========================================================================
    const notifBellBtn   = document.getElementById('notifBellBtn');
    const notifDropdown  = document.getElementById('notifDropdown');
    const notifList      = document.getElementById('notifList');
    const notifBadge     = document.getElementById('notifBadge');
    const notifMarkAll   = document.getElementById('notifMarkAllRead');
    let notifPollTimer = null;

    async function loadNotifications() {
        if (!currentUser) return;
        const res = await apiRequest('get_notifications', {}, 'GET');
        if (res.status !== 'success') return;

        // Update badge
        if (res.unreadCount > 0) {
            notifBadge.textContent = res.unreadCount > 99 ? '99+' : res.unreadCount;
            notifBadge.classList.remove('hidden');
        } else {
            notifBadge.classList.add('hidden');
        }

        // Render list
        if (res.notifications.length === 0) {
            notifList.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);font-size:0.88rem;">No notifications yet.</div>';
            return;
        }
        notifList.innerHTML = res.notifications.map(n => {
            const iconMap = {
                new_exam: '📋', exam_graded: '✅', exam_completed: '📝',
                badge_earned: '🏅', new_student: '👤', low_performing: '⚠️'
            };
            const icon = iconMap[n.type] || '🔔';
            const timeAgo = formatTimeAgo(n.createdAt);
            return `
                <div class="notif-item ${n.isRead == 0 ? 'unread' : ''}" data-id="${n.id}" data-link="${n.link || ''}">
                    <div class="notif-icon">${icon}</div>
                    <div class="notif-body">
                        <div class="notif-title">${escapeHtmlNotif(n.title)}</div>
                        <div class="notif-msg">${escapeHtmlNotif(n.message)}</div>
                        <div class="notif-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Wire click handlers
        notifList.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = parseInt(item.dataset.id);
                const link = item.dataset.link;
                // Mark as read
                await apiRequest('mark_notification_read', { notifId: id });
                // Navigate if link exists
                if (link) {
                    if (currentUser.role === 'student') {
                        switchTab('student', link);
                    } else {
                        switchTab('teacher', link);
                    }
                }
                notifDropdown.classList.add('hidden');
                loadNotifications(); // refresh
            });
        });
    }

    function formatTimeAgo(dateStr) {
        const d = new Date(dateStr + 'Z');
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff/60) + 'm ago';
        if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
        return Math.floor(diff/86400) + 'd ago';
    }

    function escapeHtmlNotif(str) {
        if (str == null) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    if (notifBellBtn) {
        notifBellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('hidden');
            if (!notifDropdown.classList.contains('hidden')) loadNotifications();
        });
    }
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifBellWrap')) notifDropdown.classList.add('hidden');
    });
    if (notifMarkAll) {
        notifMarkAll.addEventListener('click', async (e) => {
            e.stopPropagation();
            await apiRequest('mark_all_notifications_read');
            loadNotifications();
        });
    }

    // =========================================================================
    // --- CALENDAR VIEW (Student) ---
    // =========================================================================
    let calendarCurrentDate = new Date();

    async function loadCalendar() {
        const container = document.getElementById('calendarContent');
        if (!container) return;
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading calendar…</div>';

        const year  = calendarCurrentDate.getFullYear();
        const month = calendarCurrentDate.getMonth() + 1;
        const res = await apiRequest('get_calendar_data', { year, month }, 'GET');
        if (res.status !== 'success') {
            container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load calendar.</div>';
            return;
        }

        // Group events by date
        const eventsByDate = {};
        (res.events || []).forEach(ev => {
            if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
            eventsByDate[ev.date].push(ev);
        });

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

        let html = `
            <div class="calendar-widget">
                <div class="cal-header">
                    <button id="calPrev" class="cal-nav-btn" title="Previous month">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <h3 class="cal-month-title">${monthNames[month-1]} ${year}</h3>
                    <button id="calNext" class="cal-nav-btn" title="Next month">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
                <div class="cal-weekdays">
                    ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-weekday">${d}</div>`).join('')}
                </div>
                <div class="cal-grid">
        `;
        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const events = eventsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const eventDots = events.map(ev => `<span class="cal-event-dot ev-${ev.type}" title="${escapeHtmlNotif(ev.title)}"></span>`).join('');
            const eventList = events.length > 0
                ? `<div class="cal-events">${events.map(ev => `<div class="cal-event ev-${ev.type}" title="${escapeHtmlNotif(ev.title)}">${escapeHtmlNotif(ev.title)}</div>`).join('')}</div>`
                : '';
            html += `<div class="cal-day ${isToday ? 'is-today' : ''} ${events.length > 0 ? 'has-events' : ''}">
                <div class="cal-day-num">${day}</div>
                ${eventDots ? `<div class="cal-dots">${eventDots}</div>` : ''}
                ${eventList}
            </div>`;
        }
        html += '</div>';

        // Legend
        html += `
            <div class="cal-legend">
                <div class="cal-legend-item"><span class="cal-event-dot ev-exam_open"></span> Exam opens</div>
                <div class="cal-legend-item"><span class="cal-event-dot ev-exam_close"></span> Exam closes</div>
                <div class="cal-legend-item"><span class="cal-event-dot ev-attempt"></span> Your attempt</div>
            </div>
        </div>`;

        container.innerHTML = html;

        // Wire nav buttons
        document.getElementById('calPrev')?.addEventListener('click', () => {
            calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
            loadCalendar();
        });
        document.getElementById('calNext')?.addEventListener('click', () => {
            calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
            loadCalendar();
        });
    }

    // =========================================================================
    // --- PAST ATTEMPTS REVIEW (re-open a previous attempt's results) ---
    // =========================================================================
    async function openPastAttempt(resultId) {
        const res = await apiRequest('get_attempt_review', { resultId }, 'POST');
        if (res.status !== 'success') {
            alert(res.message || 'Failed to load attempt.');
            return;
        }

        // Populate the results page with this attempt's data
        const { result, answerReview, hasAnswerData } = res;
        const pct = result.score;

        // Score ring
        const circumference = 2 * Math.PI * 82;
        const fillOffset = circumference - (pct / 100) * circumference;
        const ring = document.getElementById('scoreRingFill');
        if (ring) {
            ring.style.strokeDasharray  = circumference;
            ring.style.strokeDashoffset = circumference;
            ring.classList.remove('ring-pass','ring-fail');
            ring.classList.add(pct >= 60 ? 'ring-pass' : 'ring-fail');
            requestAnimationFrame(() => {
                ring.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
                ring.style.strokeDashoffset = fillOffset;
            });
        }

        document.getElementById('finalScore').textContent     = pct + '%';
        document.getElementById('correctAnswers').textContent = `${result.correctAnswers}/${result.totalQuestions}`;
        document.getElementById('timeTaken').textContent      = formatTime(result.timeTaken);
        const totalQsEl = document.getElementById('resultsTotalQs');
        if (totalQsEl) totalQsEl.textContent = result.totalQuestions;
        const pointsEl = document.getElementById('resultsPoints');
        if (pointsEl) pointsEl.textContent = '—';
        const titleEl = document.getElementById('reviewExamTitle');
        if (titleEl) titleEl.textContent = result.examTitle;

        // Pass/Fail + subtitle
        const badge = document.getElementById('passBadge');
        if (badge) {
            badge.textContent = pct >= 60 ? '✓ Passed' : '✗ Failed';
            badge.className = 'pass-badge ' + (pct >= 60 ? 'badge-pass' : 'badge-fail');
        }
        const subtitleEl = document.getElementById('resultsSubtitle');
        if (subtitleEl) subtitleEl.textContent = `Completed on ${(result.completedAt || '').split(' ')[0]} at ${(result.completedAt || '').split(' ')[1] || ''}`;

        // Hide badges row for past attempts
        const badgesRow = document.getElementById('resultsBadges');
        if (badgesRow) { badgesRow.style.display = 'none'; badgesRow.innerHTML = ''; }

        // Answer review list
        const reviewList = document.getElementById('answerReviewList');
        if (reviewList && answerReview && answerReview.length > 0) {
            reviewList.innerHTML = '';
            const optLetters = ['A','B','C','D'];
            answerReview.forEach((item, idx) => {
                const div = document.createElement('div');
                div.className = 'ar-item ' + (item.isCorrect ? 'ar-correct' : 'ar-wrong');
                const selLetter = item.selectedAnswer !== null ? optLetters[item.selectedAnswer] : '—';
                const corrLetter = optLetters[item.correctAnswer];
                const selText    = item.selectedAnswer !== null ? item.options[item.selectedAnswer] : 'No answer';
                const corrText   = item.options[item.correctAnswer];
                const statusBadge = item.selectedAnswer === null
                    ? '<span class="ar-status ar-status-skipped">Skipped</span>'
                    : (item.isCorrect ? '<span class="ar-status ar-status-correct">Correct</span>' : '<span class="ar-status ar-status-wrong">Wrong</span>');
                div.innerHTML = `
                    <div class="ar-icon">${item.isCorrect ? '✓' : (item.selectedAnswer === null ? '○' : '✗')}</div>
                    <div class="ar-body">
                        <div class="ar-qnum">Q${idx + 1} ${statusBadge}</div>
                        <div class="ar-qtext">${escapeHtmlNotif(item.question)}</div>
                        <div class="ar-answer-row">
                            ${item.isCorrect
                                ? `<span class="ar-your-answer">Your answer: <b>${selLetter}. ${escapeHtmlNotif(selText)}</b></span>`
                                : `<span class="ar-your-answer">Your answer: <b>${selLetter}. ${escapeHtmlNotif(selText)}</b></span>
                                   &nbsp;·&nbsp;
                                   <span class="ar-correct-answer">Correct: <b>${corrLetter}. ${escapeHtmlNotif(corrText)}</b></span>`
                            }
                        </div>
                    </div>
                `;
                reviewList.appendChild(div);
            });
        } else if (reviewList) {
            reviewList.innerHTML = '<div style="color:var(--color-text-secondary);font-size:0.88rem;text-align:center;padding:1rem;">No detailed answer data available for this attempt.</div>';
        }

        // Show results page
        document.getElementById('examInterface').classList.add('hidden');
        const rp = document.getElementById('resultsPage');
        rp.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // =========================================================================
    // --- TEACHER: Question Analytics Modal ---
    // =========================================================================
    const questionAnalyticsModal = document.getElementById('questionAnalyticsModal');
    const closeQuestionAnalytics = document.getElementById('closeQuestionAnalytics');
    if (closeQuestionAnalytics) closeQuestionAnalytics.addEventListener('click', () => questionAnalyticsModal.classList.add('hidden'));

    async function openQuestionAnalytics(examId, examTitle) {
        const body = document.getElementById('questionAnalyticsBody');
        const titleEl = document.getElementById('qaModalTitle');
        if (titleEl) titleEl.textContent = 'Analytics: ' + (examTitle || '');
        if (body) body.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">Loading…</div>';
        questionAnalyticsModal.classList.remove('hidden');

        const res = await apiRequest('teacher_question_analytics', { examId }, 'POST');
        if (res.status !== 'success') {
            body.innerHTML = `<div style="padding:1.5rem;color:var(--color-danger);">${res.message || 'Failed to load.'}</div>`;
            return;
        }
        const analytics = res.analytics || [];
        if (analytics.length === 0) {
            body.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">No questions found.</div>';
            return;
        }

        const letters = ['A','B','C','D'];
        body.innerHTML = analytics.map((q, idx) => {
            const pct = q.pctCorrect;
            const barColor = pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f59e0b' : '#e74c3c';
            const reviewBadge = q.needsReview ? '<span class="qa-review-flag">⚠ Needs Review</span>' : '';
            const maxDist = Math.max(...q.distribution, 1);
            return `
                <div class="qa-question-card ${q.needsReview ? 'needs-review' : ''}">
                    <div class="qa-q-header">
                        <span class="qa-q-num">Q${idx+1}</span>
                        <span class="qa-q-text">${escapeHtmlNotif(q.question)}</span>
                        ${reviewBadge}
                    </div>
                    <div class="qa-stats-row">
                        <div class="qa-pct-circle" style="--pct-color:${barColor};">
                            <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-border)" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="var(--pct-color)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${2*Math.PI*16}" stroke-dashoffset="${2*Math.PI*16 - (pct/100)*2*Math.PI*16}" transform="rotate(-90 20 20)"/></svg>
                            <div class="qa-pct-val">${pct}%</div>
                        </div>
                        <div class="qa-dist-bars">
                            ${q.distribution.map((count, i) => {
                                const heightPct = (count / maxDist) * 100;
                                const isCorrect = i === q.correctAnswer;
                                return `<div class="qa-dist-bar ${isCorrect ? 'is-correct' : ''}">
                                    <div class="qa-dist-fill" style="height:${heightPct}%;background:${isCorrect ? '#2ecc71' : '#94a3b8'};"></div>
                                    <div class="qa-dist-letter">${letters[i]}</div>
                                    <div class="qa-dist-count">${count}</div>
                                </div>`;
                            }).join('')}
                        </div>
                        <div class="qa-meta">
                            <div class="qa-meta-row"><span class="qa-meta-lbl">Attempts:</span> <b>${q.totalAttempts}</b></div>
                            <div class="qa-meta-row"><span class="qa-meta-lbl">Correct:</span> <b style="color:#2ecc71;">${q.correctCount}</b></div>
                            <div class="qa-meta-row"><span class="qa-meta-lbl">Unanswered:</span> <b>${q.unanswered}</b></div>
                            ${q.mostCommonWrong ? `<div class="qa-meta-row"><span class="qa-meta-lbl">Common wrong:</span> <b style="color:#e74c3c;">${letters[q.mostCommonWrong.index]} (${q.mostCommonWrong.count}×)</b></div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // =========================================================================
    // --- TEACHER: Exam Preview Mode ---
    // =========================================================================
    async function previewExam(examId) {
        // Use the preview API to get full exam data including correct answers
        const res = await apiRequest('teacher_preview_exam', { examId }, 'POST');
        if (res.status !== 'success') {
            alert(res.message || 'Failed to load exam preview.');
            return;
        }
        // Load it into the exam interface but in preview mode (no submit, no protection)
        currentExam = res.exam;
        // Add a flag so renderQuestion knows it's a preview
        currentExam._isPreview = true;
        const total = currentExam.questions.length;
        currentExamAnswers = Array(total).fill(null);
        currentExamFlags   = Array(total).fill(false);
        currentExamIndex   = 0;

        document.getElementById('candidateName').textContent    = currentUser.name + ' (Preview)';
        document.getElementById('candidateId').textContent      = 'PREVIEW MODE';
        document.getElementById('examSubjectName').textContent  = currentExam.subject;
        document.getElementById('examTitle').textContent        = currentExam.title + ' — PREVIEW';

        dashboard.classList.add('hidden');
        document.getElementById('examInterface').classList.remove('hidden');
        // Don't start timer or enable protection in preview mode
        document.getElementById('examTimerContainer')?.classList.add('practice-hidden');
        renderQuestion();
        renderQuestionsGrid();
        showToast('Preview mode — no answers will be saved.', 'success');
    }

    // =========================================================================
    // --- TEACHER: Bulk Exam Import from CSV ---
    // =========================================================================
    const bulkExamImportBtn   = document.getElementById('bulkExamImportBtn');
    const bulkExamImportModal = document.getElementById('bulkExamImportModal');
    const bulkExamImportForm  = document.getElementById('bulkExamImportForm');
    const closeBulkExamImport = document.getElementById('closeBulkExamImport');
    const cancelBulkExamImport= document.getElementById('cancelBulkExamImport');
    const bulkExamImportResults = document.getElementById('bulkExamImportResults');

    if (closeBulkExamImport)  closeBulkExamImport.addEventListener('click',  () => bulkExamImportModal.classList.add('hidden'));
    if (cancelBulkExamImport) cancelBulkExamImport.addEventListener('click', () => bulkExamImportModal.classList.add('hidden'));
    if (bulkExamImportBtn) {
        bulkExamImportBtn.addEventListener('click', () => {
            bulkExamImportForm.reset();
            bulkExamImportResults.style.display = 'none';
            bulkExamImportResults.innerHTML = '';
            bulkExamImportModal.classList.remove('hidden');
        });
    }
    if (bulkExamImportForm) {
        bulkExamImportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('bulkExamCsvFile');
            const file = fileInput.files[0];
            if (!file) { alert('Please choose a CSV file.'); return; }
            const formData = new FormData();
            formData.append('action', 'teacher_bulk_import_exam');
            formData.append('csv', file);
            formData.append('title', document.getElementById('bulkExamTitle').value.trim());
            formData.append('subject', document.getElementById('bulkExamSubject').value.trim());
            formData.append('duration', document.getElementById('bulkExamDuration').value);
            formData.append('difficulty', document.getElementById('bulkExamDifficulty').value);

            const submitBtn = bulkExamImportForm.querySelector('button[type="submit"]');
            const origText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Importing…';

            try {
                const response = await fetch('api.php', { method: 'POST', body: formData, credentials: 'same-origin' });
                const res = await response.json();
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;

                if (res.status !== 'success') {
                    bulkExamImportResults.style.display = 'block';
                    bulkExamImportResults.innerHTML = `<div class="bulk-result-error">❌ ${res.message || 'Import failed.'}</div>`;
                    return;
                }
                bulkExamImportResults.style.display = 'block';
                bulkExamImportResults.innerHTML = `
                    <div class="bulk-result-summary">
                        <span class="brs-pill brs-imported">Imported: ${res.imported}</span>
                        <span class="brs-pill brs-errors">Errors: ${res.errors}</span>
                    </div>
                    <div style="margin-top:0.5rem;color:var(--color-text-secondary);font-size:0.85rem;">${res.message}</div>
                `;
                if (res.imported > 0) {
                    showToast(`Imported ${res.imported} questions!`, 'success');
                    setTimeout(() => {
                        bulkExamImportModal.classList.add('hidden');
                        loadTeacherDashboard();
                    }, 1500);
                }
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
                bulkExamImportResults.style.display = 'block';
                bulkExamImportResults.innerHTML = `<div class="bulk-result-error">❌ Network error: ${err.message}</div>`;
            }
        });
    }

    // =========================================================================
    // --- INIT ---
    // =========================================================================
    checkAuthStatus();

    // Start notification polling after auth check
    setTimeout(() => {
        if (currentUser) {
            loadNotifications();
            notifPollTimer = setInterval(loadNotifications, 60000); // poll every 60s
        }
    }, 2000);
});
