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

    var mainContentTitle = document.getElementById('mainContentTitle');
    var mainContentSubtitle = document.getElementById('mainContentSubtitle');

    var titles = {
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
    if (tabId === 'teacher-bank')         loadTeacherBank();
    if (tabId === 'teacher-groups')       loadTeacherGroups();
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
    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('sidebarUserName').textContent = currentUser.name || currentUser.email;
    document.getElementById('sidebarUserRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);

    if (role === 'student') {
        document.getElementById('studentDashboard').classList.remove('hidden');
        document.getElementById('teacherDashboard').classList.add('hidden');
        studentNav.classList.remove('hidden');
        teacherNav.classList.add('hidden');
        studentNav.querySelectorAll('.menu-item').forEach(function (btn) { btn.classList.remove('active'); });
        studentNav.querySelector('[data-tab="student-exams"]').classList.add('active');
        switchTab('student', 'student-exams');
        loadStudentDashboard();
    } else {
        document.getElementById('teacherDashboard').classList.remove('hidden');
        document.getElementById('studentDashboard').classList.add('hidden');
        teacherNav.classList.remove('hidden');
        studentNav.classList.add('hidden');
        teacherNav.querySelectorAll('.menu-item').forEach(function (btn) { btn.classList.remove('active'); });
        teacherNav.querySelector('[data-tab="teacher-overview"]').classList.add('active');
        switchTab('teacher', 'teacher-overview');
        loadTeacherDashboard();
    }
}
