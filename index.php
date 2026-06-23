<?php
// index.php - Main Entrypoint for FetenaX
session_start();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FetenaX – Your Exam, Your Vibe</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
                    <button id="aboutBtn" class="btn btn-secondary" title="About this site">About</button>
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

    <!-- About Overlay Modal -->
    <div id="aboutOverlay" class="modal hidden">
        <div class="modal-content">
            <button id="closeAbout" class="close-btn">&times;</button>
            <div class="about-flex">
                <img src="Img/fetenAX.png" alt="Exam System" class="about-img">
                <div class="about-content">
                    <div class="about-title">FetenaX – Your Exam, Your Vibe</div>
                    <div class="about-desc">
                        FetenaX Next gen, secure, mobile first exam hub. Students ID-login, progress in Java OOP, Database, C++, & Assembly. Teachers manage exams, view real-time analytics. Instant scores. Privacy on lock.
                    </div>
                    <div class="about-author">
                        <img src="Img/LOGO.jpg" alt="Kaleab" class="about-author-img">
                        <div>
                            <div class="about-author-name">Kaleab</div>
                            <div class="about-author-role">Developer & Designer</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Unified Dashboard Layout -->
    <div id="dashboard" class="dashboard-layout hidden">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
            <div class="sidebar-brand">
                <img src="Img/fetenAX.png" alt="FetenaX Logo" class="sidebar-logo">
            </div>
            
            <!-- Student Navigation Menu -->
            <nav id="studentNav" class="sidebar-menu hidden">
                <button class="menu-item active" data-tab="student-exams">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    <span>Available Exams</span>
                </button>
                <button class="menu-item" data-tab="student-history">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>My Performance</span>
                </button>
            </nav>
            
            <!-- Teacher Navigation Menu -->
            <nav id="teacherNav" class="sidebar-menu hidden">
                <button class="menu-item active" data-tab="teacher-overview">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                    <span>Overview</span>
                </button>
                <button class="menu-item" data-tab="teacher-exams">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Exam Settings</span>
                </button>
                <button class="menu-item" data-tab="teacher-students">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Students</span>
                </button>
                <button class="menu-item" data-tab="teacher-attempts">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Review Attempts</span>
                </button>
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
            <!-- Header section -->
            <header class="dashboard-header-strip">
                <div class="header-welcome-text">
                    <h2 id="mainContentTitle">Dashboard</h2>
                    <p id="mainContentSubtitle">Welcome to FetenaX</p>
                </div>
                <div class="header-controls">
                    <button id="mainAboutBtn" class="btn btn-secondary-header" title="About FetenaX">About</button>
                    <button id="mainThemeToggle" class="btn btn-secondary-header" title="Toggle Theme">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z"></path></svg>
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
                    
                    <!-- Tab: History & Stats -->
                    <div id="student-history" class="tab-content hidden">
                        <div class="student-stats-wrapper">
                            <div class="student-stats-card" id="studentStatsCard">
                                <!-- Stats populated via JS -->
                            </div>
                            <div class="student-recent-results">
                                <div class="recent-header-flex" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                                    <h3 style="font-size:1.15rem;font-weight:600;color:var(--text-color, #23272f); margin-bottom:0;">Recent Attempts</h3>
                                    <div class="filter-btn-group" style="display:flex; gap:0.3rem;">
                                        <button class="btn btn-secondary btn-small active" id="filterAttemptAll" style="padding:0.3em 0.8em; font-size:0.85rem;">All</button>
                                        <button class="btn btn-secondary btn-small" id="filterAttemptPass" style="padding:0.3em 0.8em; font-size:0.85rem;">Passed</button>
                                        <button class="btn btn-secondary btn-small" id="filterAttemptFail" style="padding:0.3em 0.8em; font-size:0.85rem;">Failed</button>
                                    </div>
                                </div>
                                <div id="studentRecentResults">
                                    <!-- Recent Attempts populated here -->
                                </div>
                            </div>
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
                            <button id="createExamBtn" class="btn btn-primary btn-create-exam">Create New Exam</button>
                        </div>
                        <div id="teacherAnalytics"></div>
                    </div>
                    
                    <!-- Tab: Student Accounts -->
                    <div id="teacher-students" class="tab-content hidden">
                        <div class="search-filter-row" style="margin-bottom:1.5rem; display:flex; gap:1rem;">
                            <input type="text" id="teacherStudentSearch" class="form-input" placeholder="Search students by name or ID..." style="max-width:350px; width: 100%;">
                        </div>
                        <div id="teacherUserMgmt"></div>
                    </div>
                    
                    <!-- Tab: Student Attempts -->
                    <div id="teacher-attempts" class="tab-content hidden">
                        <div class="search-filter-row" style="margin-bottom:1.5rem; display:flex; gap:1rem;">
                            <input type="text" id="teacherAttemptSearch" class="form-input" placeholder="Search attempts by student or exam name..." style="max-width:350px; width: 100%;">
                        </div>
                        <div id="teacherReviewTable"></div>
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
                <div class="exam-header-left">
                    <h2 id="examTitle">Exam Title</h2>
                </div>
                <div class="exam-timer-box" id="examTimerContainer">
                    <span class="timer-label">Time Remaining:</span>
                    <span id="examTimer" class="timer-value">30:00</span>
                </div>
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
                        
                        <!-- Navigation Row -->
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
        </div>
    </div>

    <!-- Results Overlay Page -->
    <div id="resultsPage" class="results-page hidden">
        <div class="results-outer-scroll">
            <div class="results-container">

                <!-- Score Ring -->
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

                <!-- Exam title & pass/fail -->
                <div id="reviewExamTitle" class="results-exam-title"></div>
                <div id="passBadge" class="pass-badge">—</div>

                <!-- Stats row -->
                <div class="results-stats-row">
                    <div class="result-stat-pill">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span id="correctAnswers" class="result-stat-val">0/0</span>
                        <span class="result-stat-lbl">Correct</span>
                    </div>
                    <div class="result-stat-pill">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span id="timeTaken" class="result-stat-val">00:00</span>
                        <span class="result-stat-lbl">Time Taken</span>
                    </div>
                </div>

                <!-- Answer Review -->
                <div class="answer-review-section">
                    <div class="answer-review-header">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        Answer Review
                    </div>
                    <div id="answerReviewList" class="answer-review-list"></div>
                </div>

                <!-- Back button -->
                <button id="backToDashboard" class="btn btn-primary btn-back-dash">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    Back to Dashboard
                </button>
            </div>
        </div>
    </div>

    <!-- Create Exam Modal -->
    <div id="createExamModal" class="modal hidden">
        <div class="modal-content create-exam-modal-content">
            <div class="modal-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    Create New Exam
                </h3>
                <button id="closeModal" class="close-btn">&times;</button>
            </div>

            <form id="createExamForm" class="create-exam-form">
                <div class="form-row">
                    <div class="form-group" style="flex:2;">
                        <label for="examTitleInput">Exam Title</label>
                        <input type="text" id="examTitleInput" class="form-input" required placeholder="e.g. Java OOP Fundamentals">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label for="examDifficulty">Difficulty</label>
                        <select id="examDifficulty" class="form-input form-select">
                            <option value="Easy">Easy</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex:2;">
                        <label for="examSubject">Subject</label>
                        <input type="text" id="examSubject" class="form-input" required placeholder="e.g. Computer Science">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label for="examDuration">Duration (min)</label>
                        <input type="number" id="examDuration" class="form-input" min="1" max="300" value="30" required>
                    </div>
                </div>
                <div class="questions-section-header">
                    <span id="questionCount" class="question-count-badge">0 Questions</span>
                    <button type="button" id="addQuestionBtn" class="btn btn-secondary btn-small">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add Question
                    </button>
                </div>
                <div id="questionsContainer" class="questions-builder-container">
                    <!-- Questions will be added dynamically -->
                </div>
                <div class="modal-actions" style="padding-top:1rem;border-top:1.5px solid var(--color-border);margin-top:0.5rem;">
                    <button type="button" id="cancelCreate" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-success">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Create Exam
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Login/Signup Modal -->
    <div id="authModal" class="modal" style="background:rgba(36,36,36,0.18);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="authTitle">Login</h3>
                <p>Sign in to your account</p>
            </div>
            <form id="authForm" class="create-exam-form" autocomplete="on">
                <div class="form-group">
                    <label for="authUsername">Username or ID</label>
                    <input type="text" id="authUsername" class="form-input" required autocomplete="username" placeholder="Enter username/email/ID">
                </div>
                <div class="form-group" style="position:relative;">
                    <label for="authPassword">Password</label>
                    <input type="password" id="authPassword" class="form-input" required autocomplete="current-password" placeholder="Enter password">
                    <button type="button" id="toggleAuthPassword" style="position:absolute;right:1rem;top:50%;transform:translateY(-50%);background:none;border:none;padding:0;cursor:pointer;outline:none;display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#1A508B" viewBox="0 0 256 256" id="eyeIcon">
                            <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
                        </svg>
                    </button>
                </div>
                <div id="signupFields" class="hidden">
                    <div class="form-group">
                        <label for="signupFullName">Full Name</label>
                        <input type="text" id="signupFullName" class="form-input" autocomplete="name" placeholder="Your full name">
                    </div>
                    <div class="form-group">
                        <label for="signupUserId">Student ID</label>
                        <input type="text" id="signupUserId" class="form-input" autocomplete="off" placeholder="Enter student ID (e.g. 1234)">
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary" id="authSubmitBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;">
                            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none" />
                            <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" stroke-width="2" fill="none" />
                        </svg>
                        Login
                    </button>
                    <button type="button" class="btn btn-secondary" id="switchAuthMode">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;">
                            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none" />
                            <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" stroke-width="2" fill="none" />
                            <path d="M19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        Sign up
                    </button>
                </div>
            </form>
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

    <footer class="site-footer">
        Developed by <a href="https://github.com/kalcoder101" target="_blank" rel="noopener" class="footer-link">kalcoder101</a> &bull; All rights reserved &copy; 2025
    </footer>

    <script src="script.js"></script>
</body>

</html>
