// js/student.js - Student dashboard functions for FetenaX
// No DOMContentLoaded wrapper — called from app.js after DOM is ready.

// =========================================================================
// STUDENT DASHBOARD
// =========================================================================

/**
 * Load the full student dashboard (exams list, stats, recent results).
 */
async function loadStudentDashboard() {
    var examsRes   = await apiRequest('get_exams', {}, 'GET');
    var resultsRes = await apiRequest('get_student_results', {}, 'GET');

    // Refresh global search cache
    searchCache.exams    = (examsRes.status === 'success' && examsRes.exams) ? examsRes.exams : [];
    searchCache.attempts = (resultsRes.status === 'success' && resultsRes.results) ? resultsRes.results : [];
    searchCache.students = [];

    // ---- Available Exams List ----
    var examsList = document.getElementById('examsList');
    examsList.innerHTML = '';

    if (examsRes.status === 'success' && examsRes.exams) {
        if (examsRes.exams.length === 0) {
            examsList.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">No exams available yet.</div>';
        } else {
            examsRes.exams.forEach(function (exam) {
                var card = document.createElement('div');
                card.className = 'exam-card';
                card.dataset.title   = (exam.title || '').toLowerCase();
                card.dataset.subject = (exam.subject || '').toLowerCase();
                card.innerHTML = [
                    '<div class="exam-card-header">',
                        '<div class="exam-icon">' + (exam.subject[0] || '?') + '</div>',
                        '<div>',
                            '<div class="exam-title">' + exam.title + '</div>',
                            '<div class="exam-subject">' + exam.subject + '</div>',
                        '</div>',
                    '</div>',
                    '<div class="exam-details">',
                        '<div class="exam-detail"><span>Duration:</span><span>' + exam.duration + ' min</span></div>',
                        '<div class="exam-detail"><span>Questions:</span><span>' + exam.totalQuestions + '</span></div>',
                        '<div class="exam-detail"><span>Difficulty:</span><span>' + (exam.difficulty || 'N/A') + '</span></div>',
                    '</div>',
                    '<div style="display:flex;gap:0.5rem;margin-top:0.25rem;">',
                        '<button class="btn btn-primary btn-full start-exam-btn" data-id="' + exam.id + '" style="flex:1;">Start Exam</button>',
                        '<button class="btn btn-secondary practice-btn" data-id="' + exam.id + '" title="Practice Mode — instant feedback, not saved" style="flex:0 0 auto;padding:0.6rem 0.85rem;">',
                            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
                        '</button>',
                    '</div>'
                ].join('');
                examsList.appendChild(card);
            });

            examsList.querySelectorAll('.start-exam-btn').forEach(function (btn) {
                btn.addEventListener('click', function () { startExam(parseInt(this.getAttribute('data-id'))); });
            });
            examsList.querySelectorAll('.practice-btn').forEach(function (btn) {
                btn.addEventListener('click', function () { startPractice(parseInt(this.getAttribute('data-id'))); });
            });
        }
    }

    // ---- Live Search for Exam Cards ----
    var searchInput = document.getElementById('studentExamSearch');
    if (searchInput) {
        var freshSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(freshSearch, searchInput);
        freshSearch.value = '';
        freshSearch.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            document.querySelectorAll('#examsList .exam-card').forEach(function (card) {
                var matches = card.dataset.title.indexOf(q) !== -1 || card.dataset.subject.indexOf(q) !== -1;
                card.style.display = matches ? '' : 'none';
            });
            var visible = Array.from(document.querySelectorAll('#examsList .exam-card')).filter(function (c) { return c.style.display !== 'none'; });
            var noResult = document.getElementById('examNoResult');
            if (q && visible.length === 0) {
                if (!noResult) {
                    var msg = document.createElement('div');
                    msg.id = 'examNoResult';
                    msg.style.cssText = 'padding:1.5rem;text-align:center;color:var(--color-text-secondary);grid-column:1/-1;';
                    msg.textContent = 'No exams found for "' + this.value + '".';
                    examsList.appendChild(msg);
                }
            } else if (noResult) {
                noResult.remove();
            }
        });
    }

    // ---- Stats Card (4-card grid + subject breakdown) ----
    var statsCard = document.getElementById('studentStatsCard');
    if (resultsRes.status === 'success' && resultsRes.stats) {
        var s = resultsRes.stats;
        var statCards = [
            { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>', value: s.totalExamsTaken, label: 'Exams Taken' },
            { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', value: s.averageScore + '%', label: 'Average Score' },
            { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>', value: s.bestScore + '%', label: 'Best Score' },
            { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>', value: (s.passRate || 0) + '%', label: 'Pass Rate' }
        ];

        var statsHTML = '<div class="student-perf-stats-grid">';
        statCards.forEach(function (sc) {
            statsHTML += '<div class="perf-stat-card"><div class="perf-stat-icon">' + sc.icon + '</div><div class="perf-stat-body"><div class="perf-stat-num">' + sc.value + '</div><div class="perf-stat-lbl">' + sc.label + '</div></div></div>';
        });
        statsHTML += '</div>';

        if (resultsRes.subjectStats && resultsRes.subjectStats.length > 0) {
            statsHTML += '<div class="subject-breakdown-section"><div class="subject-breakdown-title">Performance by Subject</div>';
            resultsRes.subjectStats.forEach(function (sub) {
                var avg = sub.avgScore || 0;
                var barColor = avg >= 75 ? 'var(--color-success)' : avg >= 50 ? '#f59e0b' : 'var(--color-danger)';
                statsHTML += '<div class="subject-bar-row"><div class="subject-bar-name" title="' + sub.subject + '">' + sub.subject + '</div><div class="subject-bar-track"><div class="subject-bar-fill" style="width:' + avg + '%;background:' + barColor + ';"></div></div><div class="subject-bar-pct">' + avg + '%</div></div>';
            });
            statsHTML += '</div>';
        }
        statsCard.innerHTML = statsHTML;
    }

    // ---- Badges & Achievements Showcase ----
    renderBadgesSection(resultsRes);

    // ---- Recent Results ----
    var studentRecentResults = document.getElementById('studentRecentResults');
    studentRecentResults.innerHTML = '';
    var allResults = (resultsRes.status === 'success' && resultsRes.results) ? resultsRes.results : [];

    if (allResults.length > 0) {
        var listDiv = document.createElement('div');
        listDiv.className = 'recent-results-list-v2';
        listDiv.id = 'attemptsListContainer';
        listDiv.style.cssText = 'display:flex;flex-direction:column;gap:0.55rem;';

        allResults.forEach(function (result, idx) {
            var div = document.createElement('div');
            div.className = 'attempt-card-v2 ' + (result.score >= 60 ? 'is-pass' : 'is-fail');
            div.dataset.passed = result.score >= 60 ? 'true' : 'false';
            var score = parseInt(result.score) || 0;
            var r = 22;
            var circ = 2 * Math.PI * r;
            var dashOffset = circ - (score / 100) * circ;
            var ringColor = score >= 75 ? '#2ecc71' : score >= 60 ? '#3498db' : '#e74c3c';
            var isLatest = idx === 0;
            var prevScore = idx < allResults.length - 1 ? parseInt(allResults[idx + 1].score) : null;
            var trendHTML = '';
            if (prevScore !== null && !isNaN(prevScore)) {
                var delta = score - prevScore;
                if (delta > 0)      trendHTML = '<span class="attempt-trend trend-up">▲ +' + delta + '</span>';
                else if (delta < 0) trendHTML = '<span class="attempt-trend trend-down">▼ ' + delta + '</span>';
                else                trendHTML = '<span class="attempt-trend trend-flat">═ 0</span>';
            }
            div.innerHTML = [
                '<div class="acv-rank">#' + (idx + 1) + '</div>',
                '<div class="acv-ring-wrap">',
                    '<svg class="acv-ring" viewBox="0 0 56 56">',
                        '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--color-border)" stroke-width="5"/>',
                        '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="' + ringColor + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + dashOffset + '" transform="rotate(-90 28 28)"/>',
                    '</svg>',
                    '<div class="acv-ring-pct" style="color:' + ringColor + ';">' + score + '<span class="acv-pct-sym">%</span></div>',
                '</div>',
                '<div class="acv-main">',
                    '<div class="acv-title-row">',
                        '<span class="acv-title">' + escapeHtmlNotif(result.examTitle) + '</span>',
                        (isLatest ? '<span class="acv-latest-pill">Latest</span>' : ''),
                    '</div>',
                    '<div class="acv-meta-row">',
                        '<span class="acv-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' + (result.completedAt || '').split(' ')[0] + '</span>',
                        '<span class="acv-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg> ' + result.correctAnswers + '/' + result.totalQuestions + ' correct</span>',
                        '<span class="acv-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + formatTime(result.timeTaken) + '</span>',
                        trendHTML,
                    '</div>',
                '</div>',
                '<div class="acv-actions">',
                    '<div class="acv-status-pill ' + (result.score >= 60 ? 'pass' : 'fail') + '">' + (result.score >= 60 ? '✓ Passed' : '✗ Failed') + '</div>',
                    '<button class="btn btn-secondary btn-small acv-review-btn" data-result-id="' + result.id + '" title="View full results">',
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Review',
                    '</button>',
                '</div>'
            ].join('');
            listDiv.appendChild(div);
        });
        studentRecentResults.appendChild(listDiv);

        listDiv.querySelectorAll('.acv-review-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { openPastAttempt(parseInt(btn.dataset.resultId)); });
        });
    } else {
        studentRecentResults.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);font-size:0.95rem;">No attempts yet. Take your first exam!</div>';
    }

    bindAttemptFilters();
}

/**
 * Bind the All / Passed / Failed filter buttons.
 */
function bindAttemptFilters() {
    var filterAll  = document.getElementById('filterAttemptAll');
    var filterPass = document.getElementById('filterAttemptPass');
    var filterFail = document.getElementById('filterAttemptFail');
    if (!filterAll || !filterPass || !filterFail) return;

    var newAll  = filterAll.cloneNode(true);
    var newPass = filterPass.cloneNode(true);
    var newFail = filterFail.cloneNode(true);
    filterAll.parentNode.replaceChild(newAll, filterAll);
    filterPass.parentNode.replaceChild(newPass, filterPass);
    filterFail.parentNode.replaceChild(newFail, filterFail);

    function applyFilter(type) {
        newAll.classList.toggle('active',  type === 'all');
        newPass.classList.toggle('active', type === 'pass');
        newFail.classList.toggle('active', type === 'fail');

        var container = document.getElementById('attemptsListContainer');
        if (!container) return;
        var visibleCount = 0;
        container.querySelectorAll('.attempt-card-v2').forEach(function (item) {
            var passed = item.dataset.passed === 'true';
            var show = true;
            if (type === 'pass') show = passed;
            if (type === 'fail') show = !passed;
            item.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        var noMsg = document.getElementById('filterNoResult');
        if (visibleCount === 0) {
            if (!noMsg) {
                var m = document.createElement('div');
                m.id = 'filterNoResult';
                m.style.cssText = 'padding:1.5rem;text-align:center;color:var(--color-text-secondary);';
                m.textContent = type === 'pass' ? 'No passed attempts yet.' : 'No failed attempts.';
                var sr = document.getElementById('studentRecentResults');
                if (sr) sr.appendChild(m);
            }
        } else if (noMsg) {
            noMsg.remove();
        }
    }

    newAll.addEventListener('click',  function () { applyFilter('all'); });
    newPass.addEventListener('click', function () { applyFilter('pass'); });
    newFail.addEventListener('click', function () { applyFilter('fail'); });
}

/**
 * Load the leaderboard tab.
 */
async function loadLeaderboard() {
    var examId = parseInt(document.getElementById('leaderboardExamSelect')?.value || '0');
    var res = await apiRequest('get_leaderboard', { examId: examId }, 'GET');

    // Populate exam selector if not already
    var sel = document.getElementById('leaderboardExamSelect');
    if (sel && res.exams && sel.options.length <= 1) {
        res.exams.forEach(function (e) {
            var opt = document.createElement('option');
            opt.value = e.id; opt.textContent = e.title + ' (' + e.subject + ')';
            sel.appendChild(opt);
        });
        sel.addEventListener('change', function () { loadLeaderboard(); });
    }

    var container = document.getElementById('leaderboardContainer');
    if (res.status !== 'success' || !res.leaderboard || res.leaderboard.length === 0) {
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">No leaderboard data available yet.</div>';
        return;
    }

    var html = '<div class="leaderboard-list">';
    res.leaderboard.forEach(function (entry, idx) {
        var rank = idx + 1;
        var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
        var initials = (entry.name || '??').substring(0, 2).toUpperCase();
        var scoreClass = entry.bestScore >= 75 ? 'high' : entry.bestScore >= 60 ? 'mid' : 'low';
        html += [
            '<div class="lb-row rank-' + rank + '">',
                '<div class="lb-rank">' + medal + '</div>',
                '<div class="lb-avatar" style="background:var(--color-primary);">' + initials + '</div>',
                '<div class="lb-name">' + entry.name + '</div>',
                '<div class="lb-attempts">' + entry.attempts + ' attempt' + (entry.attempts > 1 ? 's' : '') + '</div>',
                '<div class="lb-score ' + scoreClass + '">' + entry.bestScore + '%</div>',
            '</div>'
        ].join('');
    });
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Load the calendar tab with month navigation.
 * Uses .calendar-widget, .calendar-nav, .calendar-grid, .calendar-day classes
 * defined in css/student.css for proper styling.
 */
var calendarCurrentDate = new Date();

async function loadCalendar() {
    var container = document.getElementById('calendarContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading calendar…</div>';

    var now = calendarCurrentDate;
    var year = now.getFullYear();
    var month = now.getMonth() + 1;

    var res = await apiRequest('get_calendar_data', { year: year, month: month }, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Failed to load calendar.</div>';
        return;
    }

    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var daysInMonth = new Date(year, month, 0).getDate();
    var firstDay = new Date(year, month - 1, 1).getDay();
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    var eventsByDate = {};
    (res.events || []).forEach(function (ev) {
        if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
        eventsByDate[ev.date].push(ev);
    });

    // Build modern calendar with card-like day cells
    var html = '<div class="calendar-widget">';
    // Navigation header
    html += '<div class="calendar-nav">';
    html += '<button id="calPrev" class="cal-nav-btn" title="Previous month"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>';
    html += '<h3 class="cal-month-title">' + monthNames[month - 1] + ' ' + year + '</h3>';
    html += '<button id="calNext" class="cal-nav-btn" title="Next month"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></button>';
    html += '</div>';

    // Weekday headers
    html += '<div class="cal-weekdays">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function (d) {
        html += '<div class="cal-weekday">' + d + '</div>';
    });
    html += '</div>';

    // Day cells grid
    html += '<div class="cal-grid">';
    for (var i = 0; i < firstDay; i++) {
        html += '<div class="cal-day-cell empty"></div>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
        var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var evts = eventsByDate[dateStr] || [];
        var isToday = dateStr === todayStr;
        var hasEvent = evts.length > 0;

        html += '<div class="cal-day-card' + (isToday ? ' is-today' : '') + (hasEvent ? ' has-event' : '') + '">';
        html += '<div class="cal-day-num">' + day + '</div>';
        if (hasEvent) {
            html += '<div class="cal-event-dots">';
            evts.forEach(function (ev) {
                var dotClass = ev.type === 'exam_open' ? 'dot-open' : ev.type === 'exam_close' ? 'dot-close' : 'dot-attempt';
                html += '<span class="cal-dot ' + dotClass + '"></span>';
            });
            html += '</div>';
            // Show first event title
            if (evts.length > 0) {
                html += '<div class="cal-event-preview">' + escapeHtmlNotif(evts[0].title.substring(0, 20)) + (evts[0].title.length > 20 ? '…' : '') + '</div>';
            }
        }
        html += '</div>';
    }
    html += '</div>'; // close cal-grid

    // Legend
    html += '<div class="cal-legend">';
    html += '<span class="cal-legend-item"><span class="cal-dot dot-open"></span> Exam opens</span>';
    html += '<span class="cal-legend-item"><span class="cal-dot dot-close"></span> Exam closes</span>';
    html += '<span class="cal-legend-item"><span class="cal-dot dot-attempt"></span> Your attempt</span>';
    html += '</div>';

    // Upcoming events list (card-style)
    if (res.events && res.events.length > 0) {
        html += '<div class="cal-events-list">';
        html += '<div class="cal-events-title">Events this month</div>';
        res.events.forEach(function (ev) {
            var typeClass = ev.type === 'exam_open' ? 'ev-open' : ev.type === 'exam_close' ? 'ev-close' : 'ev-attempt';
            var icon = ev.type === 'exam_open' ? '📅' : ev.type === 'exam_close' ? '🔒' : '📝';
            html += '<div class="cal-event-row ' + typeClass + '">';
            html += '<span class="cal-ev-icon">' + icon + '</span>';
            html += '<span class="cal-ev-date">' + (ev.date || '').split('-').slice(1).join('/') + '</span>';
            html += '<span class="cal-ev-title">' + escapeHtmlNotif(ev.title) + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    html += '</div>'; // close calendar-widget
    container.innerHTML = html;

    // Wire navigation
    document.getElementById('calPrev')?.addEventListener('click', function () {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        loadCalendar();
    });
    document.getElementById('calNext')?.addEventListener('click', function () {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        loadCalendar();
    });
}

/**
 * Load settings panel.
 * @param {string} role - 'student' or 'teacher'
 */
function loadSettingsPanel(role) {
    var container = document.getElementById(role === 'student' ? 'studentSettingsContent' : 'teacherSettingsContent');
    if (!container) return;

    var name = currentUser.name || '';
    var initials = name.substring(0, 2).toUpperCase() || 'US';
    var avatarColor = currentUser.avatar && currentUser.avatar.indexOf('#') === 0 ? currentUser.avatar : '#57785a';
    var email = currentUser.email || '';
    var userId = currentUser.userId || '';

    var colors = ['#57785a','#e07a5f','#3d5a80','#f4a261','#2a9d8f','#e63946','#457b9d','#a3cc3b','#6d597a','#b56576'];

    container.innerHTML = [
        '<div class="settings-panel">',
            '<div class="settings-section">',
                '<div class="settings-section-title">Profile Settings</div>',
                '<div style="display:flex;gap:1.5rem;align-items:flex-start;margin-bottom:1.5rem;">',
                    '<div>',
                        '<div class="avatar-preview" id="settingsAvatarPreview" style="background:' + avatarColor + ';margin-bottom:0.75rem;">' + initials + '</div>',
                        '<div class="avatar-picker" id="avatarColorPicker" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;">',
                            colors.map(function (c) { return '<div class="avatar-swatch' + (c === avatarColor ? ' selected' : '') + '" style="background:' + c + ';cursor:pointer;width:44px;height:44px;border-radius:50%;border:2px solid transparent;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" data-color="' + c + '">' + (c === avatarColor ? '✓' : '') + '</div>'; }).join(''),
                        '</div>',
                    '</div>',
                    '<div style="flex:1;">',
                        '<div class="form-group" style="margin-bottom:0.75rem;">',
                            '<label for="settingsNameInput"><strong>Display Name</strong></label>',
                            '<input type="text" id="settingsNameInput" class="form-input" value="' + escapeHtmlNotif(name) + '" placeholder="Your display name">',
                        '</div>',
                        '<div class="form-group" style="margin-bottom:0.75rem;">',
                            '<label><strong>Account Information</strong></label>',
                            '<div style="background:var(--color-bg-secondary);padding:0.75rem;border-radius:0.5rem;font-size:0.9rem;">',
                                '<div style="margin-bottom:0.5rem;"><span style="color:var(--color-text-secondary);">Email:</span> ' + escapeHtmlNotif(email) + '</div>',
                                '<div><span style="color:var(--color-text-secondary);">ID:</span> ' + escapeHtmlNotif(userId) + '</div>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>',
                '<hr style="margin:1.5rem 0;border:none;border-top:1px solid var(--color-border);">',
                '<div style="margin-bottom:1.5rem;">',
                    '<div class="settings-section-title" style="margin-bottom:1rem;">Security</div>',
                    '<div class="form-group" style="margin-bottom:0.75rem;">',
                        '<label for="settingsNewPassword"><strong>New Password</strong></label>',
                        '<input type="password" id="settingsNewPassword" class="form-input" placeholder="Leave empty to keep current password">',
                        '<div style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:0.3rem;">Minimum 6 characters</div>',
                    '</div>',
                    '<div class="form-group" style="margin-bottom:0.75rem;" id="currPassGroup" style="display:none;">',
                        '<label for="settingsCurrentPassword"><strong>Current Password</strong> <span style="color:var(--color-danger);">*</span></label>',
                        '<input type="password" id="settingsCurrentPassword" class="form-input" placeholder="Required to make changes">',
                    '</div>',
                '</div>',
                '<div style="display:flex;gap:0.75rem;align-items:center;">',
                    '<button id="settingsSaveBtn" class="btn btn-primary" style="position:relative;">',
                        '<span id="settingsSaveBtnText">Save Changes</span>',
                        '<span id="settingsSaveSpinner" style="display:none;margin-left:0.5rem;">⟳</span>',
                    '</button>',
                    '<span id="settingsSaveMsg" style="font-size:0.9rem;"></span>',
                '</div>',
            '</div>',
        '</div>'
    ].join('');

    // ─────────────────────────────────────────────────────────────
    // Wire avatar color picker
    // ─────────────────────────────────────────────────────────────
    var avatarSwatches = container.querySelectorAll('.avatar-swatch');
    avatarSwatches.forEach(function (swatch) {
        swatch.addEventListener('click', function () {
            avatarSwatches.forEach(function (s) { 
                s.classList.remove('selected');
                s.style.borderColor = 'transparent';
                s.textContent = '';
            });
            this.classList.add('selected');
            this.style.borderColor = 'var(--color-text)';
            this.textContent = '✓';
            document.getElementById('settingsAvatarPreview').style.background = this.dataset.color;
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Show/hide current password field based on new password input
    // ─────────────────────────────────────────────────────────────
    var newPassInput = document.getElementById('settingsNewPassword');
    var currPassGroup = document.getElementById('currPassGroup');
    var currPassInput = document.getElementById('settingsCurrentPassword');
    
    newPassInput.addEventListener('input', function () {
        if (this.value.trim().length > 0) {
            currPassGroup.style.display = 'block';
            currPassInput.required = true;
        } else {
            currPassGroup.style.display = 'none';
            currPassInput.required = false;
            currPassInput.value = '';
        }
    });

    // ─────────────────────────────────────────────────────────────
    // Wire save button
    // ─────────────────────────────────────────────────────────────
    var saveBtn = document.getElementById('settingsSaveBtn');
    var saveBtnText = document.getElementById('settingsSaveBtnText');
    var saveSpinner = document.getElementById('settingsSaveSpinner');
    var saveMsg = document.getElementById('settingsSaveMsg');

    saveBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        var newName    = document.getElementById('settingsNameInput').value.trim();
        var newPass    = document.getElementById('settingsNewPassword').value.trim();
        var currPass   = document.getElementById('settingsCurrentPassword').value;
        var selColor   = container.querySelector('.avatar-swatch.selected');
        var avatarVal  = selColor ? selColor.dataset.color : avatarColor;

        // ─ Validation ─
        if (!newName) { 
            showToast('Please enter a display name.', 'error'); 
            return; 
        }

        if (newName.length < 2) {
            showToast('Display name must be at least 2 characters.', 'error');
            return;
        }

        if (newPass && newPass.length < 6) {
            showToast('New password must be at least 6 characters.', 'error');
            return;
        }

        if (newPass && !currPass) {
            showToast('Enter your current password to change it.', 'error');
            return;
        }

        // ─ Send request ─
        saveBtn.disabled = true;
        saveBtnText.style.display = 'none';
        saveSpinner.style.display = 'inline';
        saveMsg.textContent = '';

        try {
            var res = await apiRequest('update_profile', {
                name: newName, 
                avatar: avatarVal,
                newPassword: newPass || '', 
                currentPassword: currPass || ''
            });

            if (res.status === 'success') {
                currentUser = res.user;
                
                // Update sidebar
                var sidebarAvatar = document.getElementById('sidebarAvatar');
                var sidebarUserName = document.getElementById('sidebarUserName');
                if (sidebarAvatar) sidebarAvatar.textContent = (currentUser.name || 'US').substring(0, 2).toUpperCase();
                if (sidebarUserName) sidebarUserName.textContent = currentUser.name;

                // Clear form
                document.getElementById('settingsNewPassword').value = '';
                document.getElementById('settingsCurrentPassword').value = '';
                currPassGroup.style.display = 'none';

                saveMsg.textContent = 'Profile updated successfully!';
                saveMsg.style.color = 'var(--color-success)';
                showToast('Profile updated successfully.', 'success');

                // Clear message after 3 seconds
                setTimeout(function () { saveMsg.textContent = ''; }, 3000);
            } else {
                var errorMsg = res.message || 'Failed to update profile. Please try again.';
                saveMsg.textContent = errorMsg;
                saveMsg.style.color = 'var(--color-danger)';
                showToast(errorMsg, 'error');
            }
        } catch (err) {
            console.error('Profile update error:', err);
            saveMsg.textContent = 'Network error. Please try again.';
            saveMsg.style.color = 'var(--color-danger)';
            showToast('Network error. Please try again.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtnText.style.display = 'inline';
            saveSpinner.style.display = 'none';
        }
    });
}

/**
 * Render badges section in student performance tab.
 * @param {object} resultsRes - API response from get_student_results
 */
function renderBadgesSection(resultsRes) {
    var section = document.getElementById('studentBadgesSection');
    var grid    = document.getElementById('studentBadgesGrid');
    if (!section || !grid) return;

    var allBadges = [
        { type: 'first_pass',    label: 'First Pass',    icon: '🎯', desc: 'Score 60% or higher on any exam' },
        { type: 'perfect_score', label: 'Perfect Score', icon: '💯', desc: 'Score 100% on any exam' },
        { type: 'five_exams',    label: '5 Exams Taken', icon: '⭐', desc: 'Complete 5 exams' },
        { type: 'ten_exams',     label: '10 Exams Taken',icon: '🏆', desc: 'Complete 10 exams' },
        { type: 'streak_3',      label: '3-Pass Streak', icon: '🔥', desc: 'Pass 3 exams in a row' }
    ];

    var earnedBadges = {};
    if (resultsRes.badges) {
        resultsRes.badges.forEach(function (b) { earnedBadges[b.type] = b; });
    }

    var hasEarned = Object.keys(earnedBadges).length > 0;
    section.style.display = hasEarned ? 'block' : 'none';
    if (!hasEarned) return;

    grid.innerHTML = '';
    allBadges.forEach(function (b) {
        var earned = earnedBadges[b.type];
        var card = document.createElement('div');
        card.className = 'badge-card ' + (earned ? 'earned' : 'locked');
        card.innerHTML = [
            '<div class="badge-icon">' + b.icon + '</div>',
            '<div class="badge-label">' + b.label + '</div>',
            '<div class="badge-desc">' + b.desc + '</div>',
            '<div class="badge-status">' + (earned ? '✓ Earned' : '🔒 Locked') + '</div>'
        ].join('');
        grid.appendChild(card);
    });
}
