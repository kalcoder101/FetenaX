// js/app.js - FetenaX initialization & event binding
// DOMContentLoaded handler — wires up all UI interactions

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // =========================================================================
    // DOM REFS
    // =========================================================================

    var dashboard       = document.getElementById('dashboard');
    var authModal       = document.getElementById('authModal');
    var resultsPage     = document.getElementById('resultsPage');
    var logoutBtn       = document.getElementById('logoutBtn');
    var sidebarLogout   = document.getElementById('sidebarLogoutBtn');
    var themeToggle     = document.getElementById('themeToggle');
    var mainThemeToggle = document.getElementById('mainThemeToggle');
    var aboutBtn        = document.getElementById('aboutBtn');
    var mainAboutBtn    = document.getElementById('mainAboutBtn');
    var aboutPage       = document.getElementById('aboutFullPage');
    var aboutBackBtn    = document.getElementById('aboutBackBtn');
    var authForm        = document.getElementById('authForm');
    var authTabLogin    = document.getElementById('authTabLogin');
    var authTabSignup   = document.getElementById('authTabSignup');
    var switchAuthMode  = document.getElementById('switchAuthMode');
    var togglePassword  = document.getElementById('toggleAuthPassword');

    // =========================================================================
    // THEME TOGGLE (dark / light mode)
    // =========================================================================

    function toggleTheme() {
        var root = document.documentElement;
        var current = root.getAttribute('data-theme');
        root.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        localStorage.setItem('theme', root.getAttribute('data-theme'));
    }

    // Restore saved theme
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Default to dark
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (themeToggle)     themeToggle.addEventListener('click', toggleTheme);
    if (mainThemeToggle) mainThemeToggle.addEventListener('click', toggleTheme);

    // =========================================================================
    // ABOUT PAGE
    // =========================================================================

    function showAboutPage() {
        aboutPage.classList.remove('hidden');
        dashboard.classList.add('hidden');
        resultsPage.classList.add('hidden');
        document.getElementById('examInterface').classList.add('hidden');
        var navbar = document.querySelector('.navbar');
        if (navbar) navbar.classList.remove('hidden');
    }

    function hideAboutPage() {
        aboutPage.classList.add('hidden');
        dashboard.classList.remove('hidden');
        var navbar = document.querySelector('.navbar');
        if (navbar) navbar.classList.add('hidden');
    }

    if (aboutBtn)     aboutBtn.addEventListener('click', showAboutPage);
    if (mainAboutBtn) mainAboutBtn.addEventListener('click', showAboutPage);
    if (aboutBackBtn) aboutBackBtn.addEventListener('click', hideAboutPage);

    // =========================================================================
    // AUTH FORM
    // =========================================================================

    // Wire auth tabs
    if (authTabLogin) {
        authTabLogin.addEventListener('click', function () {
            setAuthMode(true);
            if (authForm) authForm.reset();
        });
    }
    if (authTabSignup) {
        authTabSignup.addEventListener('click', function () {
            setAuthMode(false);
            if (authForm) authForm.reset();
        });
    }

    // Legacy switch button
    if (switchAuthMode) {
        switchAuthMode.addEventListener('click', function (e) {
            e.preventDefault();
            setAuthMode(!isLoginMode);
            if (authForm) authForm.reset();
        });
    }

    // Password visibility toggle
    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            var pwInput = document.getElementById('authPassword');
            if (!pwInput) return;
            var type = pwInput.type === 'password' ? 'text' : 'password';
            pwInput.type = type;
            // Toggle eye icon
            var paths = this.querySelectorAll('path');
            if (paths.length > 0) {
                // Simple toggle: change opacity to indicate state
                this.style.opacity = type === 'text' ? '0.6' : '1';
            }
        });
    }

    // Auth form submit
    if (authForm) {
        authForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var username = document.getElementById('authUsername').value.trim();
            var password = document.getElementById('authPassword').value;

            if (isLoginMode) {
                if (!username || !password) {
                    alert('Please enter your username/ID and password.');
                    return;
                }
                var res = await apiRequest('login', { username: username, password: password });
                if (res.status === 'success') {
                    currentUser = res.user;
                    hideAuthModal();
                    showDashboardForRole(currentUser.role);
                } else {
                    alert(res.message || 'Login failed.');
                }
            } else {
                var fullName = document.getElementById('signupFullName').value.trim();
                var userId = document.getElementById('signupUserId').value.trim();
                if (!fullName || !username || !password || !userId) {
                    alert('Please fill in all signup fields (Full Name, Username, Password, Student ID).');
                    return;
                }
                var res = await apiRequest('signup', { name: fullName, username: username, password: password, userId: userId });
                if (res.status === 'success') {
                    currentUser = res.user;
                    hideAuthModal();
                    showDashboardForRole(currentUser.role);
                } else {
                    alert(res.message || 'Sign up failed.');
                }
            }
        });
    }

    // =========================================================================
    // LOGOUT
    // =========================================================================

    if (logoutBtn)     logoutBtn.addEventListener('click', handleLogout);
    if (sidebarLogout) sidebarLogout.addEventListener('click', handleLogout);

    // =========================================================================
    // SIDEBAR NAVIGATION (tab switching)
    // =========================================================================

    var studentNav = document.getElementById('studentNav');
    var teacherNav = document.getElementById('teacherNav');

    if (studentNav) {
        studentNav.querySelectorAll('.menu-item[data-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab('student', this.getAttribute('data-tab'));
            });
        });
    }

    if (teacherNav) {
        teacherNav.querySelectorAll('.menu-item[data-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab('teacher', this.getAttribute('data-tab'));
            });
        });
    }

    // =========================================================================
    // EXAM BUTTONS (wired with fresh listeners each time)
    // =========================================================================

    wireExamButtons();
    wireResultsButtons();

    // =========================================================================
    // CREATE EXAM MODAL
    // =========================================================================

    initExamCreation();
    initBulkExamImport();
    initBulkStudentImport();

    // =========================================================================
    // NOTIFICATIONS
    // =========================================================================

    var notifBellBtn = document.getElementById('notifBellBtn');
    var notifDropdown = document.getElementById('notifDropdown');
    var notifList = document.getElementById('notifList');
    var notifBadge = document.getElementById('notifBadge');
    var notifMarkAll = document.getElementById('notifMarkAllRead');
    var notifPollInterval = null;

    async function loadNotifications() {
        if (!currentUser) return;
        var res = await apiRequest('get_notifications', {}, 'GET');
        if (res.status !== 'success') return;

        var unread = res.unreadCount || 0;
        if (notifBadge) {
            if (unread > 0) {
                notifBadge.textContent = unread > 99 ? '99+' : unread;
                notifBadge.classList.remove('hidden');
            } else {
                notifBadge.classList.add('hidden');
            }
        }

        if (notifList) {
            notifList.innerHTML = '';
            var notifs = res.notifications || [];
            if (notifs.length === 0) {
                notifList.innerHTML = '<div style="padding:0.75rem;text-align:center;color:var(--color-text-secondary);font-size:0.85rem;">No notifications.</div>';
                return;
            }
            notifs.slice(0, 20).forEach(function (n) {
                var div = document.createElement('div');
                div.className = 'notif-item' + (n.isRead ? '' : ' notif-unread');
                div.style.cssText = 'padding:0.55rem 0.75rem;cursor:pointer;border-bottom:1px solid var(--color-border);font-size:0.85rem;transition:background 0.15s;';
                div.innerHTML =
                    '<div style="font-weight:600;font-size:0.82rem;">' + escapeHtmlNotif(n.title) + '</div>' +
                    '<div style="color:var(--color-text-secondary);font-size:0.78rem;margin-top:0.15rem;">' + escapeHtmlNotif(n.message) + '</div>' +
                    '<div style="color:var(--color-text-secondary);font-size:0.7rem;margin-top:0.1rem;">' + (n.createdAt || '').split(' ')[0] + '</div>';

                div.addEventListener('click', async function () {
                    if (!n.isRead) {
                        await apiRequest('mark_notification_read', { notificationId: n.id });
                        loadNotifications();
                    }
                    if (n.link) {
                        // Navigate to the tab indicated by the link
                        if (currentUser && currentUser.role === 'student' && n.link === 'student-history') {
                            switchTab('student', 'student-history');
                        } else if (currentUser && currentUser.role === 'teacher' && n.link === 'teacher-attempts') {
                            switchTab('teacher', 'teacher-attempts');
                        } else if (currentUser && currentUser.role === 'student' && n.link === 'student-exams') {
                            switchTab('student', 'student-exams');
                        }
                    }
                    notifDropdown.classList.add('hidden');
                });

                notifList.appendChild(div);
            });
        }
    }

    if (notifBellBtn) {
        notifBellBtn.addEventListener('click', function () {
            notifDropdown.classList.toggle('hidden');
        });
        // Close dropdown on outside click
        document.addEventListener('click', function (e) {
            var wrap = document.getElementById('notifBellWrap');
            if (wrap && !wrap.contains(e.target) && notifDropdown) {
                notifDropdown.classList.add('hidden');
            }
        });
    }

    if (notifMarkAll) {
        notifMarkAll.addEventListener('click', async function () {
            await apiRequest('mark_all_notifications_read');
            loadNotifications();
        });
    }

    function startNotificationPolling() {
        if (notifPollInterval) clearInterval(notifPollInterval);
        loadNotifications();
        notifPollInterval = setInterval(loadNotifications, 60000);
    }

    // =========================================================================
    // GLOBAL SEARCH
    // =========================================================================

    var globalSearchInput = document.getElementById('globalSearchInput');
    var globalSearchResults = document.getElementById('globalSearchResults');

    if (globalSearchInput && globalSearchResults) {
        globalSearchInput.addEventListener('input', function () {
            var q = this.value.trim().toLowerCase();
            if (q.length < 2) {
                globalSearchResults.classList.add('hidden');
                return;
            }

            var results = { exams: [], students: [], attempts: [] };

            // Search exams
            (searchCache.exams || []).forEach(function (item) {
                var title = (item.title || item.examTitle || '').toLowerCase();
                var subject = (item.subject || '').toLowerCase();
                if (title.indexOf(q) !== -1 || subject.indexOf(q) !== -1) {
                    results.exams.push(item);
                }
            });

            // Search students (teacher only)
            (searchCache.students || []).forEach(function (item) {
                var name = (item.name || '').toLowerCase();
                var email = (item.email || '').toLowerCase();
                if (name.indexOf(q) !== -1 || email.indexOf(q) !== -1) {
                    results.students.push(item);
                }
            });

            // Search attempts
            (searchCache.attempts || []).forEach(function (item) {
                var title = (item.examTitle || item.title || '').toLowerCase();
                var student = (item.studentName || '').toLowerCase();
                if (title.indexOf(q) !== -1 || student.indexOf(q) !== -1) {
                    results.attempts.push(item);
                }
            });

            var total = results.exams.length + results.students.length + results.attempts.length;
            if (total === 0) {
                globalSearchResults.classList.add('hidden');
                return;
            }

            var html = '';
            if (results.exams.length > 0) {
                html += '<div class="gsr-section"><div class="gsr-section-title">Exams (' + results.exams.length + ')</div>';
                results.exams.slice(0, 5).forEach(function (e) {
                    html += '<div class="gsr-item" data-type="exam">' + ICONS.file + ' ' + escapeHtmlNotif(e.title || e.examTitle) + '</div>';
                });
                html += '</div>';
            }
            if (results.students.length > 0) {
                html += '<div class="gsr-section"><div class="gsr-section-title">Students (' + results.students.length + ')</div>';
                results.students.slice(0, 5).forEach(function (s) {
                    html += '<div class="gsr-item" data-type="student">' + ICONS.users + ' ' + escapeHtmlNotif(s.name) + ' (' + escapeHtmlNotif(s.email) + ')</div>';
                });
                html += '</div>';
            }
            if (results.attempts.length > 0) {
                html += '<div class="gsr-section"><div class="gsr-section-title">Attempts (' + results.attempts.length + ')</div>';
                results.attempts.slice(0, 5).forEach(function (a) {
                    html += '<div class="gsr-item" data-type="attempt">' + ICONS.fileLg + ' ' + escapeHtmlNotif(a.examTitle || a.title) + ' - ' + escapeHtmlNotif(a.studentName || '') + '</div>';
                });
                html += '</div>';
            }

            globalSearchResults.innerHTML = html;
            globalSearchResults.classList.remove('hidden');

            // Click handlers for search results
            globalSearchResults.querySelectorAll('.gsr-item').forEach(function (item) {
                item.addEventListener('click', function () {
                    globalSearchResults.classList.add('hidden');
                    globalSearchInput.value = '';
                });
            });
        });

        // Close search results on outside click or escape
        document.addEventListener('click', function (e) {
            if (globalSearchResults && !globalSearchInput.contains(e.target) && !globalSearchResults.contains(e.target)) {
                globalSearchResults.classList.add('hidden');
            }
        });
        globalSearchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') globalSearchResults.classList.add('hidden');
        });
    }

    // =========================================================================
    // INIT
    // =========================================================================

    checkAuthStatus().then(function () {
        startNotificationPolling();
    });
});
