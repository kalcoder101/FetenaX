<?php
// index.php - Main Entrypoint for FetenaX
// Maintenance mode check
$maintFlag = __DIR__ . '/.maintenance';
if (file_exists($maintFlag)) {
    $maintData = json_decode(file_get_contents($maintFlag), true);
    http_response_code(503);
    header('Retry-After: 300');
    die('<!DOCTYPE html><html><head><title>Maintenance</title><style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f7f8f5;color:#23272f;}div{text-align:center;max-width:400px;padding:2rem;}h1{color:#57785a;}p{color:#6b7280;}</style></head><body><div><h1>🔧 Under Maintenance</h1><p>' . htmlspecialchars($maintData['message'] ?? 'FetenaX is under maintenance. Please check back soon.') . '</p></div></body></html>');
}
// Start session only if not already started (api.php may have started it)
if (session_status() === PHP_SESSION_NONE) {
    @ini_set('session.cookie_lifetime', 14400); // 4 hours
    @ini_set('session.gc_maxlifetime', 14400); // 4 hours
    @ini_set('session.cookie_httponly', 1);
    @ini_set('session.cookie_samesite', 'Lax');
    session_start();
}
// Strong cache-busting headers — prevent browser from caching old CSS/JS
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FetenaX – Your Exam, Your Vibe</title>
    <link rel="icon" type="image/png" href="Img/fetenAX.png">
    <link rel="apple-touch-icon" href="Img/fetenAX.png">
    <link rel="stylesheet" href="css/theme.css?v=40">
    <link rel="stylesheet" href="css/components.css?v=40">
    <link rel="stylesheet" href="css/layout.css?v=40">
    <link rel="stylesheet" href="css/auth.css?v=40">
    <link rel="stylesheet" href="css/student.css?v=40">
    <link rel="stylesheet" href="css/teacher.css?v=40">
    <link rel="stylesheet" href="css/exam-interface.css?v=40">
    <link rel="stylesheet" href="css/results.css?v=40">
    <link rel="stylesheet" href="css/exam-creation.css?v=40">
    <link rel="stylesheet" href="css/study.css?v=40">
    <link rel="stylesheet" href="css/question-renderer.css?v=40">
    <link rel="stylesheet" href="css/responsive.css?v=40">
    <!-- Prism.js for code syntax highlighting in question text -->
    <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
    <!-- PWA manifest + theme -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#57785a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="FetenaX">
    <link rel="apple-touch-icon" href="Img/fetenAX.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script>
        // Apply saved theme BEFORE first paint to avoid flash of wrong theme.
        // CSS targets `body.dark-mode`, so we set the class directly here.
        (function () {
            try {
                var t = localStorage.getItem('theme') || 'dark';
                if (t === 'dark') {
                    document.documentElement.classList.add('dark-mode');
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                }
                // Once <body> exists, sync the class to it.
                var sync = function () {
                    if (t === 'dark') document.body.classList.add('dark-mode');
                    else document.body.classList.remove('dark-mode');
                };
                if (document.body) sync();
                else document.addEventListener('DOMContentLoaded', sync);
            } catch (e) {}
        })();
    </script>
</head>

<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <div class="nav-content">
                <div class="nav-brand">
                    <img src="Img/fetenAX.png" alt="FetenaX Logo" class="logo-img" style="height:2.1rem;width:auto;vertical-align:middle;margin-right:0.5rem;">
                </div>
                <div class="nav-actions">
                    <button id="aboutBtn" class="btn btn-secondary about-btn" title="About this site">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                        <span>About</span>
                    </button>
                    <button id="themeToggle" class="btn btn-secondary" title="Toggle theme">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;">
                            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" stroke="currentColor" stroke-width="2" fill="none" />
                        </svg>
                    </button>
                    <button id="logoutBtn" class="btn btn-secondary hidden">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;">
                            <path d="M16 17l5-5m0 0l-5-5m5 5H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M13 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h6a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- About Full Page (with back button) -->
    <div id="aboutFullPage" class="about-fullpage hidden">
        <div class="about-page-header">
            <button id="aboutBackBtn" class="about-back-btn" title="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <h2>About FetenaX</h2>
        </div>
        <div class="about-page-body">
            <!-- Hero -->
            <div class="about-hero">
                <img src="Img/fetenAX.png" alt="FetenaX Logo" class="about-hero-logo">
                <h1 class="about-hero-title">FetenaX</h1>
                <p class="about-hero-tagline">Your Exam, Your Vibe — Next-gen exam platform</p>
            </div>

            <!-- What is FetenaX -->
            <div class="about-section">
                <div class="about-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    What is FetenaX?
                </div>
                <p>FetenaX is a secure, mobile-first exam platform built for both students and teachers. Students log in with their ID, take exams across subjects like Java OOP, Database, C++, and Assembly Language, and get instant scores with full answer review. Teachers create exams, manage a reusable question bank, view real-time analytics, and organise students into class groups.</p>
                <p>Whether you're running a quick quiz or a full mid-term exam, FetenaX keeps the experience fast, focused, and fair — with autosave, flagging, tab-switch protection, and weighted scoring built in.</p>
            </div>

            <!-- Features -->
            <div class="about-section">
                <div class="about-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Key Features
                </div>
                <div class="about-features-grid">
                    <div class="about-feature-card">
                        <div class="about-feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div class="about-feature-title">Exam Taking</div>
                        <div class="about-feature-desc">Timed exams, autosave, flag questions, anti-cheat protection, instant scoring.</div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        </div>
                        <div class="about-feature-title">Analytics</div>
                        <div class="about-feature-desc">Per-exam stats, average scores, pass rates, subject breakdowns, leaderboards.</div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                        </div>
                        <div class="about-feature-title">Question Bank</div>
                        <div class="about-feature-desc">Save and reuse questions across exams. Filter by subject, search by keyword.</div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                        </div>
                        <div class="about-feature-title">Badges</div>
                        <div class="about-feature-desc">Earn achievements for first pass, perfect score, streaks, and exam milestones.</div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        </div>
                        <div class="about-feature-title">Class Groups</div>
                        <div class="about-feature-desc">Organise students into groups and restrict exam access to specific sections.</div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        </div>
                        <div class="about-feature-title">Practice Mode</div>
                        <div class="about-feature-desc">Retake any exam with instant per-question feedback — no timer, not saved.</div>
                    </div>
                </div>
            </div>

            <!-- Tech Stack -->
            <div class="about-section">
                <div class="about-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Tech Stack
                </div>
                <p>FetenaX is built with a lightweight, tried-and-true stack — no frameworks, no build step, just fast server-rendered pages with progressive JavaScript enhancements.</p>
                <div class="about-tech-stack">
                    <span class="about-tech-pill">PHP 8</span>
                    <span class="about-tech-pill">MySQL</span>
                    <span class="about-tech-pill">Vanilla JavaScript</span>
                    <span class="about-tech-pill">CSS3 (Glassmorphism)</span>
                    <span class="about-tech-pill">PDO Prepared Statements</span>
                    <span class="about-tech-pill">Responsive Design</span>
                </div>
            </div>

            <!-- Author -->
            <div class="about-section">
                <div class="about-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Developer
                </div>
                <div class="about-author-card">
                    <img src="Img/LOGO.jpg" alt="Kaleab" class="about-author-img">
                    <div class="about-author-info">
                        <div class="about-author-name">Kaleab</div>
                        <div class="about-author-role">Developer &amp; Designer</div>
                        <a href="https://github.com/kalcoder101" target="_blank" rel="noopener" class="about-author-link">github.com/kalcoder101 →</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Unified Dashboard Layout -->
    <div id="dashboard" class="dashboard-layout hidden">
        <!-- Mobile Top Bar (hamburger + page title) — shown only on < 900px -->
        <div class="mobile-top-bar">
            <button class="mobile-hamburger" id="mobileHamburgerBtn" aria-label="Open menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
            <img src="Img/fetenAX.png" alt="FetenaX" class="mtb-logo">
            <div style="flex:1;min-width:0;">
                <div class="mtb-title" id="mtbTitle">FetenaX</div>
                <div class="mtb-subtitle" id="mtbSubtitle"></div>
            </div>
            <button id="mobileAboutBtn" class="mobile-about-btn" title="About FetenaX" aria-label="Open About">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                </svg>
            </button>
            <button id="mobileLogoutBtn" class="btn btn-logout-icon" title="Logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>

        <!-- Overlay behind slide-out sidebar (mobile only) -->
        <div class="sidebar-overlay" id="sidebarOverlay"></div>

        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="mainSidebar">
            <div class="sidebar-brand">
                <img src="Img/fetenAX.png" alt="FetenaX Logo" class="sidebar-logo">
                <button class="mobile-hamburger" id="sidebarCloseBtn" style="display:none;" aria-label="Close menu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            
            <!-- Student Navigation Menu -->
            <nav id="studentNav" class="sidebar-menu hidden">
                <!-- Group 1: Exams -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="exams">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        <span>Exams &amp; Tests</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item active" data-tab="student-exams">
                            <span>Available Exams</span>
                        </button>
                        <button class="menu-item" data-tab="student-mock">
                            <span>Mock Exit Exam</span>
                        </button>
                    </div>
                </div>

                <!-- Group 2: Practice -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="practice">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        <span>Practice &amp; Study</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="student-subjects">
                            <span>Practice by Subject</span>
                        </button>
                        <button class="menu-item" data-tab="student-srs">
                            <span>Review Queue (SRS)</span>
                        </button>
                        <button class="menu-item" data-tab="student-weakness">
                            <span>My Weaknesses</span>
                        </button>
                        <button class="menu-item" data-tab="student-resources">
                            <span>Study Resources</span>
                        </button>
                    </div>
                </div>

                <!-- Group 3: Analytics -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="performance">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>Analytics &amp; Rank</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="student-history">
                            <span>My Performance</span>
                        </button>
                        <button class="menu-item" data-tab="student-mastery">
                            <span>Subject Mastery</span>
                        </button>
                        <button class="menu-item" data-tab="student-leaderboard">
                            <span>Leaderboard</span>
                        </button>
                    </div>
                </div>

                <!-- Group 4: Schedule -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="planning">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>Schedule &amp; Plan</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="student-schedule">
                            <span>Study Schedule</span>
                        </button>
                        <button class="menu-item" data-tab="student-calendar">
                            <span>Calendar</span>
                        </button>
                    </div>
                </div>

                <!-- Group 5: Profile -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="account">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        <span>Profile &amp; Settings</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="student-settings">
                            <span>Settings</span>
                        </button>
                    </div>
                </div>
            </nav>
            
            <!-- Teacher Navigation Menu -->
            <nav id="teacherNav" class="sidebar-menu hidden">
                <!-- Group 1: Overview & Analytics -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="teacher-overview">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                        <span>Overview &amp; Stats</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item active" data-tab="teacher-overview">
                            <span>Overview</span>
                        </button>
                        <button class="menu-item" data-tab="teacher-analytics">
                            <span>Class Analytics</span>
                        </button>
                        <button class="menu-item" data-tab="teacher-progress">
                            <span>Student Progress</span>
                        </button>
                    </div>
                </div>

                <!-- Group 2: Exams & Questions -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="teacher-exams">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        <span>Exams &amp; Qs</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="teacher-exams">
                            <span>Exam Settings</span>
                        </button>
                        <button class="menu-item" data-tab="teacher-bank">
                            <span>Question Bank</span>
                            <span id="bankCountBadge" class="bank-sidebar-badge" style="display:none;"></span>
                        </button>
                        <button class="menu-item" data-tab="teacher-codes">
                            <span>Access Codes</span>
                        </button>
                    </div>
                </div>

                <!-- Group 3: Student Management -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="teacher-students">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Students</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="teacher-students">
                            <span>Students List</span>
                        </button>
                        <button class="menu-item" data-tab="teacher-attempts">
                            <span>Review Attempts</span>
                        </button>
                        <button class="menu-item" data-tab="teacher-groups">
                            <span>Class Groups</span>
                        </button>
                    </div>
                </div>

                <!-- Group 4: Resources & Settings -->
                <div class="menu-group">
                    <button class="menu-group-header" data-group="teacher-resources">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span>Resources &amp; Profile</span>
                        <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="submenu">
                        <button class="menu-item" data-tab="teacher-resources">
                            <span>Study Resources</span>
                        </button>
                        <button class="menu-item" data-tab="teacher-settings">
                            <span>Settings</span>
                        </button>
                    </div>
                </div>
            </nav>
            
            <div class="sidebar-spacer"></div>
            
            <!-- User Status & Logout -->
            <div class="sidebar-user-section">
                <div class="user-badge">
                    <div class="user-badge-avatar" id="sidebarAvatar">US</div>
                    <div class="user-badge-details">
                        <span class="user-badge-name" id="sidebarUserName">User Name</span>
                        <span class="user-badge-role" id="sidebarUserRole">Student</span>
                    </div>
                </div>
                <button id="sidebarLogoutBtn" class="btn btn-logout-icon" title="Logout">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
        
        <!-- Main Dashboard View Panel -->
        <main class="dashboard-main">
            <!-- Header section — compact top bar with title, search, theme & about -->
            <header class="dashboard-header-strip">
                <div class="header-welcome-text">
                    <h2 id="mainContentTitle">Dashboard</h2>
                    <p id="mainContentSubtitle">Welcome to FetenaX</p>
                </div>

                <!-- Global search box (visible to all logged-in users) -->
                <div class="header-search-wrap">
                    <svg class="header-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="globalSearchInput" class="header-search-input" placeholder="Quick search…" autocomplete="off">
                    <div id="globalSearchResults" class="global-search-results hidden"></div>
                </div>

                <div class="header-controls">
                    <!-- Notification Bell -->
                    <div class="notif-bell-wrap" id="notifBellWrap">
                        <button id="notifBellBtn" class="btn btn-secondary-header notif-bell-btn" title="Notifications">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            <span id="notifBadge" class="notif-badge hidden">0</span>
                        </button>
                        <div id="notifDropdown" class="notif-dropdown hidden">
                            <div class="notif-dropdown-header">
                                <span>Notifications</span>
                                <button id="notifMarkAllRead" class="notif-mark-all">Mark all read</button>
                            </div>
                            <div id="notifList" class="notif-list"></div>
                        </div>
                    </div>

                    <button id="mainAboutBtn" class="btn btn-secondary-header about-btn" title="About FetenaX">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                        <span>About</span>
                    </button>
                    <button id="mainThemeToggle" class="btn btn-secondary-header" title="Toggle Theme">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z"></path></svg>
                    </button>
                    <button id="headerLogoutBtn" class="btn btn-logout-icon" title="Logout">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span>Logout</span>
                    </button>
                </div>
            </header>
            
            <div class="dashboard-content-area">
                <!-- Student Dashboard Panels -->
                <div id="studentDashboard" class="hidden">
                    <!-- Tab: Available Exams -->
                    <div id="student-exams" class="tab-content hidden">
                        <div class="search-filter-row" style="margin-bottom:1.5rem; display:flex; gap:1rem;">
                            <input type="text" id="studentExamSearch" class="form-input" placeholder="Search exams by title or subject..." style="max-width:350px; width: 100%;">
                        </div>
                        <div class="exams-grid" id="examsList">
                            <!-- Exams populated here -->
                        </div>
                    </div>

                    <!-- Tab: Practice by Subject -->
                    <div id="student-subjects" class="tab-content hidden">
                        <div id="studentSubjectsContent"></div>
                    </div>

                    <!-- Tab: Mock Exit Exam -->
                    <div id="student-mock" class="tab-content hidden">
                        <div id="studentMockContent"></div>
                    </div>

                    <!-- Tab: Review Queue (SRS) -->
                    <div id="student-srs" class="tab-content hidden">
                        <div id="studentSrsContent"></div>
                    </div>

                    <!-- Tab: Subject Mastery -->
                    <div id="student-mastery" class="tab-content hidden">
                        <div id="studentMasteryContent"></div>
                    </div>

                    <!-- Tab: Weakness Report -->
                    <div id="student-weakness" class="tab-content hidden">
                        <div id="studentWeaknessContent"></div>
                    </div>

                    <!-- Tab: Study Schedule -->
                    <div id="student-schedule" class="tab-content hidden">
                        <div id="studentScheduleContent"></div>
                    </div>

                    <!-- Tab: Study Resources -->
                    <div id="student-resources" class="tab-content hidden">
                        <div id="studentResourcesContent"></div>
                    </div>
                    
                    <!-- Tab: History & Stats -->
                    <div id="student-history" class="tab-content hidden">
                        <!-- Badges & Achievements Showcase -->
                        <div id="studentBadgesSection" class="student-badges-section" style="display:none;">
                            <div class="badges-section-header">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                                <span>Badges &amp; Achievements</span>
                            </div>
                            <div id="studentBadgesGrid" class="badges-grid">
                                <!-- Populated by JS -->
                            </div>
                        </div>

                        <!-- Stats Card — full width -->
                        <div class="student-stats-card" id="studentStatsCard">
                            <!-- Stats populated via JS -->
                        </div>

                        <!-- Recent Attempts — full-width section with filter + scrollable table -->
                        <div class="recent-attempts-section">
                            <div class="recent-header-flex">
                                <h3 class="ras-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                    Recent Attempts
                                </h3>
                                <div class="filter-btn-group">
                                    <button class="btn btn-secondary btn-small active" id="filterAttemptAll">All</button>
                                    <button class="btn btn-secondary btn-small" id="filterAttemptPass">Passed</button>
                                    <button class="btn btn-secondary btn-small" id="filterAttemptFail">Failed</button>
                                </div>
                            </div>
                            <div id="studentRecentResults" class="ras-list-wrap">
                                <!-- Recent Attempts populated here as a scrollable list -->
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Leaderboard -->
                    <div id="student-leaderboard" class="tab-content hidden">
                        <div class="leaderboard-controls" style="display:flex;gap:1rem;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;">
                            <select id="leaderboardExamSelect" class="form-input form-select" style="max-width:320px;width:100%;">
                                <option value="0">🏆 Overall Leaderboard</option>
                            </select>
                        </div>
                        <div id="leaderboardContainer">
                            <!-- populated by JS -->
                        </div>
                    </div>

                    <!-- Tab: Student Settings -->
                    <div id="student-settings" class="tab-content hidden">
                        <div id="studentSettingsContent"></div>
                    </div>

                    <!-- Tab: Calendar -->
                    <div id="student-calendar" class="tab-content hidden">
                        <div id="calendarContent">
                            <!-- Calendar widget rendered by JS -->
                        </div>
                    </div>
                </div>

                <!-- Teacher Dashboard Panels -->
                <div id="teacherDashboard" class="hidden">
                    <!-- Tab: Overview -->
                    <div id="teacher-overview" class="tab-content hidden">
                        <div class="stats-cards-grid">
                            <div class="glass-card stat-card-flex">
                                <div class="stat-card-icon" style="color:var(--color-primary); display:flex; align-items:center; justify-content:center;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                                </div>
                                <div>
                                    <div class="stat-card-label">Total Exams</div>
                                    <div id="totalExams" class="stat-card-number">0</div>
                                </div>
                            </div>
                            <div class="glass-card stat-card-flex">
                                <div class="stat-card-icon" style="color:var(--color-primary); display:flex; align-items:center; justify-content:center;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                </div>
                                <div>
                                    <div class="stat-card-label">Completed Attempts</div>
                                    <div id="totalAttempts" class="stat-card-number">0</div>
                                </div>
                            </div>
                            <div class="glass-card stat-card-flex">
                                <div class="stat-card-icon" style="color:var(--color-primary); display:flex; align-items:center; justify-content:center;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                                </div>
                                <div>
                                    <div class="stat-card-label">Average Score</div>
                                    <div id="avgScore" class="stat-card-number">0%</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-split-grid">
                            <!-- Recent Results -->
                            <div class="glass-card flex-grow-card">
                                <div class="card-header-flex">
                                    <h3>Recent Activities</h3>
                                </div>
                                <div id="recentResults" class="results-list">
                                    <!-- Results will be populated here -->
                                </div>
                            </div>
                            <!-- Alerts / System info -->
                            <div class="glass-card fixed-side-card">
                                <div class="card-header-flex">
                                    <h3>System Alerts</h3>
                                </div>
                                <div class="system-alerts-list">
                                    <div class="alert-item">
                                        <div class="alert-icon green">✓</div>
                                        <div class="alert-details">
                                            <div class="alert-title">System Status Normal</div>
                                            <div class="alert-time">Database connection healthy</div>
                                        </div>
                                    </div>
                                    <div class="alert-item">
                                        <div class="alert-icon yellow">ℹ</div>
                                        <div class="alert-details">
                                            <div class="alert-title">Exam Guard Active</div>
                                            <div class="alert-time">Tab switching protection active</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Exams & Analytics -->
                    <div id="teacher-exams" class="tab-content hidden">
                        <div class="card-header-flex">
                            <h3>Analytics & Creation</h3>
                            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                                <button id="bulkExamImportBtn" class="btn btn-secondary btn-small" title="Import exam questions from a CSV file">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Import CSV
                                </button>
                                <button id="createExamBtn" class="btn btn-primary btn-create-exam">Create New Exam</button>
                            </div>
                        </div>
                        <div id="teacherAnalytics"></div>
                    </div>
                    
                    <!-- Tab: Student Accounts -->
                    <div id="teacher-students" class="tab-content hidden">
                        <div class="search-filter-row" style="margin-bottom:1.5rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
                            <input type="text" id="teacherStudentSearch" class="form-input" placeholder="Search students by name or ID..." style="max-width:350px; width: 100%;">
                            <div style="margin-left:auto;display:flex;gap:0.6rem;flex-wrap:wrap;">
                                <button id="registerStudentBtn" class="btn btn-primary" style="white-space:nowrap;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                    Register Student
                                </button>
                                <button id="bulkImportBtn" class="btn btn-success" style="white-space:nowrap;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Import Students
                                </button>
                            </div>
                        </div>
                        <div id="teacherUserMgmt"></div>
                    </div>
                    
                    <!-- Tab: Student Attempts -->
                    <div id="teacher-attempts" class="tab-content hidden">
                        <div class="attempts-filter-bar" style="display:flex;gap:0.75rem;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;">
                            <input type="text" id="teacherAttemptSearch" class="form-input" placeholder="Search by student or exam..." style="max-width:250px;width:100%;">
                            <select id="csvExamFilter" class="form-input form-select" style="max-width:200px;width:100%;">
                                <option value="0">All Exams</option>
                            </select>
                            <input type="date" id="csvDateFrom" class="form-input" style="max-width:150px;" title="From date">
                            <input type="date" id="csvDateTo"   class="form-input" style="max-width:150px;" title="To date">
                            <a id="csvExportBtn" class="btn btn-success" style="text-decoration:none;white-space:nowrap;" href="#" target="_blank">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export CSV
                            </a>
                        </div>
                        <div id="teacherReviewTable"></div>
                    </div>

                    <!-- Tab: Question Bank -->
                    <div id="teacher-bank" class="tab-content hidden">
                        <div id="teacherBankContent"></div>
                    </div>

                    <!-- Tab: Class Groups -->
                    <div id="teacher-groups" class="tab-content hidden">
                        <div id="teacherGroupsContent"></div>
                    </div>

                    <!-- Tab: Access Codes -->
                    <div id="teacher-codes" class="tab-content hidden">
                        <div id="teacherCodesContent"></div>
                    </div>

                    <!-- Tab: Class Analytics (v32) -->
                    <div id="teacher-analytics" class="tab-content hidden">
                        <div id="teacherAnalyticsContent"></div>
                    </div>

                    <!-- Tab: Student Progress (v32) -->
                    <div id="teacher-progress" class="tab-content hidden">
                        <div id="teacherProgressContent"></div>
                    </div>

                    <!-- Tab: Study Resources (teacher) -->
                    <div id="teacher-resources" class="tab-content hidden">
                        <div id="teacherResourcesContent"></div>
                    </div>

                    <!-- Tab: Teacher Settings -->
                    <div id="teacher-settings" class="tab-content hidden">
                        <div id="teacherSettingsContent"></div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- MoEEE Style Exam Taking Interface -->
    <div id="examInterface" class="exam-interface hidden">
        <div class="container">
            <!-- Timer / Header section -->
            <div class="exam-header-strip">
                <div class="exam-header-left" style="display:flex;align-items:center;gap:0.6rem;">
                    <button id="studyBackBtn" class="btn btn-secondary btn-small" style="display:none;padding:0.35rem 0.65rem;" title="Exit to dashboard">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back
                    </button>
                    <h2 id="examTitle">Exam Title</h2>
                </div>
                <div class="exam-timer-box" id="examTimerContainer">
                    <span class="timer-label">Time Remaining:</span>
                    <span id="examTimer" class="timer-value">30:00</span>
                </div>
            </div>

            <!-- Progress bar — shows answered/total -->
            <div class="exam-progress-strip" id="examProgressStrip">
                <div class="exam-progress-bar-track">
                    <div class="exam-progress-bar-fill" id="examProgressBar" style="width:0%;background:var(--color-primary);transition:width 0.3s, background 0.3s;"></div>
                </div>
                <div class="exam-progress-label" id="examProgressLabel">0 / 0 answered</div>
            </div>

            <!-- Double Panel Workspace -->
            <div class="exam-workspace">
                
                <!-- Left Column: Split into Info Panel & Question Area -->
                <div class="exam-main-panel">
                    
                    <!-- Left Sub-column: Candidate Info Card -->
                    <div class="exam-info-card">
                        <div class="candidate-photo">
                            <!-- Placeholder avatar / icon -->
                            <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div class="candidate-details">
                            <div class="detail-label">Candidate Name:</div>
                            <div class="detail-value" id="candidateName">Student Name</div>
                            
                            <div class="detail-label">Candidate ID:</div>
                            <div class="detail-value" id="candidateId">ID12345</div>
                            
                            <div class="detail-label">Subject:</div>
                            <div class="detail-value" id="examSubjectName">Subject</div>
                        </div>
                    </div>

                    <!-- Right Sub-column: Question Text & Options -->
                    <div class="exam-content-area">
                        <div id="questionContainer" class="question-container">
                            <!-- Question & options will be injected dynamically -->
                        </div>
                        
                        <!-- Navigation Row (desktop) -->
                        <div class="exam-nav-controls">
                            <button id="prevBtn" class="btn btn-secondary" disabled>Previous</button>
                            <button id="flagBtn" class="btn btn-warning-outline">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                    <line x1="4" y1="22" x2="4" y2="15" />
                                </svg>
                                Flag
                            </button>
                            <button id="nextBtn" class="btn btn-primary">Next</button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Question Map / Navigation Grid -->
                <div class="exam-navigation-panel">
                    <div class="navigation-title">Exam Navigation</div>
                    <div class="questions-grid-container" id="questionsMapGrid">
                        <!-- Questions grid numbers generated dynamically (e.g. 1 to 20) -->
                    </div>
                    <div class="grid-legend">
                        <div class="legend-item">
                            <span class="legend-color legend-active"></span> Active
                        </div>
                        <div class="legend-item">
                            <span class="legend-color legend-answered"></span> Answered
                        </div>
                        <div class="legend-item">
                            <span class="legend-color legend-flagged"></span> Flagged
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile floating bottom nav bar (≤700px) -->
            <div class="exam-mobile-nav" id="examMobileNav" style="display:none;">
                <button id="mobPrevBtn" class="btn btn-secondary" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    Prev
                </button>
                <button id="mobFlagBtn" class="btn btn-warning-outline" title="Flag question">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    Flag
                </button>
                <button id="mobMapBtn" class="mob-nav-map-btn" title="Question map">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    <span style="font-size:0.62rem;">Map</span>
                </button>
                <button id="mobNextBtn" class="btn btn-primary">
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>

            <!-- Mobile question map bottom sheet -->
            <div class="mobile-qmap-backdrop" id="mobileQmapBackdrop"></div>
            <div class="mobile-qmap-sheet" id="mobileQmapSheet">
                <div class="mobile-qmap-handle"></div>
                <div class="mobile-qmap-title">
                    <span>Question Map</span>
                    <button class="mobile-qmap-close" id="mobileQmapClose">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <!-- mirrors the desktop grid -->
                <div class="questions-grid-container" id="mobileQuestionsMapGrid" style="grid-template-columns:repeat(8,1fr);"></div>
                <div class="grid-legend" style="flex-direction:row;flex-wrap:wrap;gap:0.75rem;margin-top:0.75rem;">
                    <div class="legend-item"><span class="legend-color legend-active"></span> Active</div>
                    <div class="legend-item"><span class="legend-color legend-answered"></span> Answered</div>
                    <div class="legend-item"><span class="legend-color legend-flagged"></span> Flagged</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Results Page — full-page centered layout with sticky header -->
    <div id="resultsPage" class="results-page hidden">
        <!-- Sticky header with back button -->
        <div class="results-page-header">
            <button id="resultsBackBtn" class="results-back-btn" title="Back to Dashboard">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <h2 class="results-page-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Exam Results
            </h2>
            <div class="results-header-spacer"></div>
        </div>

        <!-- Scrollable centered content -->
        <div class="results-outer-scroll">
            <div class="results-container">

                <!-- HERO: Score ring + exam title + pass/fail + subtitle -->
                <div class="results-hero">
                    <div class="results-score-ring-wrap">
                        <svg class="score-ring-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <circle class="score-ring-track" cx="100" cy="100" r="82"/>
                            <circle id="scoreRingFill" class="score-ring-fill" cx="100" cy="100" r="82"/>
                        </svg>
                        <div class="score-ring-inner">
                            <div id="finalScore" class="score-ring-pct">0%</div>
                            <div class="score-ring-lbl">Score</div>
                        </div>
                    </div>
                    <div class="results-hero-info">
                        <div id="passBadge" class="pass-badge">—</div>
                        <h2 id="reviewExamTitle" class="results-exam-title"></h2>
                        <div id="resultsSubtitle" class="results-subtitle">Your exam has been submitted.</div>
                        <div id="resultsBadges" class="results-badges-row" style="display:none;"></div>
                    </div>
                </div>

                <!-- STATS GRID: 4 cards -->
                <div class="results-stats-grid">
                    <div class="result-stat-card">
                        <div class="rsc-icon rsc-icon-correct">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div class="rsc-body">
                            <div id="correctAnswers" class="rsc-val">0/0</div>
                            <div class="rsc-lbl">Correct</div>
                        </div>
                    </div>
                    <div class="result-stat-card">
                        <div class="rsc-icon rsc-icon-time">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div class="rsc-body">
                            <div id="timeTaken" class="rsc-val">00:00</div>
                            <div class="rsc-lbl">Time Taken</div>
                        </div>
                    </div>
                    <div class="result-stat-card">
                        <div class="rsc-icon rsc-icon-questions">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        </div>
                        <div class="rsc-body">
                            <div id="resultsTotalQs" class="rsc-val">0</div>
                            <div class="rsc-lbl">Total Questions</div>
                        </div>
                    </div>
                    <div class="result-stat-card">
                        <div class="rsc-icon rsc-icon-points">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <div class="rsc-body">
                            <div id="resultsPoints" class="rsc-val">0/0</div>
                            <div class="rsc-lbl">Points</div>
                        </div>
                    </div>
                </div>

                <!-- SUMMARY BAR: visual breakdown of correct/incorrect/unanswered -->
                <div class="results-summary-card">
                    <div class="rsc-header">
                        <h3>Performance Breakdown</h3>
                        <div id="resultsPctText" class="rsc-pct-text">0%</div>
                    </div>
                    <div class="results-breakdown-bar">
                        <div id="bdCorrect" class="bd-seg bd-correct" title="Correct"></div>
                        <div id="bdWrong"   class="bd-seg bd-wrong"   title="Incorrect"></div>
                        <div id="bdUnanswered" class="bd-seg bd-unanswered" title="Unanswered"></div>
                    </div>
                    <div class="results-breakdown-legend">
                        <div class="bd-legend-item"><span class="bd-dot bd-correct"></span> <span id="bdCorrectTxt">0 correct</span></div>
                        <div class="bd-legend-item"><span class="bd-dot bd-wrong"></span> <span id="bdWrongTxt">0 wrong</span></div>
                        <div class="bd-legend-item"><span class="bd-dot bd-unanswered"></span> <span id="bdUnansweredTxt">0 unanswered</span></div>
                    </div>
                </div>

                <!-- Answer Review -->
                <div class="answer-review-section">
                    <div class="answer-review-header">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        Answer Review
                        <span id="answerReviewCount" class="answer-review-count"></span>
                    </div>
                    <div id="answerReviewList" class="answer-review-list"></div>
                </div>

                <!-- Action Buttons -->
                <div class="results-actions">
                    <button id="backToDashboard" class="btn btn-primary results-action-btn">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                        Back to Dashboard
                    </button>
                    <button id="downloadPdfBtn" class="btn btn-secondary results-action-btn" onclick="window.print()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Create Exam — Full-page section (redesigned) — NO .modal-content class to escape its constraints -->
    <div id="createExamModal" class="create-exam-overlay hidden">
        <div class="create-exam-fullpage">
            <!-- Section header with close + actions -->
            <div class="cefp-header">
                <div class="cefp-header-left">
                    <button type="button" id="closeModal" class="cefp-back-btn" title="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    </button>
                    <div>
                        <h3 id="createExamTitle">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            Create New Exam
                        </h3>
                        <p class="cefp-subtitle">Fill in the exam details, add questions, then publish.</p>
                    </div>
                </div>
                <div class="cefp-header-right">
                    <button type="button" id="cancelCreate" class="btn btn-secondary">Cancel</button>
                    <button type="submit" form="createExamForm" class="btn btn-success">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span id="createExamSubmitText">Publish Exam</span>
                    </button>
                </div>
            </div>

            <form id="createExamForm" class="create-exam-form cefp-body">
                <!-- Two-column layout: form fields on left, sticky summary on right -->
                <div class="cefp-grid">

                    <!-- LEFT: editable form -->
                    <div class="cefp-main-col">

                        <!-- SECTION 1: Exam Info -->
                        <div class="cefp-section">
                            <div class="cefp-section-header">
                                <span class="cefp-section-num">1</span>
                                <div>
                                    <div class="cefp-section-title">Exam Information</div>
                                    <div class="cefp-section-desc">Basic metadata about this exam.</div>
                                </div>
                            </div>
                            <div class="cefp-form-grid">
                                <div class="form-group cefp-span-2">
                                    <label for="examTitleInput">Exam Title <span class="req">*</span></label>
                                    <input type="text" id="examTitleInput" class="form-input" required placeholder="e.g. Java OOP Fundamentals">
                                </div>
                                <div class="form-group">
                                    <label for="examSubject">Subject <span class="req">*</span></label>
                                    <input type="text" id="examSubject" class="form-input" required placeholder="e.g. Computer Science" list="subjectSuggestions">
                                    <datalist id="subjectSuggestions">
                                        <option value="Java OOP">
                                        <option value="Database">
                                        <option value="C++">
                                        <option value="Computer Organization">
                                        <option value="Data Structures">
                                        <option value="Algorithms">
                                        <option value="Operating Systems">
                                        <option value="Networks">
                                    </datalist>
                                </div>
                                <div class="form-group">
                                    <label for="examDifficulty">Difficulty</label>
                                    <select id="examDifficulty" class="form-input form-select">
                                        <option value="Easy">🟢 Easy</option>
                                        <option value="Medium" selected>🟡 Medium</option>
                                        <option value="Hard">🔴 Hard</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="examDuration">Duration (min) <span class="req">*</span></label>
                                    <input type="number" id="examDuration" class="form-input" min="1" max="300" value="30" required>
                                </div>
                                <div class="form-group">
                                    <label for="examPassMark">Pass Mark (%)</label>
                                    <input type="number" id="examPassMark" class="form-input" min="0" max="100" value="60" help-text="Default is 60%">
                                </div>
                                <div class="form-group cefp-span-2">
                                    <label for="examCategory">Category (optional)</label>
                                    <input type="text" id="examCategory" class="form-input" placeholder="e.g. Programming, Mathematics, Science" list="categorySuggestions">
                                    <datalist id="categorySuggestions">
                                        <option value="Programming">
                                        <option value="Mathematics">
                                        <option value="Science">
                                        <option value="Language">
                                        <option value="Other">
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        <!-- SECTION 2: Exam Options -->
                        <div class="cefp-section">
                            <div class="cefp-section-header">
                                <span class="cefp-section-num">2</span>
                                <div>
                                    <div class="cefp-section-title">Exam Options</div>
                                    <div class="cefp-section-desc">Behavioral settings for this exam.</div>
                                </div>
                            </div>
                            <div class="cefp-options-grid">
                                <label class="cefp-toggle-row">
                                    <input type="checkbox" id="optShuffle">
                                    <span class="cefp-toggle-text">
                                        <span class="cefp-toggle-label">Shuffle questions</span>
                                        <span class="cefp-toggle-desc">Randomize question order for each student</span>
                                    </span>
                                </label>
                                <label class="cefp-toggle-row">
                                    <input type="checkbox" id="optShuffleOptions">
                                    <span class="cefp-toggle-text">
                                        <span class="cefp-toggle-label">Shuffle answer options</span>
                                        <span class="cefp-toggle-desc">Randomize A/B/C/D order per student (anti-cheat)</span>
                                    </span>
                                </label>
                                <label class="cefp-toggle-row">
                                    <input type="checkbox" id="optShowCorrect" checked>
                                    <span class="cefp-toggle-text">
                                        <span class="cefp-toggle-label">Show correct answers in review</span>
                                        <span class="cefp-toggle-desc">Students see correct answers after submitting</span>
                                    </span>
                                </label>
                                <label class="cefp-toggle-row">
                                    <input type="checkbox" id="optAllowReview">
                                    <span class="cefp-toggle-text">
                                        <span class="cefp-toggle-label">Allow re-review after submit</span>
                                        <span class="cefp-toggle-desc">Students can re-open the results page later</span>
                                    </span>
                                </label>
                                <div class="cefp-num-field">
                                    <label for="optAttempts">Max attempts allowed</label>
                                    <input type="number" id="optAttempts" class="form-input" min="1" max="10" value="1">
                                </div>
                            </div>
                        </div>

                        <!-- SECTION 4: Scheduling & Access -->
                        <div class="cefp-section">
                            <div class="cefp-section-header">
                                <span class="cefp-section-num">4</span>
                                <div>
                                    <div class="cefp-section-title">Scheduling &amp; Access</div>
                                    <div class="cefp-section-desc">Control when the exam is available and who can access it.</div>
                                </div>
                            </div>
                            <div class="cefp-form-grid">
                                <div class="form-group">
                                    <label for="examAvailableFrom">Available From (optional)</label>
                                    <input type="datetime-local" id="examAvailableFrom" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label for="examAvailableUntil">Available Until (optional)</label>
                                    <input type="datetime-local" id="examAvailableUntil" class="form-input">
                                </div>
                                <div class="form-group cefp-span-2">
                                    <label for="examAccessPassword">Access Password <span class="req">*</span></label>
                                    <div style="display:flex;gap:0.5rem;">
                                        <input type="text" id="examAccessPassword" class="form-input" placeholder="Students must enter this to start the exam" required>
                                        <button type="button" id="autoGeneratePasswordBtn" class="btn btn-secondary btn-small" style="white-space:nowrap;" title="Generate a random password">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                                            Auto-Generate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SECTION 5: Questions -->
                        <div class="cefp-section">
                            <div class="cefp-section-header">
                                <span class="cefp-section-num">5</span>
                                <div>
                                    <div class="cefp-section-title">Questions</div>
                                    <div class="cefp-section-desc">Add questions manually or import from your question bank.</div>
                                </div>
                                <div class="cefp-section-actions">
                                    <span id="questionCount" class="question-count-badge">0 Questions</span>
                                    <button type="button" id="importFromBankBtn" class="btn btn-secondary btn-small">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;vertical-align:middle;"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                                        Import from Bank
                                    </button>
                                    <button type="button" id="addQuestionBtn" class="btn btn-primary btn-small">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        Add Question
                                    </button>
                                </div>
                            </div>
                            <div id="questionsContainer" class="questions-builder-container">
                                <!-- Questions will be added dynamically -->
                            </div>
                        </div>

                    </div>

                    <!-- RIGHT: sticky live summary card -->
                    <aside class="cefp-summary-col">
                        <div class="cefp-summary-card" id="examSummaryCard">
                            <div class="cefp-summary-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Live Exam Summary
                            </div>
                            <div class="cefp-summary-stat">
                                <span class="ces-lbl">Title</span>
                                <span class="ces-val" id="sumTitle">—</span>
                            </div>
                            <div class="cefp-summary-stat-row">
                                <div class="cefp-summary-stat">
                                    <span class="ces-lbl">Subject</span>
                                    <span class="ces-val" id="sumSubject">—</span>
                                </div>
                                <div class="cefp-summary-stat">
                                    <span class="ces-lbl">Difficulty</span>
                                    <span class="ces-val" id="sumDifficulty">Medium</span>
                                </div>
                            </div>
                            <div class="cefp-summary-stat-row">
                                <div class="cefp-summary-stat">
                                    <span class="ces-lbl">Duration</span>
                                    <span class="ces-val" id="sumDuration">30 min</span>
                                </div>
                                <div class="cefp-summary-stat">
                                    <span class="ces-lbl">Pass Mark</span>
                                    <span class="ces-val" id="sumPassMark">60%</span>
                                </div>
                            </div>
                            <div class="cefp-summary-divider"></div>
                            <div class="cefp-summary-big">
                                <div class="ces-big-num" id="sumQuestionCount">0</div>
                                <div class="ces-big-lbl">Questions</div>
                            </div>
                            <div class="cefp-summary-big">
                                <div class="ces-big-num" id="sumTotalPoints">0</div>
                                <div class="ces-big-lbl">Total Points</div>
                            </div>
                            <div class="cefp-summary-divider"></div>
                            <div class="cefp-summary-options" id="sumOptions">
                                <span class="ces-opt-pill">Shuffle: Off</span>
                                <span class="ces-opt-pill">Review: On</span>
                                <span class="ces-opt-pill">Attempts: 1</span>
                            </div>
                        </div>
                    </aside>

                </div>
            </form>
        </div>
    </div>

    <!-- ============================================================
         LOGIN / SIGNUP — Full page, cream/light theme
         ============================================================ -->
    <div id="authModal" class="auth-fullpage">
        <div class="auth-panel">
        <!-- LEFT: Brand panel -->
        <aside class="auth-brand-side">
            <div class="auth-brand-content">
                <img src="Img/fetenAX.png" alt="FetenaX" class="auth-brand-logo">
                <h1 class="auth-brand-name">FetenaX</h1>
                <div class="auth-brand-features">
                    <div class="auth-feature">
                        <div class="auth-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <div>
                            <div class="auth-feature-title">Smart Exam System</div>
                            <div class="auth-feature-desc">Timed exams, instant scoring, and full answer review</div>
                        </div>
                    </div>
                    <div class="auth-feature">
                        <div class="auth-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        </div>
                        <div>
                            <div class="auth-feature-title">Real-time Analytics</div>
                            <div class="auth-feature-desc">Track performance with detailed stats and leaderboards</div>
                        </div>
                    </div>
                    <div class="auth-feature">
                        <div class="auth-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                        </div>
                        <div>
                            <div class="auth-feature-title">Badges &amp; Achievements</div>
                            <div class="auth-feature-desc">Earn rewards for milestones, streaks, and perfect scores</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="auth-brand-footer">
                Developed by <a href="https://github.com/kalcoder101" target="_blank" rel="noopener">kalcoder101</a>
            </div>
        </aside>

        <!-- RIGHT: Form panel — full page, no floating card -->
        <main class="auth-form-side">
            <div class="auth-form-inner">
                <div class="auth-mode-tabs">
                    <button type="button" class="auth-mode-tab active" data-mode="login" id="authTabLogin">Sign In</button>
                    <button type="button" class="auth-mode-tab" data-mode="signup" id="authTabSignup">Create Account</button>
                </div>

                <h2 id="authTitle" class="auth-form-title">Welcome back</h2>
                <p id="authSubtitle" class="auth-form-subtitle">Sign in to continue to your exams, progress, and study tools.</p>

                <form id="authForm" class="auth-form" autocomplete="on">
                    <div id="signupFields" class="auth-signup-fields hidden">
                        <div class="auth-field-group">
                            <label for="signupFullName">Full Name</label>
                            <input type="text" id="signupFullName" class="auth-input" autocomplete="name" placeholder="ex. John Doe">
                        </div>
                        <div class="auth-field-group">
                            <label for="signupUserId">Student ID</label>
                            <input type="text" id="signupUserId" class="auth-input" autocomplete="off" placeholder="ex. 1234">
                        </div>
                    </div>

                    <div class="auth-field-group">
                        <label for="authUsername">Username</label>
                        <input type="text" id="authUsername" class="auth-input" required autocomplete="username" placeholder="ex. john@school.com">
                    </div>

                    <div class="auth-field-group auth-password-field">
                        <label for="authPassword">Password</label>
                        <input type="password" id="authPassword" class="auth-input" required autocomplete="current-password" placeholder="••••••••">
                        <button type="button" id="toggleAuthPassword" class="auth-pw-toggle" title="Show/hide password">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" id="eyeIcon">
                                <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
                            </svg>
                        </button>
                    </div>

                    <button type="submit" class="auth-submit-btn" id="authSubmitBtn">
                        <span id="authSubmitText">Login</span>
                    </button>
                </form>

                <button type="button" class="hidden" id="switchAuthMode"></button>
            </div>
        </main>
        </div>
    </div>

    <!-- Reusable Custom Confirmation Modal -->
    <div id="customConfirmModal" class="modal hidden" style="z-index: 12000;">
        <div class="modal-content glass-card">
            <div class="modal-header">
                <h3 id="confirmModalTitle">Confirm Action</h3>
            </div>
            <div class="modal-body" style="margin: 1rem 0; font-size: 0.98rem; line-height: 1.5; color: var(--color-text-main);">
                <p id="confirmModalMessage">Are you sure you want to proceed?</p>
            </div>
            <div class="modal-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
                <button id="confirmCancelBtn" class="btn btn-secondary">Cancel</button>
                <button id="confirmOkBtn" class="btn btn-danger">Confirm</button>
            </div>
        </div>
    </div>

    <!-- Custom Reset Password Modal -->
    <div id="customResetPasswordModal" class="modal hidden" style="z-index: 12000;">
        <div class="modal-content glass-card">
            <div class="modal-header">
                <h3 id="resetPasswordTitle">Reset Student Password</h3>
                <button id="closeResetPasswordModal" class="close-btn">&times;</button>
            </div>
            <form id="resetPasswordForm" style="margin-top: 1rem;">
                <div class="form-group" style="display: flex; flex-direction: column; margin-bottom: 1rem;">
                    <label for="newStudentPasswordInput" style="margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; color: var(--color-text-muted);">New Password</label>
                    <input type="text" id="newStudentPasswordInput" class="form-input" placeholder="Min 6 characters" required style="width: 100%;">
                </div>
                <div class="modal-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" id="cancelResetPasswordBtn" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Password</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Bank Import Picker Modal -->
    <div id="bankImportModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:680px;width:96vw;max-height:88vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                    Import from Question Bank
                </h3>
                <button id="closeBankImport" class="close-btn">&times;</button>
            </div>
            <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">
                <input type="text" id="bankPickerSearch" class="form-input" placeholder="Search questions..." style="flex:1;min-width:160px;">
                <select id="bankPickerSubject" class="form-input form-select" style="max-width:180px;width:100%;">
                    <option value="">All Subjects</option>
                </select>
            </div>
            <div id="bankPickerList" style="display:flex;flex-direction:column;gap:0.5rem;max-height:340px;overflow-y:auto;padding-right:2px;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;padding-top:1rem;border-top:1.5px solid var(--color-border);">
                <span id="bankPickerSelCount" style="font-size:0.88rem;font-weight:600;color:var(--color-primary);">0 selected</span>
                <div style="display:flex;gap:0.5rem;">
                    <button id="cancelBankImport" class="btn btn-secondary">Cancel</button>
                    <button id="confirmBankImport" class="btn btn-primary">Import Selected</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Create Group Modal -->
    <div id="createGroupModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:400px;width:96vw;">
            <div class="modal-header">
                <h3>Create Class Group</h3>
                <button id="closeGroupModal" class="close-btn">&times;</button>
            </div>
            <div class="form-group" style="margin-top:1rem;">
                <label for="groupNameInput">Group Name</label>
                <input type="text" id="groupNameInput" class="form-input" placeholder="e.g. Class A — Section 1">
            </div>
            <div class="modal-actions" style="margin-top:1rem;">
                <button id="cancelGroupCreate" class="btn btn-secondary">Cancel</button>
                <button id="confirmGroupCreate" class="btn btn-primary">Create Group</button>
            </div>
        </div>
    </div>

    <!-- Student Profile Modal (Teacher view) -->
    <div id="studentProfileModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:780px;width:96vw;max-height:90vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Student Profile
                </h3>
                <button id="closeStudentProfile" class="close-btn">&times;</button>
            </div>
            <div id="studentProfileBody" style="padding:0.5rem 0;">
                <!-- Populated by JS: openStudentProfile() -->
            </div>
        </div>
    </div>

    <!-- Exam Access Password Modal (shown when student starts a password-protected exam) -->
    <div id="examPasswordModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:400px;width:96vw;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Exam Access Code
                </h3>
                <button id="closeExamPassword" class="close-btn">&times;</button>
            </div>
            <form id="examPasswordForm" style="margin-top:1rem;">
                <div class="form-group">
                    <label for="examPasswordInput">Enter the access code provided by your teacher:</label>
                    <input type="text" id="examPasswordInput" class="form-input" required placeholder="Access code" autocomplete="off">
                </div>
                <div id="examPasswordError" style="display:none;color:var(--color-danger);font-size:0.85rem;margin-top:0.5rem;"></div>
                <div class="modal-actions" style="margin-top:1rem;">
                    <button type="button" id="cancelExamPassword" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Start Exam</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Question Analytics Modal (Teacher) -->
    <div id="questionAnalyticsModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:880px;width:96vw;max-height:90vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    <span id="qaModalTitle">Question Analytics</span>
                </h3>
                <button id="closeQuestionAnalytics" class="close-btn">&times;</button>
            </div>
            <div id="questionAnalyticsBody" style="padding:0.5rem 0;"></div>
        </div>
    </div>

    <!-- Bulk Exam Import Modal (Teacher) -->
    <div id="bulkExamImportModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:720px;width:96vw;max-height:92vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Bulk Import Exam from CSV
                </h3>
                <button id="closeBulkExamImport" class="close-btn">&times;</button>
            </div>
            <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <div style="font-size:0.85rem;color:var(--color-text-secondary);">
                    CSV format: <code>question, optionA, optionB, optionC, optionD, correctAnswer (0-3), points (optional)</code>
                </div>
                <a href="#" id="downloadExamCsvTemplate" class="btn btn-secondary btn-small" style="text-decoration:none;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download CSV Template
                </a>
            </div>
            <form id="bulkExamImportForm">
                <!-- Template selector — loads saved templates to pre-fill fields -->
                <div class="form-group" style="margin-bottom:0.85rem;">
                    <label for="bulkExamTemplate">Load from Template (optional)</label>
                    <select id="bulkExamTemplate" class="form-input form-select">
                        <option value="">— No template, fill manually —</option>
                    </select>
                </div>
                <div class="cefp-form-grid">
                    <div class="form-group cefp-span-2">
                        <label for="bulkExamTitle">Exam Title <span class="req">*</span></label>
                        <input type="text" id="bulkExamTitle" class="form-input" required placeholder="e.g. Imported Quiz">
                    </div>
                    <div class="form-group">
                        <label for="bulkExamSubject">Subject <span class="req">*</span></label>
                        <input type="text" id="bulkExamSubject" class="form-input" required placeholder="e.g. Java">
                    </div>
                    <div class="form-group">
                        <label for="bulkExamDifficulty">Difficulty</label>
                        <select id="bulkExamDifficulty" class="form-input form-select">
                            <option value="Easy">Easy</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bulkExamDuration">Duration (min)</label>
                        <input type="number" id="bulkExamDuration" class="form-input" min="1" max="300" value="30">
                    </div>
                </div>
                <div class="form-group" style="margin-top:0.85rem;">
                    <label for="bulkExamCsvFile">CSV File <span class="req">*</span></label>
                    <input type="file" id="bulkExamCsvFile" class="form-input" accept=".csv,text/csv" required>
                </div>
                <div class="modal-actions" style="margin-top:1rem;">
                    <button type="button" id="cancelBulkExamImport" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-success">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><polyline points="20 6 9 17 4 12"/></svg>
                        Import &amp; Create Exam
                    </button>
                </div>
            </form>
            <div id="bulkExamImportResults" style="display:none;margin-top:1rem;"></div>
        </div>
    </div>

    <!-- Register Single Student Modal -->
    <div id="registerStudentModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:520px;width:96vw;max-height:90vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    Register New Student
                </h3>
                <button id="closeRegisterStudent" class="close-btn">&times;</button>
            </div>
            <form id="registerStudentForm" style="padding:1.25rem 1.5rem;">
                <div id="registerStudentError" style="display:none;margin-bottom:1rem;padding:0.7rem 0.9rem;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:0.5rem;font-size:0.88rem;"></div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.4rem;">Full Name <span style="color:var(--color-danger);">*</span></label>
                    <input type="text" id="regStuName" class="form-input" placeholder="e.g. Abebe Johnson" required style="width:100%;">
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.4rem;">Email <span style="color:var(--color-danger);">*</span></label>
                    <input type="email" id="regStuEmail" class="form-input" placeholder="e.g. abebe@example.com" required style="width:100%;">
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.4rem;">Student ID <span style="color:var(--color-danger);">*</span></label>
                    <input type="text" id="regStuUserId" class="form-input" placeholder="e.g. ETS1234/15" required style="width:100%;">
                </div>
                <div style="margin-bottom:1.25rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.4rem;">Password <span style="color:var(--color-danger);">*</span></label>
                    <div style="display:flex;gap:0.5rem;">
                        <input type="text" id="regStuPassword" class="form-input" placeholder="Min. 6 characters" required minlength="6" style="flex:1;">
                        <button type="button" id="regStuGenPw" class="btn btn-secondary" style="white-space:nowrap;">Generate</button>
                    </div>
                    <div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:0.3rem;">Tip: Click Generate to create a strong 8-char password.</div>
                </div>
                <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
                    <button type="button" id="cancelRegisterStudent" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>
                        Create Account
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Bulk Import Students Modal -->
    <div id="bulkImportModal" class="modal hidden" style="z-index:13000;">
        <div class="modal-content" style="max-width:680px;width:96vw;max-height:90vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Bulk Import Students
                </h3>
                <button id="closeBulkImport" class="close-btn">&times;</button>
            </div>

            <div style="margin-bottom:1rem;">
                <div style="font-size:0.88rem;color:var(--color-text-secondary);margin-bottom:0.5rem;">
                    Upload a <b>.csv</b> file. Each row must have 4 columns in this order:
                </div>
                <div class="bulk-import-format-hint">
                    <code>name, email, student_id, password</code>
                </div>
                <div style="font-size:0.82rem;color:var(--color-text-secondary);margin-top:0.5rem;">
                    A header row is optional and will be auto-detected. Passwords must be at least 6 characters.
                </div>
                <div style="margin-top:0.6rem;">
                    <a href="#" id="downloadCsvTemplate" class="btn btn-secondary btn-small" style="text-decoration:none;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download template
                    </a>
                </div>
            </div>

            <form id="bulkImportForm">
                <div class="form-group">
                    <label for="bulkImportFile">CSV File</label>
                    <input type="file" id="bulkImportFile" class="form-input" accept=".csv,text/csv" required>
                </div>
                <div class="modal-actions" style="margin-top:1rem;">
                    <button type="button" id="cancelBulkImport" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Upload &amp; Import
                    </button>
                </div>
            </form>

            <div id="bulkImportResults" style="display:none;margin-top:1rem;"></div>
        </div>
    </div>

    <!-- Question Discussion Modal -->
    <div id="questionDiscussionModal" class="modal hidden" style="z-index:13500;">
        <div class="modal-content" style="max-width:720px;width:96vw;max-height:85vh;display:flex;flex-direction:column;">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Question Discussion
                </h3>
                <button id="closeDiscussionModal" class="close-btn">&times;</button>
            </div>
            <div id="discussionQuestionPreview" style="padding:0.9rem 1.5rem;border-bottom:1px solid var(--color-border);font-size:0.92rem;color:var(--color-text-secondary);max-height:160px;overflow:auto;"></div>
            <div id="discussionList" style="flex:1;overflow-y:auto;padding:0.9rem 1.5rem;"></div>
            <div style="padding:0.75rem 1.5rem;border-top:1px solid var(--color-border);">
                <textarea id="discussionReplyText" class="form-input" placeholder="Add your comment or question..." rows="2" style="width:100%;resize:vertical;"></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:0.5rem;">
                    <button id="postDiscussionBtn" class="btn btn-primary btn-small">Post Comment</button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/core.js?v=41"></script>
    <script src="js/auth.js?v=41"></script>
    <script src="js/dashboard.js?v=41"></script>
    <script src="js/student.js?v=41"></script>
    <script src="js/teacher.js?v=41"></script>
    <script src="js/exam.js?v=41"></script>
    <script src="js/exam-creation.js?v=41"></script>
    <script src="js/study.js?v=41"></script>
    <script src="js/question-renderer.js?v=41"></script>
    <!-- Prism.js for syntax highlighting -->
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <script src="js/app.js?v=41"></script>
</body>
</html>
