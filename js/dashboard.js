// js/dashboard.js - Dashboard layout, sidebar, and tab switching for FetenaX
// No DOMContentLoaded wrapper — called from app.js after DOM is ready.

// =========================================================================
// TAB SWITCHING
// =========================================================================

/**
 * Switch active tab in a dashboard.
 * @param {string} role - 'student' or 'teacher'
 * @param {string} tabId - e.g. 'student-exams', 'teacher-overview'
 */
function switchTab(role, tabId) {
    var container = role === 'student' ? document.getElementById('studentDashboard') : document.getElementById('teacherDashboard');
    var nav = role === 'student' ? document.getElementById('studentNav') : document.getElementById('teacherNav');

    container.querySelectorAll('.tab-content').forEach(function (tab) { tab.classList.add('hidden'); });
    var targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    nav.querySelectorAll('.menu-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    nav.querySelectorAll('.menu-group').forEach(function (group) {
        var hasActive = group.querySelector('.menu-item.active') !== null;
        var header = group.querySelector('.menu-group-header');
        if (header) {
            header.classList.toggle('active', hasActive);
        }
        if (hasActive) {
            group.classList.add('open');
        }
    });

    var mainContentTitle = document.getElementById('mainContentTitle');
    var mainContentSubtitle = document.getElementById('mainContentSubtitle');

    var titles = {
        'student-exams':        { title: 'Available Exams',      subtitle: 'Select an exam and test your knowledge' },
        'student-subjects':     { title: 'Practice by Subject',  subtitle: 'Focus on one subject at a time with instant feedback' },
        'student-mock':         { title: 'Mock Exit Exam',       subtitle: 'Simulate the real 3-hour, 115-question exit exam' },
        'student-srs':          { title: 'Review Queue (SRS)',   subtitle: 'Spaced-repetition queue — questions you missed, scheduled to reappear' },
        'student-mastery':      { title: 'Subject Mastery',      subtitle: 'Radar chart + history of your per-subject accuracy' },
        'student-weakness':     { title: 'My Weaknesses',        subtitle: 'Diagnostic report with smart recommendations' },
        'student-history':      { title: 'My Performance',       subtitle: 'Track your progress and attempt history' },
        'student-schedule':     { title: 'Study Schedule',       subtitle: 'Plan your study sessions on the calendar' },
        'student-resources':    { title: 'Study Resources',      subtitle: 'Curated textbook chapters, videos, and notes by subject' },
        'student-leaderboard':  { title: 'Leaderboard',          subtitle: 'See how you rank against other students' },
        'student-calendar':     { title: 'Calendar',             subtitle: 'Upcoming exams and your attempt history' },
        'student-settings':     { title: 'Profile Settings',     subtitle: 'Update your name, avatar and password' },
        'teacher-overview':     { title: 'Dashboard Overview',   subtitle: 'Real-time statistics and recent activity summary' },
        'teacher-exams':        { title: 'Exam Settings',        subtitle: 'Create, analyse and manage examinations' },
        'teacher-students':     { title: 'Student Accounts',     subtitle: 'Manage student registrations and credentials' },
        'teacher-attempts':     { title: 'Review Attempts',      subtitle: 'Inspect student exam papers and results' },
        'teacher-bank':         { title: 'Question Bank',        subtitle: 'Manage reusable questions for any exam' },
        'teacher-groups':       { title: 'Class Groups',         subtitle: 'Organise students into groups and assign exams' },
        'teacher-codes':        { title: 'Access Codes',         subtitle: 'View and manage exam access codes' },
        'teacher-analytics':    { title: 'Class Analytics',       subtitle: 'Class-wide subject mastery, pass rates, and hardest questions' },
        'teacher-progress':     { title: 'Student Progress',      subtitle: 'Per-student mastery across subjects — identify who needs help' },
        'teacher-resources':    { title: 'Study Resources',      subtitle: 'Add curated study materials for students' },
        'teacher-admin':        { title: 'System Administration', subtitle: 'Manage users, roles and platform-wide activity' },
        'teacher-settings':     { title: 'Profile Settings',     subtitle: 'Update your name, avatar and password' }
    };

    if (titles[tabId] && mainContentTitle && mainContentSubtitle) {
        mainContentTitle.textContent = titles[tabId].title;
        mainContentSubtitle.textContent = titles[tabId].subtitle;
    }

    // Lazy-load tab content
    if (tabId === 'student-leaderboard')  loadLeaderboard();
    if (tabId === 'student-calendar')     loadCalendar();
    if (tabId === 'student-settings')     loadSettingsPanel('student');
    if (tabId === 'student-subjects')     loadStudentSubjects();
    if (tabId === 'student-mock')         loadMockExam();
    if (tabId === 'student-srs')          loadSrsQueue();
    if (tabId === 'student-mastery')      loadSubjectMastery();
    if (tabId === 'student-weakness')     loadWeaknessReport();
    if (tabId === 'student-schedule')     loadStudySchedule();
    if (tabId === 'student-resources')    loadStudyResourcesStudent();
    if (tabId === 'teacher-bank')         loadTeacherBank();
    if (tabId === 'teacher-groups')       loadTeacherGroups();
    if (tabId === 'teacher-codes')        loadAccessCodes();
    if (tabId === 'teacher-analytics')    loadClassAnalytics();
    if (tabId === 'teacher-admin')        loadSystemAdminDashboard();
    if (tabId === 'teacher-progress')     loadStudentProgress();
    if (tabId === 'teacher-resources')    loadTeacherResources();
    if (tabId === 'teacher-settings')     loadSettingsPanel('teacher');
}

// =========================================================================
// DASHBOARD RENDERING
// =========================================================================

/**
 * Show the appropriate dashboard for the user's role.
 * @param {string} role
 */
function showDashboardForRole(role) {
    document.getElementById('dashboard').classList.remove('hidden');

    var topNavbar = document.querySelector('.navbar');
    if (topNavbar) topNavbar.classList.add('hidden');

    var studentNav = document.getElementById('studentNav');
    var teacherNav = document.getElementById('teacherNav');

    var initials = (currentUser.name || currentUser.email || 'US').substring(0, 2).toUpperCase();
    var roleLabel = role === 'system_admin' ? 'System Admin' : role === 'teacher' ? 'Teacher' : role === 'student' ? 'Student' : role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('sidebarUserName').textContent = currentUser.name || currentUser.email;
    document.getElementById('sidebarUserRole').textContent = roleLabel;

    if (role === 'student') {
        document.getElementById('studentDashboard').classList.remove('hidden');
        document.getElementById('teacherDashboard').classList.add('hidden');
        studentNav.classList.remove('hidden');
        teacherNav.classList.add('hidden');
        studentNav.querySelectorAll('.menu-item').forEach(function (btn) { btn.classList.remove('active'); });

        // Honor PWA shortcut deep link (e.g. ?action=mock → student-mock tab)
        var pendingTab = 'student-exams';
        try {
            var action = localStorage.getItem('fetenax_pending_action');
            if (action) {
                var map = {
                    'mock': 'student-mock',
                    'practice': 'student-subjects',
                    'mastery': 'student-mastery',
                    'srs': 'student-srs',
                    'weakness': 'student-weakness',
                    'schedule': 'student-schedule',
                    'resources': 'student-resources',
                    'history': 'student-history'
                };
                if (map[action]) pendingTab = map[action];
                localStorage.removeItem('fetenax_pending_action');
            }
        } catch (e) {}

        var targetBtn = studentNav.querySelector('[data-tab="' + pendingTab + '"]');
        if (targetBtn) targetBtn.classList.add('active');
        else studentNav.querySelector('[data-tab="student-exams"]').classList.add('active');
        switchTab('student', pendingTab);
        loadStudentDashboard();
    } else {
        document.getElementById('teacherDashboard').classList.remove('hidden');
        document.getElementById('studentDashboard').classList.add('hidden');
        teacherNav.classList.remove('hidden');
        studentNav.classList.add('hidden');
        teacherNav.querySelectorAll('.menu-item').forEach(function (btn) { btn.classList.remove('active'); });
        var adminNavItem = teacherNav.querySelector('[data-tab="teacher-admin"]');
        if (adminNavItem) {
            adminNavItem.style.display = role === 'system_admin' ? '' : 'none';
        }
        teacherNav.querySelector('[data-tab="teacher-overview"]').classList.add('active');
        switchTab('teacher', 'teacher-overview');
        loadTeacherDashboard();
    }
}
