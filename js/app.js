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
    var mobileAboutBtn  = document.getElementById('mobileAboutBtn');
    var aboutPage       = document.getElementById('aboutFullPage');
    var aboutBackBtn    = document.getElementById('aboutBackBtn');
    var authForm        = document.getElementById('authForm');
    var authTabLogin    = document.getElementById('authTabLogin');
    var authTabSignup   = document.getElementById('authTabSignup');
    var switchAuthMode  = document.getElementById('switchAuthMode');
    var togglePassword  = document.getElementById('toggleAuthPassword');

    // =========================================================================
    // THEME TOGGLE (dark / light mode)
    // CSS targets `body.dark-mode`, so we must apply/remove that CLASS on <body>.
    // We also keep data-theme on <html> for backwards compatibility.
    // =========================================================================

    function applyTheme(theme) {
        var body = document.body;
        var root = document.documentElement;
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            root.setAttribute('data-theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            root.setAttribute('data-theme', 'light');
        }
        // Update any toggle icon
        document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
            el.textContent = (theme === 'dark') ? '\u2600\ufe0f' : '\ud83c\udf19';
        });
    }

    function toggleTheme() {
        var isDark = document.body.classList.contains('dark-mode');
        var next = isDark ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    }

    // Restore saved theme (apply BEFORE first paint to avoid flash)
    var savedTheme = 'dark';
    try { savedTheme = localStorage.getItem('theme') || 'dark'; } catch (e) {}
    applyTheme(savedTheme);

    if (themeToggle)     themeToggle.addEventListener('click', toggleTheme);
    if (mainThemeToggle) mainThemeToggle.addEventListener('click', toggleTheme);

    // =========================================================================
    // ABOUT PAGE
    // =========================================================================

    function showAboutPage() {
        aboutPage.classList.remove('hidden');
        dashboard.classList.add('hidden');
        resultsPage.classList.add('hidden');
        var examInterface = document.getElementById('examInterface');
        if (examInterface) examInterface.classList.add('hidden');
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
    if (mobileAboutBtn) mobileAboutBtn.addEventListener('click', showAboutPage);
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
            if (!systemAllowSignup) {
                showToast('Self-registration is currently disabled. Please contact your teacher or administrator to request an account.', 'error');
                return;
            }
            setAuthMode(false);
            if (authForm) authForm.reset();
        });
    }

    // Legacy switch button
    if (switchAuthMode) {
        switchAuthMode.addEventListener('click', function (e) {
            e.preventDefault();
            var targetLoginMode = !isLoginMode;
            if (!targetLoginMode && !systemAllowSignup) {
                showToast('Self-registration is currently disabled. Please contact your teacher or administrator to request an account.', 'error');
                return;
            }
            setAuthMode(targetLoginMode);
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

    // Quick demo login buttons handler
    document.querySelectorAll('.auth-demo-btn, .demo-pixel-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            // Force login mode first
            setAuthMode(true);
            var userVal = this.getAttribute('data-user');
            var passVal = this.getAttribute('data-pass');
            var userInp = document.getElementById('authUsername');
            var passInp = document.getElementById('authPassword');
            if (userInp) userInp.value = userVal;
            if (passInp) passInp.value = passVal;

            // Submit form
            if (authForm) {
                authForm.dispatchEvent(new Event('submit'));
            }
        });
    });

    // =========================================================================
    // LOGOUT
    // =========================================================================

    if (logoutBtn)     logoutBtn.addEventListener('click', handleLogout);
    if (sidebarLogout) sidebarLogout.addEventListener('click', handleLogout);

    var headerLogoutBtn = document.getElementById('headerLogoutBtn');
    var mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

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

    // Toggle menu groups on click (primarily for mobile accordion, but works on desktop too)
    document.querySelectorAll('.menu-group-header').forEach(function (header) {
        header.addEventListener('click', function (e) {
            e.preventDefault();
            var group = this.closest('.menu-group');
            if (!group) return;
            var isOpen = group.classList.contains('open');
            
            // Accordion behavior: close other groups
            var parentNav = group.closest('.sidebar-menu');
            if (parentNav) {
                parentNav.querySelectorAll('.menu-group').forEach(function (g) {
                    if (g !== group) g.classList.remove('open');
                });
            }
            
            group.classList.toggle('open', !isOpen);
        });
    });

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
    initRegisterStudent();
    initAccessCodesManager();
    initMobileNav();
    initPWA();

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
                        if (currentUser && isStudentRole(currentUser.role) && n.link === 'student-history') {
                            switchTab('student', 'student-history');
                        } else if (currentUser && isTeacherRole(currentUser.role) && n.link === 'teacher-attempts') {
                            switchTab('teacher', 'teacher-attempts');
                        } else if (currentUser && isStudentRole(currentUser.role) && n.link === 'student-exams') {
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

// =========================================================================
// MOBILE NAV — hamburger button + slide-out sidebar
// =========================================================================
function initMobileNav() {
    var hamburgerBtn = document.getElementById('mobileHamburgerBtn');
    var closeBtn     = document.getElementById('sidebarCloseBtn');
    var sidebar      = document.getElementById('mainSidebar');
    var overlay      = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        if (closeBtn) closeBtn.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        if (closeBtn) closeBtn.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
    if (closeBtn)     closeBtn.addEventListener('click', closeSidebar);
    if (overlay)      overlay.addEventListener('click', closeSidebar);

    // Auto-close sidebar when a menu item is clicked (mobile UX)
    sidebar.querySelectorAll('.menu-item').forEach(function (item) {
        item.addEventListener('click', function () {
            if (window.innerWidth <= 900) {
                // Update the mobile top bar title
                var label = item.querySelector('span');
                if (label) {
                    var mtbTitle = document.getElementById('mtbTitle');
                    if (mtbTitle) mtbTitle.textContent = label.textContent;
                }
                setTimeout(closeSidebar, 150);
            }
        });
    });

    // Sync mobile top bar title when switchTab is called
    // (We patch the original switchTab to also update mtbTitle)
    var origSwitchTab = window.switchTab;
    if (typeof origSwitchTab === 'function') {
        window.switchTab = function (role, tabId) {
            origSwitchTab(role, tabId);
            // Update mobile top bar title from the mainContentTitle element
            var mainTitle = document.getElementById('mainContentTitle');
            var mainSub   = document.getElementById('mainContentSubtitle');
            var mtbTitle  = document.getElementById('mtbTitle');
            var mtbSub    = document.getElementById('mtbSubtitle');
            if (mtbTitle && mainTitle) mtbTitle.textContent = mainTitle.textContent;
            if (mtbSub && mainSub) mtbSub.textContent = mainSub.textContent;
        };
    }

    // Close sidebar on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });

    // Close sidebar when resizing to desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    // Handle ?action=mock / ?action=practice / ?action=mastery deep links (from PWA shortcuts)
    var params = new URLSearchParams(window.location.search);
    var action = params.get('action');
    if (action && typeof localStorage !== 'undefined') {
        // Stash the requested tab so switchTab can pick it up after auth check
        try { localStorage.setItem('fetenax_pending_action', action); } catch (e) {}
    }
}

// =========================================================================
// PWA — register service worker + show install prompt
// =========================================================================
function initPWA() {
    // Register service worker (only on https/localhost)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js').then(function (reg) {
                console.log('[PWA] Service Worker registered:', reg.scope);
                // Check for updates every hour
                setInterval(function () {
                    reg.update().catch(function () {});
                }, 60 * 60 * 1000);
            }).catch(function (err) {
                console.warn('[PWA] Service Worker registration failed:', err);
            });
        });
    }

    // Capture the install prompt event so we can trigger it later
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        showPWAInstallBanner(deferredPrompt);
    });

    window.addEventListener('appinstalled', function () {
        console.log('[PWA] App installed');
        hidePWAInstallBanner();
    });
}

function showPWAInstallBanner(deferredPrompt) {
    if (!deferredPrompt) return;
    // Don't show if user previously dismissed
    try {
        if (localStorage.getItem('pwa_install_dismissed') === '1') return;
    } catch (e) {}

    // Don't show if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    var banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.style.cssText = [
        'position:fixed', 'bottom:0', 'left:0', 'right:0',
        'background:var(--color-primary)', 'color:#fff',
        'padding:0.75rem 1rem', 'display:flex', 'align-items:center',
        'gap:0.7rem', 'z-index:15000', 'box-shadow:0 -4px 12px rgba(0,0,0,0.2)',
        'font-size:0.9rem'
    ].join(';') + ';';
    banner.innerHTML =
        '<div style="flex:1;">' +
            '<div style="font-weight:700;font-size:0.95rem;">📱 Install FetenaX</div>' +
            '<div style="font-size:0.78rem;opacity:0.9;">Add to home screen for offline use & a native app feel.</div>' +
        '</div>' +
        '<button id="pwaInstallYes" class="btn" style="background:#fff;color:var(--color-primary);font-weight:700;">Install</button>' +
        '<button id="pwaInstallNo" class="btn" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);">Later</button>';
    document.body.appendChild(banner);

    document.getElementById('pwaInstallYes').addEventListener('click', async function () {
        deferredPrompt.prompt();
        var choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
            console.log('[PWA] User accepted install');
        }
        hidePWAInstallBanner();
    });
    document.getElementById('pwaInstallNo').addEventListener('click', function () {
        try { localStorage.setItem('pwa_install_dismissed', '1'); } catch (e) {}
        hidePWAInstallBanner();
    });
}

function hidePWAInstallBanner() {
    var banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.remove();
}
