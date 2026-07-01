// js/study.js — FetenaX v31 study & analytics features.
// Loaded after the other JS files. Wires up:
//   - Subject-wise practice
//   - Mock Exit Exam simulator
//   - Spaced Repetition System (SRS) review queue
//   - Subject mastery radar chart (pure-SVG, no dependencies)
//   - Performance-over-time line chart
//   - Weakness report with smart recommendations
//   - Study resources library (student view)
//   - Teacher study-resources management
//   - Question discussion thread
//   - Study schedule planner
//
// All functions are global so dashboard.js can lazy-load them via switchTab().

// =========================================================================
// PRACTICE SESSION STATE (used by subject-practice, mock, SRS)
// =========================================================================
var studySession = {
    mode: null,        // 'subject' | 'mock' | 'srs' | 'practice'
    subject: '',
    questions: [],
    currentIndex: 0,
    answers: {},       // {qid: chosenIdx}
    startTime: 0,
    hintsRevealed: {}  // {qid: 0|1|2}
};

// =========================================================================
// SUBJECTS — list & practice launcher
// =========================================================================
async function loadStudentSubjects() {
    var container = document.getElementById('studentSubjectsContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading subjects…</div>';

    var res = await apiRequest('study_list_subjects', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load subjects.</div>';
        return;
    }
    if (!res.subjects || res.subjects.length === 0) {
        container.innerHTML =
            '<div class="analytics-empty-state">' +
                '<div class="aems-title">No subjects available yet</div>' +
                '<div class="aems-desc">Once your teacher publishes exams with subjects, you can practice them here.</div>' +
            '</div>';
        return;
    }

    var html =
        '<div style="margin-bottom:1.25rem;padding:0.85rem 1rem;background:rgba(87,120,90,0.08);border:1px solid rgba(87,120,90,0.18);border-radius:0.6rem;">' +
            '<b>Practice by Subject:</b> Pick a subject and the number of questions. We pull random questions from all exams tagged with that subject. Instant feedback after each question, plus explanations and hints.' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;">';

    res.subjects.forEach(function (s) {
        var due = s.dueCount ? '<span style="margin-left:0.5rem;color:var(--color-danger);font-size:0.78rem;">🔥 ' + s.dueCount + ' due</span>' : '';
        html +=
            '<div class="subject-practice-card" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.75rem;padding:1.1rem;">' +
                '<div style="font-weight:700;font-size:1.05rem;color:var(--color-text);margin-bottom:0.35rem;">' + escapeHtmlNotif(s.subject) + due + '</div>' +
                '<div style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:0.85rem;">' + s.qCount + ' question' + (s.qCount === 1 ? '' : 's') + ' available</div>' +
                '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;">' +
                    '<button class="btn btn-primary btn-small" data-subj-practice="' + escapeHtmlNotif(s.subject) + '" data-limit="10">Quick (10)</button>' +
                    '<button class="btn btn-secondary btn-small" data-subj-practice="' + escapeHtmlNotif(s.subject) + '" data-limit="25">25 Qs</button>' +
                    '<button class="btn btn-secondary btn-small" data-subj-practice="' + escapeHtmlNotif(s.subject) + '" data-limit="50">50 Qs</button>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-subj-practice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var subj  = this.getAttribute('data-subj-practice');
            var limit = parseInt(this.getAttribute('data-limit') || '10', 10);
            startSubjectPractice(subj, limit);
        });
    });
}

async function startSubjectPractice(subject, limit) {
    showToast('Loading ' + limit + ' questions on ' + subject + '…', 'info');
    var res = await apiRequest('study_practice_by_subject', { subject: subject, limit: limit }, 'GET');
    if (res.status !== 'success') {
        alert(res.message || 'Failed to load practice questions.');
        return;
    }
    studySession.mode = 'subject';
    studySession.subject = subject;
    studySession.questions = res.questions;
    studySession.currentIndex = 0;
    studySession.answers = {};
    studySession.hintsRevealed = {};
    studySession.startTime = Date.now();
    enterStudyInterface();
}

// =========================================================================
// MOCK EXIT EXAM
// =========================================================================
async function loadMockExam() {
    var container = document.getElementById('studentMockContent');
    if (!container) return;

    container.innerHTML =
        '<div class="mock-hero" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.9rem;padding:2rem;text-align:center;margin-bottom:1.5rem;">' +
            '<div style="font-size:3rem;line-height:1;margin-bottom:0.6rem;">🎯</div>' +
            '<h2 style="font-size:1.6rem;font-weight:800;color:var(--color-text);margin-bottom:0.5rem;">Mock Exit Exam Simulator</h2>' +
            '<p style="color:var(--color-text-secondary);max-width:600px;margin:0 auto 1.25rem;line-height:1.55;">This simulates the real AAU Computer Science Exit Exam: <b>115 random questions</b> pulled across all 15 CS subjects, with a strict <b>3-hour timer</b>. You will get NO feedback during the exam — just like the real thing. A comprehensive scorecard appears at the end.</p>' +
            '<button id="startMockBtn" class="btn btn-primary" style="font-size:1rem;padding:0.7rem 2rem;">Start Mock Exam (3 hours)</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">' +
            '<div class="stat-tile" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;text-align:center;">' +
                '<div style="font-size:1.6rem;font-weight:800;color:var(--color-primary);">115</div><div style="font-size:0.82rem;color:var(--color-text-secondary);">Questions</div>' +
            '</div>' +
            '<div class="stat-tile" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;text-align:center;">' +
                '<div style="font-size:1.6rem;font-weight:800;color:var(--color-primary);">3 hrs</div><div style="font-size:0.82rem;color:var(--color-text-secondary);">Duration</div>' +
            '</div>' +
            '<div class="stat-tile" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;text-align:center;">' +
                '<div style="font-size:1.6rem;font-weight:800;color:var(--color-primary);">15</div><div style="font-size:0.82rem;color:var(--color-text-secondary);">Subjects</div>' +
            '</div>' +
            '<div class="stat-tile" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;text-align:center;">' +
                '<div style="font-size:1.6rem;font-weight:800;color:var(--color-primary);">60%</div><div style="font-size:0.82rem;color:var(--color-text-secondary);">Pass mark</div>' +
            '</div>' +
        '</div>';

    var btn = document.getElementById('startMockBtn');
    if (btn) {
        var fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.addEventListener('click', async function () {
            fresh.disabled = true;
            fresh.textContent = 'Generating your mock exam…';
            var res = await apiRequest('study_generate_mock', {}, 'GET');
            if (res.status !== 'success') {
                alert(res.message || 'Failed to generate mock exam.');
                fresh.disabled = false;
                fresh.textContent = 'Start Mock Exam (3 hours)';
                return;
            }
            studySession.mode = 'mock';
            studySession.subject = 'Mixed';
            studySession.questions = res.questions;
            studySession.currentIndex = 0;
            studySession.answers = {};
            studySession.hintsRevealed = {};
            studySession.startTime = Date.now();
            enterStudyInterface(true); // mockMode = true (no hints, no feedback)
        });
    }
}

// =========================================================================
// SRS — Review Queue
// =========================================================================
async function loadSrsQueue() {
    var container = document.getElementById('studentSrsContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading review queue…</div>';

    var [statsRes, dueRes] = await Promise.all([
        apiRequest('study_srs_stats', {}, 'GET'),
        apiRequest('study_srs_due', { limit: 20 }, 'GET')
    ]);

    if (statsRes.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load SRS data.</div>';
        return;
    }
    var stats = statsRes;
    var due = (dueRes.status === 'success' ? dueRes.questions : []) || [];

    var boxesHtml = '';
    var boxLabels = ['New', 'Learning', 'Familiar', 'Known', 'Mastered'];
    for (var i = 1; i <= 5; i++) {
        var count = stats.boxes[i] || 0;
        var pct = stats.total > 0 ? Math.round(count * 100 / stats.total) : 0;
        boxesHtml +=
            '<div style="flex:1;text-align:center;padding:0.85rem 0.5rem;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.5rem;">' +
                '<div style="font-size:0.74rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;">' + boxLabels[i-1] + '</div>' +
                '<div style="font-size:1.4rem;font-weight:800;color:var(--color-primary);">' + count + '</div>' +
                '<div style="font-size:0.72rem;color:var(--color-text-secondary);">' + pct + '%</div>' +
            '</div>';
    }

    var html =
        '<div style="margin-bottom:1rem;padding:0.85rem 1rem;background:rgba(163,204,59,0.08);border:1px solid rgba(163,204,59,0.25);border-radius:0.6rem;">' +
            '<b>🔁 Spaced Repetition</b> — Questions you get wrong are automatically scheduled to reappear at increasing intervals (1d → 3d → 7d → 14d → 30d). Master them by repeating.' +
        '</div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">' + boxesHtml + '</div>' +
        '<div style="display:flex;gap:1rem;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;">' +
            '<div style="font-size:1.05rem;font-weight:700;color:var(--color-text);">Due now: <span style="color:var(--color-danger);">' + stats.due + '</span></div>' +
            '<div style="font-size:0.85rem;color:var(--color-text-secondary);">|</div>' +
            '<div style="font-size:0.85rem;color:var(--color-text-secondary);">' + stats.total + ' unique questions tracked</div>' +
            (stats.due > 0 ? '<button id="startSrsReviewBtn" class="btn btn-primary btn-small" style="margin-left:auto;">Start Review Session</button>' : '') +
        '</div>';

    if (stats.due === 0) {
        html +=
            '<div class="analytics-empty-state">' +
                '<div style="font-size:2.5rem;line-height:1;margin-bottom:0.5rem;">✅</div>' +
                '<div class="aems-title">All caught up!</div>' +
                '<div class="aems-desc">No questions are due for review right now. Take a practice session or mock exam to add new questions to your queue.</div>' +
            '</div>';
    } else {
        html += '<div style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:0.5rem;">Sample of due questions:</div>';
        html += '<div style="display:grid;gap:0.5rem;">';
        due.slice(0, 5).forEach(function (q) {
            html +=
                '<div style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.9rem;font-size:0.88rem;">' +
                    '<span style="color:var(--color-text-secondary);font-size:0.78rem;">[' + escapeHtmlNotif(q.subject || 'Mixed') + ']</span> ' +
                    escapeHtmlNotif(q.question.substring(0, 120)) + (q.question.length > 120 ? '…' : '') +
                '</div>';
        });
        html += '</div>';
        if (due.length > 5) html += '<div style="font-size:0.82rem;color:var(--color-text-secondary);margin-top:0.5rem;">…and ' + (due.length - 5) + ' more.</div>';
    }
    container.innerHTML = html;

    var startBtn = document.getElementById('startSrsReviewBtn');
    if (startBtn) {
        startBtn.addEventListener('click', async function () {
            this.disabled = true;
            this.textContent = 'Loading…';
            var res = await apiRequest('study_srs_due', { limit: 20 }, 'GET');
            if (res.status !== 'success' || !res.questions || res.questions.length === 0) {
                alert('No questions due for review right now.');
                this.disabled = false;
                this.textContent = 'Start Review Session';
                return;
            }
            studySession.mode = 'srs';
            studySession.subject = 'SRS Review';
            studySession.questions = res.questions;
            studySession.currentIndex = 0;
            studySession.answers = {};
            studySession.hintsRevealed = {};
            studySession.startTime = Date.now();
            enterStudyInterface();
        });
    }
}

// =========================================================================
// SUBJECT MASTERY — radar chart
// =========================================================================
async function loadSubjectMastery() {
    var container = document.getElementById('studentMasteryContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading mastery data…</div>';

    var [masteryRes, historyRes] = await Promise.all([
        apiRequest('study_subject_mastery', {}, 'GET'),
        apiRequest('study_performance_history', { limit: 10 }, 'GET')
    ]);
    if (masteryRes.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load mastery data.</div>';
        return;
    }

    var mastery = masteryRes.mastery || [];
    var html =
        '<div style="margin-bottom:1rem;padding:0.85rem 1rem;background:rgba(87,120,90,0.08);border:1px solid rgba(87,120,90,0.18);border-radius:0.6rem;">' +
            '<b>Subject Mastery:</b> Each axis shows your average accuracy in that subject. <span style="color:var(--color-success);">Green ≥ 70%</span>, <span style="color:#f59e0b;">Yellow 50-69%</span>, <span style="color:var(--color-danger);">Red &lt; 50%</span>. Take more practice sessions to grow your radar.' +
        '</div>';

    // Radar chart (SVG)
    if (mastery.length === 0) {
        html += '<div class="analytics-empty-state"><div class="aems-title">No data yet</div><div class="aems-desc">Take a practice session first.</div></div>';
    } else {
        html += '<div style="display:flex;justify-content:center;margin:1.5rem 0;">' + renderRadarChart(mastery) + '</div>';
        // Table of subjects
        html += '<h3 style="margin:1.5rem 0 0.6rem;font-size:1.1rem;font-weight:700;">Subject Breakdown</h3>';
        html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.92rem;">';
        html += '<thead><tr style="background:var(--glass-bg);"><th style="text-align:left;padding:0.6rem 0.9rem;border-bottom:2px solid var(--color-border);">Subject</th>' +
                '<th style="text-align:center;padding:0.6rem 0.9rem;border-bottom:2px solid var(--color-border);">Mastery</th>' +
                '<th style="text-align:center;padding:0.6rem 0.9rem;border-bottom:2px solid var(--color-border);">Attempts</th>' +
                '<th style="text-align:center;padding:0.6rem 0.9rem;border-bottom:2px solid var(--color-border);">Last practiced</th>' +
                '<th style="text-align:right;padding:0.6rem 0.9rem;border-bottom:2px solid var(--color-border);">Action</th></tr></thead><tbody>';
        mastery.forEach(function (m) {
            var color = m.score >= 70 ? 'var(--color-success)' : (m.score >= 50 ? '#f59e0b' : 'var(--color-danger)');
            var last  = m.lastPracticedAt ? new Date(m.lastPracticedAt).toLocaleDateString() : '—';
            html += '<tr style="background:var(--glass-bg);">' +
                '<td style="padding:0.55rem 0.9rem;border-bottom:1px solid var(--color-border);font-weight:600;">' + escapeHtmlNotif(m.subject) + '</td>' +
                '<td style="padding:0.55rem 0.9rem;border-bottom:1px solid var(--color-border);text-align:center;font-weight:700;color:' + color + ';">' + m.score + '%</td>' +
                '<td style="padding:0.55rem 0.9rem;border-bottom:1px solid var(--color-border);text-align:center;">' + m.attempts + '</td>' +
                '<td style="padding:0.55rem 0.9rem;border-bottom:1px solid var(--color-border);text-align:center;color:var(--color-text-secondary);font-size:0.82rem;">' + last + '</td>' +
                '<td style="padding:0.55rem 0.9rem;border-bottom:1px solid var(--color-border);text-align:right;">' +
                    '<button class="btn btn-primary btn-small" data-subj-practice="' + escapeHtmlNotif(m.subject) + '" data-limit="10">Practice</button>' +
                '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
    }

    // Performance over time chart
    if (historyRes.status === 'success' && historyRes.series) {
        html += '<h3 style="margin:1.75rem 0 0.6rem;font-size:1.1rem;font-weight:700;">Performance Over Time (last 10 attempts)</h3>';
        html += '<div style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;">' + renderLineChart(historyRes.series) + '</div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('[data-subj-practice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            startSubjectPractice(this.getAttribute('data-subj-practice'), parseInt(this.getAttribute('data-limit') || '10', 10));
        });
    });
}

// SVG radar chart — pure inline SVG, no external libs
function renderRadarChart(mastery) {
    var size = 360, cx = size/2, cy = size/2, R = 130;
    var n = mastery.length;
    if (n < 3) {
        return '<div style="padding:1rem;color:var(--color-text-secondary);">Need at least 3 subjects to draw a radar chart. You have ' + n + '.</div>';
    }
    var angles = [];
    for (var i = 0; i < n; i++) angles.push(-Math.PI/2 + i * 2*Math.PI/n);

    // Grid rings (25%, 50%, 75%, 100%)
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg" style="font-family:inherit;">';
    [0.25, 0.5, 0.75, 1.0].forEach(function (frac) {
        var pts = angles.map(function (a) { return (cx + R*frac*Math.cos(a)) + ',' + (cy + R*frac*Math.sin(a)); }).join(' ');
        svg += '<polygon points="' + pts + '" fill="none" stroke="rgba(120,120,120,0.25)" stroke-width="1"/>';
    });
    // Spokes + labels
    angles.forEach(function (a, i) {
        var x = cx + R*Math.cos(a), y = cy + R*Math.sin(a);
        svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="rgba(120,120,120,0.2)" stroke-width="1"/>';
        // Label
        var lx = cx + (R + 25) * Math.cos(a), ly = cy + (R + 18) * Math.sin(a);
        var subj = mastery[i].subject;
        if (subj.length > 18) subj = subj.substring(0, 16) + '…';
        svg += '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="10" fill="var(--color-text-secondary)">' + escapeHtmlNotif(subj) + '</text>';
        // Score below label
        var color = mastery[i].score >= 70 ? '#6e9a72' : (mastery[i].score >= 50 ? '#f59e0b' : '#e07a5f');
        svg += '<text x="' + lx + '" y="' + (ly + 12) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + color + '">' + mastery[i].score + '%</text>';
    });
    // Data polygon
    var dataPts = angles.map(function (a, i) {
        var v = Math.max(0, Math.min(1, mastery[i].score / 100));
        return (cx + R*v*Math.cos(a)) + ',' + (cy + R*v*Math.sin(a));
    }).join(' ');
    svg += '<polygon points="' + dataPts + '" fill="rgba(87,120,90,0.35)" stroke="#57785a" stroke-width="2"/>';
    // Data points
    angles.forEach(function (a, i) {
        var v = Math.max(0, Math.min(1, mastery[i].score / 100));
        var x = cx + R*v*Math.cos(a), y = cy + R*v*Math.sin(a);
        svg += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#57785a"/>';
    });
    svg += '</svg>';
    return svg;
}

// SVG line chart for performance over time
function renderLineChart(series) {
    var W = 720, H = 260, padL = 50, padR = 20, padT = 30, padB = 60;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var subjects = Object.keys(series);
    if (subjects.length === 0) return '<div style="padding:1rem;color:var(--color-text-secondary);">No attempts recorded yet.</div>';

    // Flatten all points to compute time range
    var allPoints = [];
    subjects.forEach(function (s) { series[s].forEach(function (p) { allPoints.push({ s: s, x: new Date(p.x).getTime(), y: p.y, isExam: !!p.isExam }); }); });
    allPoints.sort(function (a, b) { return a.x - b.x; });
    if (allPoints.length === 0) return '<div style="padding:1rem;color:var(--color-text-secondary);">No attempts recorded yet.</div>';
    if (allPoints.length === 1) {
        // pad with phantom points so the chart can render
        allPoints.unshift({ s: '', x: allPoints[0].x - 86400000, y: 0, isExam: false });
    }

    var tMin = allPoints[0].x, tMax = allPoints[allPoints.length-1].x;
    if (tMax === tMin) tMax = tMin + 1;
    var colors = ['#57785a', '#a3cc3b', '#e07a5f', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899'];

    var svg = '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="font-family:inherit;max-width:100%;">';
    // Y-axis grid (0,25,50,75,100)
    [0, 25, 50, 75, 100].forEach(function (v) {
        var y = padT + plotH - (v/100) * plotH;
        svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(120,120,120,0.18)" stroke-width="1"/>';
        svg += '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="10" fill="var(--color-text-secondary)">' + v + '%</text>';
    });
    // Pass mark line at 60
    var passY = padT + plotH - 0.6 * plotH;
    svg += '<line x1="' + padL + '" y1="' + passY + '" x2="' + (W - padR) + '" y2="' + passY + '" stroke="#e07a5f" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>';
    svg += '<text x="' + (W - padR) + '" y="' + (passY - 4) + '" text-anchor="end" font-size="9" fill="#e07a5f">Pass (60%)</text>';

    // X-axis ticks (date labels)
    var xTicks = 5;
    for (var i = 0; i <= xTicks; i++) {
        var t = tMin + (tMax - tMin) * i / xTicks;
        var x = padL + plotW * i / xTicks;
        var lbl = new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        svg += '<text x="' + x + '" y="' + (H - padB + 14) + '" text-anchor="middle" font-size="9" fill="var(--color-text-secondary)">' + lbl + '</text>';
    }

    // Plot each subject's line
    subjects.forEach(function (subj, idx) {
        var pts = series[subj].slice().sort(function (a, b) { return new Date(a.x) - new Date(b.x); });
        if (pts.length === 0) return;
        var color = colors[idx % colors.length];
        var path = '';
        pts.forEach(function (p, i) {
            var x = padL + ((new Date(p.x).getTime() - tMin) / (tMax - tMin)) * plotW;
            var y = padT + plotH - (p.y/100) * plotH;
            path += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
            // Marker
            var marker = p.isExam ? 'rect' : 'circle';
            if (marker === 'circle') {
                svg += '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="' + color + '"/>';
            } else {
                svg += '<rect x="' + (x-3.5) + '" y="' + (y-3.5) + '" width="7" height="7" fill="' + color + '"/>';
            }
        });
        svg += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
    });

    // Legend
    var lx = padL;
    subjects.forEach(function (subj, idx) {
        var color = colors[idx % colors.length];
        svg += '<rect x="' + lx + '" y="6" width="10" height="10" fill="' + color + '"/>';
        svg += '<text x="' + (lx + 14) + '" y="15" font-size="10" fill="var(--color-text-secondary)">' + escapeHtmlNotif(subj.length > 20 ? subj.substring(0, 18) + '…' : subj) + '</text>';
        lx += 14 + subj.length * 5.5 + 18;
        if (lx > W - 80) { lx = padL; }
    });

    svg += '</svg>';
    return svg;
}

// =========================================================================
// WEAKNESS REPORT
// =========================================================================
async function loadWeaknessReport() {
    var container = document.getElementById('studentWeaknessContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Analyzing your performance…</div>';

    var res = await apiRequest('study_weakness_report', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load report.</div>';
        return;
    }

    var weak = res.weakSubjects || [];
    var recs = res.recommendations || {};
    var resources = res.resources || [];

    var html = '<div style="margin-bottom:1.25rem;padding:0.85rem 1rem;background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:0.6rem;">' +
            '<b>Weakness Diagnosis:</b> These are the subjects where your average is below 70%. Review the recommended questions, then take a focused practice session to bring your mastery up.' +
        '</div>';

    if (weak.length === 0) {
        html += '<div class="analytics-empty-state"><div style="font-size:2.5rem;line-height:1;margin-bottom:0.5rem;">🎉</div><div class="aems-title">No weak subjects detected!</div><div class="aems-desc">Either you haven\'t practiced enough subjects yet, or you\'re scoring 70%+ across the board. Keep it up!</div></div>';
    } else {
        html += '<div style="display:grid;gap:1rem;">';
        weak.forEach(function (w) {
            var color = w.score >= 50 ? '#f59e0b' : 'var(--color-danger)';
            html +=
                '<div style="background:var(--glass-bg);border:1px solid var(--color-border);border-left:4px solid ' + color + ';border-radius:0.6rem;padding:1rem 1.2rem;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.6rem;margin-bottom:0.5rem;">' +
                        '<div>' +
                            '<div style="font-size:1.05rem;font-weight:700;color:var(--color-text);">' + escapeHtmlNotif(w.subject) + '</div>' +
                            '<div style="font-size:0.82rem;color:var(--color-text-secondary);">' + w.attempts + ' attempts · ' + w.total + ' questions practiced</div>' +
                        '</div>' +
                        '<div style="text-align:right;">' +
                            '<div style="font-size:1.6rem;font-weight:800;color:' + color + ';">' + w.score + '%</div>' +
                            '<div style="font-size:0.72rem;color:var(--color-text-secondary);">avg score</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;">' +
                        '<button class="btn btn-primary btn-small" data-subj-practice="' + escapeHtmlNotif(w.subject) + '" data-limit="10">Practice 10 Qs</button>' +
                        '<button class="btn btn-secondary btn-small" data-subj-practice="' + escapeHtmlNotif(w.subject) + '" data-limit="25">Practice 25 Qs</button>' +
                    '</div>';
            var recList = recs[w.subject] || [];
            if (recList.length > 0) {
                html += '<div style="margin-top:0.85rem;font-size:0.82rem;color:var(--color-text-secondary);">Questions you keep getting wrong:</div>';
                html += '<div style="margin-top:0.3rem;">';
                recList.forEach(function (rq) {
                    html += '<div style="font-size:0.85rem;padding:0.3rem 0;background:var(--glass-bg);border-bottom:1px dashed var(--color-border);">' +
                        '<span style="color:var(--color-danger);font-weight:700;margin-right:0.4rem;">×' + rq.wrongCount + '</span>' +
                        escapeHtmlNotif(rq.question) + '</div>';
                });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    if (resources.length > 0) {
        html += '<h3 style="margin:1.75rem 0 0.6rem;font-size:1.1rem;font-weight:700;">📚 Recommended Study Resources</h3>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.85rem;">';
        resources.forEach(function (r) {
            var typeIcon = { link: '🔗', video: '🎬', pdf: '📄', slides: '📊' }[r.type] || '🔗';
            html += '<a href="' + escapeHtmlNotif(r.url) + '" target="_blank" rel="noopener" style="display:block;text-decoration:none;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:0.85rem 1rem;color:inherit;">' +
                '<div style="font-size:0.78rem;color:var(--color-text-secondary);margin-bottom:0.2rem;">' + typeIcon + ' ' + escapeHtmlNotif(r.subject) + '</div>' +
                '<div style="font-weight:700;color:var(--color-primary);font-size:0.95rem;margin-bottom:0.2rem;">' + escapeHtmlNotif(r.title) + '</div>' +
                (r.description ? '<div style="font-size:0.82rem;color:var(--color-text-secondary);">' + escapeHtmlNotif(r.description) + '</div>' : '') +
            '</a>';
        });
        html += '</div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-subj-practice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            startSubjectPractice(this.getAttribute('data-subj-practice'), parseInt(this.getAttribute('data-limit') || '10', 10));
        });
    });
}

// =========================================================================
// STUDY RESOURCES — student view
// =========================================================================
async function loadStudyResourcesStudent() {
    var container = document.getElementById('studentResourcesContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading resources…</div>';

    var res = await apiRequest('study_list_resources', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load resources.</div>';
        return;
    }
    var grouped = res.resources || {};
    var subjects = res.subjects || [];
    if (subjects.length === 0) {
        container.innerHTML =
            '<div class="analytics-empty-state">' +
                '<div style="font-size:2.5rem;line-height:1;margin-bottom:0.5rem;">📚</div>' +
                '<div class="aems-title">No study resources yet</div>' +
                '<div class="aems-desc">Your teacher hasn\'t added any study resources. Ask them to add textbook chapters, video lectures, or notes for the subjects you\'re studying.</div>' +
            '</div>';
        return;
    }

    var categories = res.categories || {};

    var html = '<div style="margin-bottom:1.25rem;padding:0.85rem 1rem;background:rgba(87,120,90,0.08);border:1px solid rgba(87,120,90,0.18);border-radius:0.6rem;">' +
            '<b>Study Resource Library:</b> Curated textbook chapters, video lectures, slides, and notes — organized by subject. Click any card to preview PDFs and images inline, or open external links in a new tab.' +
        '</div>';

    // Category filter
    var catKeys = Object.keys(categories);
    if (catKeys.length > 0) {
        html += '<div style="margin-bottom:1rem;display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">' +
            '<span style="font-size:0.82rem;color:var(--color-text-secondary);">Filter by category:</span>' +
            '<button class="btn btn-secondary btn-small student-res-cat-btn active" data-cat="" style="padding:0.25rem 0.6rem;">All</button>';
        catKeys.forEach(function (c) {
            html += '<button class="btn btn-secondary btn-small student-res-cat-btn" data-cat="' + escapeHtmlNotif(c) + '" style="padding:0.25rem 0.6rem;">' + escapeHtmlNotif(c) + ' (' + categories[c] + ')</button>';
        });
        html += '</div>';
    }

    subjects.forEach(function (subj) {
        var items = grouped[subj] || [];
        if (items.length === 0) return;
        html += '<h3 style="margin:1.5rem 0 0.6rem;font-size:1.1rem;font-weight:700;color:var(--color-text);">' + escapeHtmlNotif(subj) + '</h3>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.85rem;">';
        items.forEach(function (r) {
            var typeIcon = { link: '🔗', video: '🎬', pdf: '📄', slides: '📊', doc: '📝', image: '🖼️', archive: '🗜️', other: '📎' }[r.type] || '🔗';
            var catBadge = r.category ? '<span style="font-size:0.66rem;background:rgba(87,120,90,0.12);color:var(--color-primary);padding:0.1rem 0.4rem;border-radius:0.25rem;margin-left:0.4rem;">' + escapeHtmlNotif(r.category) + '</span>' : '';
            var sizeInfo = r.fileSize ? ' · ' + Math.round(r.fileSize/1024) + ' KB' : '';
            html += '<div class="student-res-card" data-cat="' + escapeHtmlNotif(r.category || '') + '" data-res-id="' + r.id + '" style="cursor:pointer;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:0.85rem 1rem;color:inherit;transition:transform 0.15s;">' +
                '<div style="font-size:0.78rem;color:var(--color-text-secondary);margin-bottom:0.2rem;">' + typeIcon + ' ' + r.type.toUpperCase() + sizeInfo + catBadge + '</div>' +
                '<div style="font-weight:700;color:var(--color-primary);font-size:0.95rem;margin-bottom:0.2rem;">' + escapeHtmlNotif(r.title) + '</div>' +
                (r.description ? '<div style="font-size:0.82rem;color:var(--color-text-secondary);line-height:1.4;">' + escapeHtmlNotif(r.description) + '</div>' : '') +
            '</div>';
        });
        html += '</div>';
    });
    container.innerHTML = html;

    // Wire up click on cards → open viewer modal
    container.querySelectorAll('.student-res-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var id = parseInt(this.getAttribute('data-res-id'), 10);
            openResourceViewer(id);
        });
        card.addEventListener('mouseenter', function () { this.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseleave', function () { this.style.transform = ''; });
    });

    // Category filter buttons
    container.querySelectorAll('.student-res-cat-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var cat = this.getAttribute('data-cat');
            container.querySelectorAll('.student-res-cat-btn').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            container.querySelectorAll('.student-res-card').forEach(function (card) {
                var cardCat = card.getAttribute('data-cat');
                card.style.display = (cat === '' || cardCat === cat) ? '' : 'none';
            });
        });
    });
}

// =========================================================================
// STUDY RESOURCES — teacher view (add / delete)
// =========================================================================
async function loadTeacherResources() {
    var container = document.getElementById('teacherResourcesContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading…</div>';

    var subjectsRes = await apiRequest('study_list_subjects', {}, 'GET');
    var res = await apiRequest('study_list_resources', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load.</div>';
        return;
    }

    var subjects = (subjectsRes.subjects || []).map(function (s) { return s.subject; });
    var grouped = res.resources || {};
    var categories = res.categories || {};
    var hasFileSupport = res.hasFile === true;

    var html =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.6rem;">' +
            '<h3 style="font-size:1.15rem;font-weight:700;margin:0;">Study Resources Library</h3>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
                '<select id="resCategoryFilter" class="form-input form-select" style="font-size:0.85rem;padding:0.35rem 0.6rem;">' +
                    '<option value="">All categories</option>' +
                    Object.keys(categories).map(function (c) { return '<option value="' + escapeHtmlNotif(c) + '">' + escapeHtmlNotif(c) + ' (' + categories[c] + ')</option>'; }).join('') +
                '</select>' +
                '<button id="addResourceBtn" class="btn btn-primary btn-small">+ Add Resource</button>' +
            '</div>' +
        '</div>' +
        '<div id="addResourceForm" style="display:none;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;margin-bottom:1.25rem;">' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.6rem;">' +
                '<input type="text" id="resSubject" class="form-input" placeholder="Subject (e.g. Database)" list="resSubjectList" required>' +
                '<input type="text" id="resTitle" class="form-input" placeholder="Title (e.g. ER Diagrams lecture)" required>' +
                '<input type="text" id="resCategory" class="form-input" placeholder="Category (e.g. Lecture, Lab, Past Paper)" list="resCategoryList">' +
                '<select id="resType" class="form-input form-select">' +
                    '<option value="link">Link</option>' +
                    '<option value="video">Video</option>' +
                    (hasFileSupport ? '<option value="pdf">PDF (upload)</option>' : '') +
                    (hasFileSupport ? '<option value="slides">Slides (upload)</option>' : '') +
                    (hasFileSupport ? '<option value="doc">Document (upload)</option>' : '') +
                    (hasFileSupport ? '<option value="image">Image (upload)</option>' : '') +
                    (hasFileSupport ? '<option value="archive">Archive (upload)</option>' : '') +
                '</select>' +
            '</div>' +
            '<datalist id="resSubjectList">' + subjects.map(function (s) { return '<option value="' + escapeHtmlNotif(s) + '">'; }).join('') + '</datalist>' +
            '<datalist id="resCategoryList"><option value="Lecture"><option value="Lab"><option value="Past Paper"><option value="Reference"><option value="Video"><option value="Slides"><option value="Notes"></datalist>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-top:0.6rem;">' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.2rem;">External URL (optional if uploading a file)</label>' +
                    '<input type="url" id="resUrl" class="form-input" placeholder="https://…">' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.2rem;">Upload file (max 25 MB)</label>' +
                    '<input type="file" id="resFile" class="form-input" style="padding:0.35rem;">' +
                '</div>' +
            '</div>' +
            '<textarea id="resDesc" class="form-input" placeholder="Optional description (max 300 chars)" maxlength="300" rows="2" style="margin-top:0.6rem;resize:vertical;"></textarea>' +
            '<div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:0.4rem;">💡 Either upload a file OR provide a URL. If both are given, the file takes precedence. PDFs and images will be viewable inline by students.</div>' +
            '<div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.6rem;">' +
                '<button id="cancelAddResource" class="btn btn-secondary btn-small">Cancel</button>' +
                '<button id="saveResourceBtn" class="btn btn-primary btn-small">Save Resource</button>' +
            '</div>' +
        '</div>';

    var subjKeys = Object.keys(grouped);
    if (subjKeys.length === 0) {
        html += '<div class="analytics-empty-state"><div class="aems-title">No resources yet</div><div class="aems-desc">Add your first resource using the button above.</div></div>';
    } else {
        subjKeys.forEach(function (subj) {
            var items = grouped[subj];
            html += '<h4 style="margin:1rem 0 0.4rem;font-size:1rem;font-weight:700;color:var(--color-text);">' + escapeHtmlNotif(subj) + '</h4>';
            html += '<div style="display:grid;gap:0.4rem;" data-subj-group="' + escapeHtmlNotif(subj) + '">';
            items.forEach(function (r) {
                var typeIcon = { link: '🔗', video: '🎬', pdf: '📄', slides: '📊', doc: '📝', image: '🖼️', archive: '🗜️', other: '📎' }[r.type] || '🔗';
                var catBadge = r.category ? '<span style="font-size:0.66rem;background:rgba(87,120,90,0.12);color:var(--color-primary);padding:0.1rem 0.4rem;border-radius:0.25rem;margin-left:0.4rem;">' + escapeHtmlNotif(r.category) + '</span>' : '';
                var sizeInfo = r.fileSize ? ' · ' + Math.round(r.fileSize/1024) + ' KB' : '';
                var isUploadedFile = r.filePath || (r.url && r.url.indexOf('study_serve_file') !== -1);
                html += '<div data-resource-row data-cat="' + escapeHtmlNotif(r.category || '') + '" style="display:flex;align-items:center;gap:0.6rem;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.5rem;padding:0.6rem 0.9rem;">' +
                    '<span style="font-size:1.4rem;">' + typeIcon + '</span>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-weight:600;font-size:0.92rem;color:var(--color-text);">' + escapeHtmlNotif(r.title) + catBadge + '</div>' +
                        '<div style="font-size:0.74rem;color:var(--color-text-secondary);">' + escapeHtmlNotif(r.type.toUpperCase()) + sizeInfo + (isUploadedFile ? ' · uploaded' : ' · external link') + '</div>' +
                    '</div>' +
                    '<button class="btn btn-secondary btn-small" data-view-resource="' + r.id + '" title="Preview">View</button>' +
                    '<button class="btn btn-danger btn-small" data-del-resource="' + r.id + '">Delete</button>' +
                '</div>';
            });
            html += '</div>';
        });
    }
    container.innerHTML = html;

    var addBtn = document.getElementById('addResourceBtn');
    var formDiv = document.getElementById('addResourceForm');
    addBtn.addEventListener('click', function () { formDiv.style.display = formDiv.style.display === 'none' ? 'block' : 'none'; });
    document.getElementById('cancelAddResource').addEventListener('click', function () { formDiv.style.display = 'none'; });

    // Category filter
    var filter = document.getElementById('resCategoryFilter');
    if (filter) {
        filter.addEventListener('change', function () {
            var v = this.value;
            container.querySelectorAll('[data-resource-row]').forEach(function (row) {
                var cat = row.getAttribute('data-cat');
                row.style.display = (v === '' || cat === v) ? '' : 'none';
            });
        });
    }

    document.getElementById('saveResourceBtn').addEventListener('click', async function () {
        var subject = document.getElementById('resSubject').value.trim();
        var title   = document.getElementById('resTitle').value.trim();
        var url     = document.getElementById('resUrl').value.trim();
        var type    = document.getElementById('resType').value;
        var cat     = document.getElementById('resCategory').value.trim();
        var desc    = document.getElementById('resDesc').value.trim();
        var fileInput = document.getElementById('resFile');
        var hasFile = fileInput && fileInput.files.length > 0;
        if (!subject || !title) { alert('Subject and title are required.'); return; }
        if (!hasFile && !url) { alert('Either upload a file or provide a URL.'); return; }

        this.disabled = true; this.textContent = 'Saving…';
        try {
            var fd = new FormData();
            fd.append('action', 'study_add_resource');
            fd.append('subject', subject);
            fd.append('title', title);
            fd.append('url', url);
            fd.append('type', type);
            fd.append('category', cat);
            fd.append('description', desc);
            if (hasFile) fd.append('file', fileInput.files[0]);

            var resp = await fetch('api.php', { method: 'POST', body: fd });
            var data = await resp.json();
            if (data.status === 'success') {
                showToast('Resource added.', 'success');
                loadTeacherResources();
            } else {
                alert(data.message || 'Failed to add resource.');
                this.disabled = false; this.textContent = 'Save Resource';
            }
        } catch (err) {
            alert('Network error: ' + err.message);
            this.disabled = false; this.textContent = 'Save Resource';
        }
    });

    container.querySelectorAll('[data-del-resource]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            if (!confirm('Delete this resource?' + (this.parentNode.querySelector('[data-view-resource]') ? ' The uploaded file will also be removed from disk.' : ''))) return;
            var id = parseInt(this.getAttribute('data-del-resource'), 10);
            var r = await apiRequest('study_delete_resource', { id: id });
            if (r.status === 'success') loadTeacherResources();
            else alert(r.message || 'Failed to delete.');
        });
    });

    container.querySelectorAll('[data-view-resource]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var id = parseInt(this.getAttribute('data-view-resource'), 10);
            // Find the resource URL
            var row = this.closest('[data-resource-row]');
            // We need to look up URL — easier: open the student-side viewer modal
            openResourceViewer(id);
        });
    });
}

// Resource viewer modal (used by both teacher & student side)
async function openResourceViewer(resourceId) {
    var modal = document.getElementById('resourceViewerModal');
    if (!modal) {
        // Create dynamically
        modal = document.createElement('div');
        modal.id = 'resourceViewerModal';
        modal.className = 'modal';
        modal.style.cssText = 'z-index:14000;';
        modal.innerHTML =
            '<div class="modal-content" style="max-width:960px;width:96vw;max-height:90vh;display:flex;flex-direction:column;">' +
                '<div class="modal-header"><h3 id="rvTitle">Loading…</h3><button id="rvClose" class="close-btn">&times;</button></div>' +
                '<div id="rvBody" style="flex:1;overflow:auto;padding:1rem;">Loading…</div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.add('hidden'); });
        document.getElementById('rvClose').addEventListener('click', function () { modal.classList.add('hidden'); });
    }
    var titleEl = document.getElementById('rvTitle');
    var body = document.getElementById('rvBody');
    body.innerHTML = 'Loading…';
    modal.classList.remove('hidden');

    // Fetch all resources and find by id
    var res = await apiRequest('study_list_resources', {}, 'GET');
    if (res.status !== 'success') { body.innerHTML = '<div style="color:var(--color-danger);">Failed to load.</div>'; return; }
    var found = null;
    Object.values(res.resources).forEach(function (arr) { arr.forEach(function (r) { if (r.id == resourceId) found = r; }); });
    if (!found) { body.innerHTML = '<div style="color:var(--color-danger);">Resource not found.</div>'; return; }
    titleEl.textContent = found.title + ' (' + (found.subject || '') + ')';

    var url = found.url;
    var isPdf = found.type === 'pdf' || (found.mimeType && found.mimeType.indexOf('pdf') !== -1);
    var isImage = found.type === 'image' || (found.mimeType && found.mimeType.indexOf('image/') === 0);
    var isVideo = found.type === 'video' || (found.mimeType && found.mimeType.indexOf('video/') === 0);

    if (isPdf) {
        body.innerHTML =
            '<div style="text-align:center;margin-bottom:0.6rem;">' +
                '<a href="' + escapeHtmlNotif(url) + '" target="_blank" rel="noopener" class="btn btn-secondary btn-small">Open in new tab ↗</a>' +
            '</div>' +
            '<iframe src="' + escapeHtmlNotif(url) + '" style="width:100%;height:75vh;border:1px solid var(--color-border);border-radius:0.5rem;" title="PDF preview"></iframe>';
    } else if (isImage) {
        body.innerHTML =
            '<div style="text-align:center;">' +
                '<img src="' + escapeHtmlNotif(url) + '" alt="' + escapeHtmlNotif(found.title) + '" style="max-width:100%;max-height:75vh;border-radius:0.5rem;">' +
                '<div style="margin-top:0.5rem;"><a href="' + escapeHtmlNotif(url) + '" target="_blank" rel="noopener" class="btn btn-secondary btn-small">Open in new tab ↗</a></div>' +
            '</div>';
    } else if (isVideo) {
        body.innerHTML = '<video src="' + escapeHtmlNotif(url) + '" controls style="width:100%;max-height:75vh;border-radius:0.5rem;"></video>';
    } else if (found.type === 'link') {
        // External link — open in new tab; we can't iframe arbitrary sites due to X-Frame-Options
        body.innerHTML =
            '<div style="text-align:center;padding:2rem;">' +
                '<p style="margin-bottom:1rem;">This is an external link. Click below to open in a new tab.</p>' +
                '<a href="' + escapeHtmlNotif(url) + '" target="_blank" rel="noopener" class="btn btn-primary">Open link ↗</a>' +
            '</div>';
    } else {
        // Downloadable file (doc, slides, archive)
        body.innerHTML =
            '<div style="text-align:center;padding:2rem;">' +
                '<div style="font-size:3rem;margin-bottom:0.6rem;">📎</div>' +
                '<p style="margin-bottom:1rem;">This file type can\'t be previewed inline. Click below to download.</p>' +
                '<a href="' + escapeHtmlNotif(url) + '" target="_blank" rel="noopener" class="btn btn-primary">Download file ↗</a>' +
            '</div>';
    }
}

// =========================================================================
// STUDY SCHEDULE PLANNER
// =========================================================================
var scheduleCurrentMonth = new Date();
scheduleCurrentMonth.setDate(1);

async function loadStudySchedule() {
    var container = document.getElementById('studentScheduleContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading…</div>';

    var subjectsRes = await apiRequest('study_list_subjects', {}, 'GET');
    var subjects = (subjectsRes.subjects || []).map(function (s) { return s.subject; });
    renderScheduleCalendar(container, subjects);
}

function renderScheduleCalendar(container, subjects) {
    window.scheduleCalendarContainer = container;
    var year = scheduleCurrentMonth.getFullYear();
    var month = scheduleCurrentMonth.getMonth(); // 0-11
    var monthStr = year + '-' + String(month + 1).padStart(2, '0');
    var monthName = scheduleCurrentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    var html =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
            '<button id="prevMonthBtn" class="btn btn-secondary btn-small">← Prev</button>' +
            '<h3 style="font-size:1.15rem;font-weight:700;margin:0;">' + monthName + '</h3>' +
            '<button id="nextMonthBtn" class="btn btn-secondary btn-small">Next →</button>' +
        '</div>' +
        '<div style="margin-bottom:1rem;">' +
            '<button id="addSlotBtn" class="btn btn-primary btn-small">+ Add Study Slot</button>' +
        '</div>' +
        '<div id="addSlotForm" style="display:none;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem;margin-bottom:1.25rem;">' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.6rem;">' +
                '<input type="date" id="slotDate" class="form-input" required>' +
                '<input type="text" id="slotSubject" class="form-input" placeholder="Subject" list="slotSubjectList" required>' +
                '<input type="text" id="slotTopic" class="form-input" placeholder="Topic (optional)">' +
                '<input type="number" id="slotDuration" class="form-input" placeholder="Min" value="60" min="5" max="480">' +
            '</div>' +
            '<textarea id="slotNotes" class="form-input" placeholder="Notes (optional)" rows="2" style="margin-top:0.6rem;resize:vertical;"></textarea>' +
            '<datalist id="slotSubjectList">' + subjects.map(function (s) { return '<option value="' + escapeHtmlNotif(s) + '">'; }).join('') + '</datalist>' +
            '<div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.6rem;">' +
                '<button id="cancelAddSlot" class="btn btn-secondary btn-small">Cancel</button>' +
                '<button id="saveSlotBtn" class="btn btn-primary btn-small">Add Slot</button>' +
            '</div>' +
        '</div>' +
        '<div id="scheduleCalendar" style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:0.85rem;">Loading…</div>';

    container.innerHTML = html;

    document.getElementById('prevMonthBtn').addEventListener('click', function () {
        scheduleCurrentMonth.setMonth(scheduleCurrentMonth.getMonth() - 1);
        renderScheduleCalendar(container, subjects);
    });
    document.getElementById('nextMonthBtn').addEventListener('click', function () {
        scheduleCurrentMonth.setMonth(scheduleCurrentMonth.getMonth() + 1);
        renderScheduleCalendar(container, subjects);
    });
    document.getElementById('addSlotBtn').addEventListener('click', function () {
        var f = document.getElementById('addSlotForm');
        f.style.display = f.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('cancelAddSlot').addEventListener('click', function () { document.getElementById('addSlotForm').style.display = 'none'; });
    document.getElementById('saveSlotBtn').addEventListener('click', async function () {
        var data = {
            date:        document.getElementById('slotDate').value,
            subject:     document.getElementById('slotSubject').value.trim(),
            topic:       document.getElementById('slotTopic').value.trim(),
            durationMin: parseInt(document.getElementById('slotDuration').value || '60', 10),
            notes:       document.getElementById('slotNotes').value.trim()
        };
        if (!data.date || !data.subject) { alert('Date and subject are required.'); return; }
        this.disabled = true; this.textContent = 'Adding…';
        var r = await apiRequest('study_schedule_add', data);
        if (r.status === 'success') {
            showToast('Study slot added.', 'success');
            renderScheduleCalendar(container, subjects);
        } else {
            alert(r.message || 'Failed to add slot.');
            this.disabled = false; this.textContent = 'Add Slot';
        }
    });

    // Now fetch the month's slots
    fetchAndRenderMonth(monthStr, subjects);
}

async function fetchAndRenderMonth(monthStr, subjects) {
    var cal = document.getElementById('scheduleCalendar');
    if (!cal) return;
    cal.innerHTML = 'Loading…';
    var res = await apiRequest('study_schedule_get', { month: monthStr }, 'GET');
    if (res.status !== 'success') {
        cal.innerHTML = '<div style="padding:1rem;color:var(--color-danger);">Failed to load schedule.</div>';
        return;
    }
    var slots = res.schedule || [];
    window.currentMonthScheduleSlots = slots;
    // Group by date
    var byDate = {};
    slots.forEach(function (s) { (byDate[s.date] = byDate[s.date] || []).push(s); });

    // Build calendar grid
    var today = new Date();
    var firstDay = new Date(scheduleCurrentMonth.getFullYear(), scheduleCurrentMonth.getMonth(), 1);
    var startWeekday = firstDay.getDay(); // 0=Sun
    var daysInMonth = new Date(scheduleCurrentMonth.getFullYear(), scheduleCurrentMonth.getMonth() + 1, 0).getDate();
    var html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0.3rem;">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function (d) {
        html += '<div style="text-align:center;font-size:0.78rem;font-weight:700;color:var(--color-text-secondary);padding:0.3rem;">' + d + '</div>';
    });
    for (var i = 0; i < startWeekday; i++) html += '<div></div>';
    for (var dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        var dateStr = scheduleCurrentMonth.getFullYear() + '-' + String(scheduleCurrentMonth.getMonth() + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
        var daySlots = byDate[dateStr] || [];
        var isToday = (today.getFullYear() === scheduleCurrentMonth.getFullYear() && today.getMonth() === scheduleCurrentMonth.getMonth() && today.getDate() === dayNum);
        var cellStyle = 'min-height:80px;padding:0.35rem;background:' + (isToday ? 'rgba(163,204,59,0.12);' : 'var(--color-bg);') + 'border:1px solid var(--color-border);border-radius:0.35rem;font-size:0.78rem;';
        html += '<div style="' + cellStyle + '"><div style="font-weight:700;color:var(--color-text);margin-bottom:0.2rem;">' + dayNum + '</div>';
        daySlots.forEach(function (s) {
            var subjColor = stringToColor(s.subject);
            var checkIcon = s.isCompleted == 1 ? '✅' : '⬜';
            html += '<div data-slot-id="' + s.id + '" style="background:' + subjColor + '20;border-left:3px solid ' + subjColor + ';border-radius:0.25rem;padding:0.2rem 0.35rem;margin-bottom:0.2rem;cursor:pointer;color:var(--color-text);font-size:0.72rem;line-height:1.25;">' +
                checkIcon + ' <b>' + escapeHtmlNotif(s.subject) + '</b>' +
                (s.topic ? '<br><span style="opacity:0.8;">' + escapeHtmlNotif(s.topic) + '</span>' : '') +
                '<span style="float:right;opacity:0.5;">' + s.durationMin + 'm</span>' +
            '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    cal.innerHTML = html;

    cal.querySelectorAll('[data-slot-id]').forEach(function (el) {
        el.addEventListener('click', function () {
            var id = parseInt(this.getAttribute('data-slot-id'), 10);
            openScheduleSlotModal(id, subjects);
        });
    });
}

function openScheduleSlotModal(slotId, subjects) {
    var modal = document.getElementById('studySlotModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'studySlotModal';
        modal.className = 'modal';
        modal.style.cssText = 'z-index:14000;';
        modal.innerHTML =
            '<div class="modal-content" style="max-width:550px;width:96vw;max-height:90vh;display:flex;flex-direction:column;">' +
                '<div class="modal-header"><h3 id="ssmTitle">Study Slot Details</h3><button id="ssmClose" class="close-btn">&times;</button></div>' +
                '<div id="ssmBody" style="flex:1;overflow:auto;padding:1.25rem;"></div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.add('hidden'); });
        document.getElementById('ssmClose').addEventListener('click', function () { modal.classList.add('hidden'); });
    }
    
    var body = document.getElementById('ssmBody');
    modal.classList.remove('hidden');

    function renderViewMode() {
        var slot = (window.currentMonthScheduleSlots || []).find(function (s) { return s.id == slotId; });
        if (!slot) {
            body.innerHTML = '<div style="color:var(--color-danger);">Slot not found.</div>';
            return;
        }

        var isCompleted = slot.isCompleted == 1;
        var statusBadge = isCompleted 
            ? '<span style="background:rgba(46,204,113,0.15);color:#2ecc71;padding:0.2rem 0.5rem;border-radius:0.25rem;font-weight:700;font-size:0.8rem;">Completed ✅</span>'
            : '<span style="background:rgba(127,140,141,0.15);color:var(--color-text-secondary);padding:0.2rem 0.5rem;border-radius:0.25rem;font-weight:700;font-size:0.8rem;">Pending ⬜</span>';

        body.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:0.9rem;">' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.1rem;">Subject</label>' +
                    '<div style="font-size:1.15rem;font-weight:800;color:var(--color-text);">' + escapeHtmlNotif(slot.subject) + '</div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
                    '<div>' +
                        '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.1rem;">Date</label>' +
                        '<div style="font-weight:600;color:var(--color-text);">' + escapeHtmlNotif(slot.date) + '</div>' +
                    '</div>' +
                    '<div>' +
                        '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.1rem;">Duration</label>' +
                        '<div style="font-weight:600;color:var(--color-text);">' + slot.durationMin + ' minutes</div>' +
                    '</div>' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.1rem;">Topic</label>' +
                    '<div style="font-weight:600;color:var(--color-text);">' + (slot.topic ? escapeHtmlNotif(slot.topic) : '<span style="color:var(--color-text-secondary);font-style:italic;">None</span>') + '</div>' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.1rem;">Status</label>' +
                    '<div style="margin-top:0.2rem;">' + statusBadge + '</div>' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.2rem;">Notes</label>' +
                    '<div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:0.4rem;padding:0.75rem;font-size:0.88rem;color:var(--color-text);white-space:pre-wrap;max-height:150px;overflow-y:auto;line-height:1.45;">' +
                        (slot.notes ? escapeHtmlNotif(slot.notes) : '<span style="color:var(--color-text-secondary);font-style:italic;">No notes added.</span>') +
                    '</div>' +
                '</div>' +
                '<hr style="border:0;border-top:1px solid var(--color-border);margin:0.5rem 0;">' +
                '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;">' +
                    '<button id="ssmToggleBtn" class="btn btn-secondary btn-small">' + (isCompleted ? 'Mark Pending' : 'Mark Completed') + '</button>' +
                    '<button id="ssmEditBtn" class="btn btn-primary btn-small">Edit</button>' +
                    '<button id="ssmDeleteBtn" class="btn btn-danger btn-small">Delete</button>' +
                '</div>' +
            '</div>';

        document.getElementById('ssmToggleBtn').addEventListener('click', async function () {
            this.disabled = true;
            var r = await apiRequest('study_schedule_toggle', { id: slotId });
            if (r.status === 'success') {
                slot.isCompleted = 1 - slot.isCompleted;
                if (window.scheduleCalendarContainer) {
                    renderScheduleCalendar(window.scheduleCalendarContainer, subjects);
                }
                renderViewMode();
            } else {
                alert(r.message || 'Failed to toggle status.');
                this.disabled = false;
            }
        });

        document.getElementById('ssmEditBtn').addEventListener('click', renderEditMode);

        document.getElementById('ssmDeleteBtn').addEventListener('click', async function () {
            if (!confirm('Delete this study slot?')) return;
            this.disabled = true;
            var r = await apiRequest('study_schedule_delete', { id: slotId });
            if (r.status === 'success') {
                modal.classList.add('hidden');
                if (window.scheduleCalendarContainer) {
                    renderScheduleCalendar(window.scheduleCalendarContainer, subjects);
                }
            } else {
                alert(r.message || 'Failed to delete slot.');
                this.disabled = false;
            }
        });
    }

    function renderEditMode() {
        var slot = (window.currentMonthScheduleSlots || []).find(function (s) { return s.id == slotId; });
        if (!slot) return;

        body.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:0.75rem;">' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.25rem;">Date *</label>' +
                    '<input type="date" id="essmDate" class="form-input" value="' + slot.date + '" required>' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.25rem;">Subject *</label>' +
                    '<input type="text" id="essmSubject" class="form-input" value="' + escapeHtmlNotif(slot.subject) + '" list="essmSubjectList" required>' +
                    '<datalist id="essmSubjectList">' + subjects.map(function (s) { return '<option value="' + escapeHtmlNotif(s) + '">'; }).join('') + '</datalist>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
                    '<div>' +
                        '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.25rem;">Topic</label>' +
                        '<input type="text" id="essmTopic" class="form-input" value="' + escapeHtmlNotif(slot.topic || '') + '" placeholder="Topic (optional)">' +
                    '</div>' +
                    '<div>' +
                        '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.25rem;">Duration (Min)</label>' +
                        '<input type="number" id="essmDuration" class="form-input" value="' + slot.durationMin + '" min="5" max="480">' +
                    '</div>' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:0.78rem;color:var(--color-text-secondary);display:block;margin-bottom:0.25rem;">Notes</label>' +
                    '<textarea id="essmNotes" class="form-input" rows="3" style="resize:vertical;">' + escapeHtmlNotif(slot.notes || '') + '</textarea>' +
                '</div>' +
                '<hr style="border:0;border-top:1px solid var(--color-border);margin:0.5rem 0;">' +
                '<div style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
                    '<button id="essmCancelBtn" class="btn btn-secondary btn-small">Cancel</button>' +
                    '<button id="essmSaveBtn" class="btn btn-primary btn-small">Save Changes</button>' +
                '</div>' +
            '</div>';

        document.getElementById('essmCancelBtn').addEventListener('click', renderViewMode);

        document.getElementById('essmSaveBtn').addEventListener('click', async function () {
            var date = document.getElementById('essmDate').value;
            var subject = document.getElementById('essmSubject').value.trim();
            var topic = document.getElementById('essmTopic').value.trim();
            var durationMin = parseInt(document.getElementById('essmDuration').value || '60', 10);
            var notes = document.getElementById('essmNotes').value.trim();

            if (!date || !subject) {
                alert('Date and subject are required.');
                return;
            }

            this.disabled = true;
            this.textContent = 'Saving…';

            var r = await apiRequest('study_schedule_update', {
                id: slotId,
                date: date,
                subject: subject,
                topic: topic,
                durationMin: durationMin,
                notes: notes
            });

            if (r.status === 'success') {
                slot.date = date;
                slot.subject = subject;
                slot.topic = topic;
                slot.durationMin = durationMin;
                slot.notes = notes;

                showToast('Study slot updated.', 'success');
                if (window.scheduleCalendarContainer) {
                    renderScheduleCalendar(window.scheduleCalendarContainer, subjects);
                }
                renderViewMode();
            } else {
                alert(r.message || 'Failed to update slot.');
                this.disabled = false;
                this.textContent = 'Save Changes';
            }
        });
    }

    renderViewMode();
}

function stringToColor(s) {
    var hash = 0;
    for (var i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    var hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ',55%,45%)';
}

// =========================================================================
// STUDY INTERFACE — generic practice/mock/SRS runner
// =========================================================================
function enterStudyInterface(mockMode) {
    // Hide the dashboard, show exam interface reused for study
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('examInterface').classList.remove('hidden');
    var navbar = document.querySelector('.navbar');
    var footer = document.querySelector('.site-footer');
    if (navbar) navbar.classList.add('hidden');
    if (footer) footer.classList.add('hidden');
    document.body.style.overflow = 'hidden';

    // Show the back button (used to exit study mode without submitting)
    var backBtn = document.getElementById('studyBackBtn');
    if (backBtn) {
        backBtn.style.display = '';
        var fresh = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(fresh, backBtn);
        fresh.addEventListener('click', function () {
            if (!confirm('Exit this session? Your progress will NOT be saved.')) return;
            exitStudyInterface();
        });
    }

    // Header info
    document.getElementById('candidateName').textContent    = currentUser.name;
    document.getElementById('candidateId').textContent      = currentUser.userId;
    document.getElementById('examSubjectName').textContent  = studySession.subject;
    var modeLabel = studySession.mode === 'mock' ? ' (Mock Exit Exam)' : (studySession.mode === 'srs' ? ' (SRS Review)' : ' (Practice)');
    document.getElementById('examTitle').textContent        = studySession.subject + modeLabel;

    // Timer: mock = 3 hours countdown; otherwise count up
    if (studySession.mode === 'mock') {
        startStudyTimer(180 * 60, true); // 3hr countdown
    } else {
        startStudyTimer(0, false); // count up
    }

    renderStudyQuestion();
    buildStudyGrid();
}

function startStudyTimer(startSec, countdown) {
    clearInterval(window._studyTimerInt);
    var t = startSec;
    var el = document.getElementById('examTimer');
    var container = document.getElementById('examTimerContainer');
    if (countdown) {
        container.classList.remove('practice-hidden');
        container.innerHTML = '<span class="timer-label">Time Remaining:</span><span id="examTimer" class="timer-value">03:00:00</span>';
    } else {
        container.innerHTML = '<span class="practice-label" style="color:var(--color-primary);font-weight:700;font-size:0.95rem;">⏱ Practice — <span id="examTimer">00:00</span></span>';
    }
    var timerEl = document.getElementById('examTimer');
    function fmt(s) {
        var h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
        if (h > 0) return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
        return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    }
    function tick() {
        timerEl.textContent = fmt(t);
        if (countdown && t <= 60) timerEl.style.color = 'var(--color-danger)';
        if (countdown && t <= 0) {
            clearInterval(window._studyTimerInt);
            finishStudySession(true); // auto-submit on timeout
            return;
        }
        t = countdown ? t - 1 : t + 1;
    }
    tick();
    window._studyTimerInt = setInterval(tick, 1000);
}

function renderStudyQuestion() {
    var q = studySession.questions[studySession.currentIndex];
    if (!q) return;
    var container = document.getElementById('questionContainer');
    var isMock = studySession.mode === 'mock';
    var isReview = studySession.mode === 'review';
    var chosen = studySession.answers[q.id];
    var showFeedback = (!isMock || isReview) && chosen !== undefined;

    var optionsHtml = '';
    q.options.forEach(function (opt, i) {
        var letter = String.fromCharCode(65 + i);
        var cls = 'option-item';
        var isChecked = chosen === i ? 'checked' : '';
        if (isChecked) cls += ' selected';
        if (showFeedback) {
            if (i === q.correctAnswer) cls += ' correct';
            else if (i === chosen) cls += ' wrong';
        }
        optionsHtml +=
            '<label class="' + cls + '">' +
                '<input type="radio" name="optionRadio" value="' + i + '" ' + isChecked + ' ' + (showFeedback ? 'disabled' : '') + '>' +
                '<span class="option-letter">' + letter + '</span>' +
                '<span class="option-text-content">' + (window.renderOptionHTML ? window.renderOptionHTML(opt) : escapeHtmlNotif(opt)) + '</span>' +
            '</label>';
    });

    var feedbackHtml = '';
    if (showFeedback) {
        var isCorrect = chosen === q.correctAnswer;
        feedbackHtml =
            '<div id="practiceFeedback" class="practice-feedback" style="display:block;margin-top:0.6rem;padding:0.85rem 1rem;border-radius:0.5rem;font-weight:600;background:' + (isCorrect ? 'rgba(110,154,114,0.15)' : 'rgba(231,76,60,0.12)') + ';color:' + (isCorrect ? 'var(--color-success)' : 'var(--color-danger)') + ';">' +
                (isCorrect ? '✓ Correct!' : '✗ Not quite. The correct answer is ' + String.fromCharCode(65 + q.correctAnswer) + '.') +
            '</div>';
        if (q.explanation) {
            var explRendered = window.renderQuestionHTML ? window.renderQuestionHTML(q.explanation) : escapeHtmlNotif(q.explanation);
            feedbackHtml += '<div style="margin-top:0.6rem;padding:0.85rem 1rem;background:rgba(87,120,90,0.07);border-left:3px solid var(--color-primary);border-radius:0.4rem;font-size:0.9rem;line-height:1.55;color:var(--color-text);"><b>💡 Explanation:</b><br>' + explRendered + '</div>';
        }
    }

    // Hint button (only in non-mock practice/SRS)
    var hintHtml = '';
    if (!isMock && (q.hint1 || q.hint2)) {
        var revealed = studySession.hintsRevealed[q.id] || 0;
        hintHtml = '<div id="hintArea" style="margin-top:0.6rem;">';
        if (revealed === 0) {
            hintHtml += '<button id="revealHintBtn" class="btn btn-secondary btn-small">💡 Show Hint</button>';
        } else {
            if (q.hint1) hintHtml += '<div style="padding:0.55rem 0.85rem;background:rgba(245,158,11,0.1);border-left:3px solid #f59e0b;border-radius:0.4rem;font-size:0.85rem;margin-bottom:0.4rem;"><b>Hint 1:</b> ' + escapeHtmlNotif(q.hint1) + '</div>';
            if (revealed >= 2 && q.hint2) hintHtml += '<div style="padding:0.55rem 0.85rem;background:rgba(245,158,11,0.1);border-left:3px solid #f59e0b;border-radius:0.4rem;font-size:0.85rem;"><b>Hint 2:</b> ' + escapeHtmlNotif(q.hint2) + '</div>';
            if (revealed === 1 && q.hint2) hintHtml += '<button id="revealHintBtn" class="btn btn-secondary btn-small">💡 Show Hint 2</button>';
        }
        hintHtml += '</div>';
    }

    // Discussion button (always available in practice/SRS, hidden in mock)
    var discussBtn = (!isMock) ? '<button id="openDiscussBtn" class="btn btn-secondary btn-small" style="margin-left:0.4rem;">💬 Discuss</button>' : '';

    // Word count + reading time hint + subject badge (in mock mode)
    var meta = '';
    if (window.countWords) {
        var wc = window.countWords(q.question);
        var rt = window.estimateReadingTime(q.question);
        meta = '<span style="font-size:0.72rem;color:var(--color-text-secondary);margin-left:0.6rem;">' + wc + ' words · ~' + rt + 's read</span>';
    }
    var subjectBadge = '';
    if (isMock && q.subject) {
        subjectBadge = '<span style="font-size:0.7rem;background:rgba(87,120,90,0.15);color:var(--color-primary);padding:0.15rem 0.5rem;border-radius:0.3rem;margin-left:0.5rem;font-weight:600;">' + escapeHtmlNotif(q.subject) + '</span>';
    }

    container.innerHTML =
        '<div class="question-header-strip">' +
            '<span class="question-number-label">Question ' + (studySession.currentIndex + 1) + ' of ' + studySession.questions.length + meta + subjectBadge + '</span>' +
            '<span class="question-points">(' + (q.points || 1) + ' Point' + ((q.points||1) > 1 ? 's' : '') + ')</span>' +
        '</div>' +
        '<div class="question-text" id="questionTextContainer"></div>' +
        '<div class="options-list">' + optionsHtml + '</div>' +
        hintHtml + feedbackHtml +
        '<div style="margin-top:0.6rem;display:flex;gap:0.4rem;justify-content:flex-end;">' + discussBtn + '</div>';

    // Render question text with code blocks, images, keyword highlighting
    var textContainer = document.getElementById('questionTextContainer');
    if (window.renderQuestionInto) {
        window.renderQuestionInto(textContainer, q.question, { imageUrl: q.imageUrl });
    } else {
        textContainer.innerHTML = escapeHtmlNotif(q.question);
    }

    // Update progress bar (works for both study session and exam)
    updateStudyProgressBar();

    container.querySelectorAll('input[name="optionRadio"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            var ans = parseInt(this.value, 10);
            studySession.answers[q.id] = ans;
            // For mock mode, just record silently. For practice/SRS, show feedback.
            if (!isMock) renderStudyQuestion();
        });
    });

    var revealBtn = document.getElementById('revealHintBtn');
    if (revealBtn) {
        revealBtn.addEventListener('click', function () {
            studySession.hintsRevealed[q.id] = (studySession.hintsRevealed[q.id] || 0) + 1;
            renderStudyQuestion();
        });
    }

    var discussBtnEl = document.getElementById('openDiscussBtn');
    if (discussBtnEl) {
        discussBtnEl.addEventListener('click', function () {
            openDiscussionModal(q.id, q.question);
        });
    }

    // Navigation buttons
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    prevBtn.disabled = studySession.currentIndex === 0;
    if (studySession.currentIndex === studySession.questions.length - 1) {
        nextBtn.textContent = isMock ? 'Submit Exam' : 'Finish';
    } else {
        nextBtn.textContent = 'Next';
    }
    updateStudyGridItem(studySession.currentIndex);
}

function buildStudyGrid() {
    var grid = document.getElementById('questionsMapGrid');
    if (!grid) return;
    grid.innerHTML = '';
    studySession.questions.forEach(function (q, i) {
        var cell = document.createElement('div');
        cell.className = 'qmap-cell';
        cell.textContent = i + 1;
        cell.setAttribute('data-idx', i);
        cell.addEventListener('click', function () {
            studySession.currentIndex = i;
            renderStudyQuestion();
        });
        grid.appendChild(cell);
    });
    updateStudyGridItem(studySession.currentIndex);
}

function updateStudyGridItem(idx) {
    var cells = document.querySelectorAll('#questionsMapGrid .qmap-cell');
    cells.forEach(function (c, i) {
        c.classList.remove('active', 'answered', 'flagged');
        if (i === idx) c.classList.add('active');
        var q = studySession.questions[i];
        if (q && studySession.answers[q.id] !== undefined) c.classList.add('answered');
    });
}

// Update the progress bar based on answered/total
function updateStudyProgressBar() {
    var bar = document.getElementById('examProgressBar');
    var label = document.getElementById('examProgressLabel');
    if (!bar || !label) return;
    var total = studySession.questions.length;
    if (!total) return;
    var answered = 0;
    studySession.questions.forEach(function (q) {
        if (studySession.answers[q.id] !== undefined) answered++;
    });
    var pct = Math.round(answered * 100 / total);
    bar.style.width = pct + '%';
    label.textContent = answered + ' / ' + total + ' answered';
    if (pct === 100) bar.style.background = 'var(--color-success)';
    else if (pct >= 50) bar.style.background = '#f59e0b';
    else bar.style.background = 'var(--color-primary)';
}

// Navigation handler — wire to the existing exam navigation buttons
// This is called from exam.js's wireExamButtons when in practice mode, OR
// we override next/prev here when in study mode.
function studyNextQuestion() {
    if (studySession.currentIndex < studySession.questions.length - 1) {
        studySession.currentIndex++;
        renderStudyQuestion();
    } else {
        finishStudySession(false);
    }
}
function studyPrevQuestion() {
    if (studySession.currentIndex > 0) {
        studySession.currentIndex--;
        renderStudyQuestion();
    }
}

async function finishStudySession(timedOut) {
    if (window._finishingStudy) return;
    window._finishingStudy = true;
    clearInterval(window._studyTimerInt);

    var total = studySession.questions.length;
    var correct = 0;
    studySession.questions.forEach(function (q) {
        if (studySession.answers[q.id] === q.correctAnswer) correct++;
    });
    var timeTakenSec = Math.round((Date.now() - studySession.startTime) / 1000);
    var questionIds = studySession.questions.map(function (q) { return q.id; });

    var saveRes = await apiRequest('study_save_session', {
        subject: studySession.subject,
        mode: studySession.mode,
        totalQs: total,
        correctQs: correct,
        timeTakenSec: timeTakenSec,
        questionIds: questionIds,
        answers: studySession.answers
    });

    var score = total > 0 ? Math.round(correct * 100 / total) : 0;
    var passed = score >= 60;

    // Hide the header "Back" button while on the scorecard
    var headerBackBtn = document.getElementById('studyBackBtn');
    if (headerBackBtn) headerBackBtn.style.display = 'none';

    // Show scorecard
    var card = document.getElementById('questionContainer');
    if (!card) {
        // Restore DOM
        document.getElementById('examInterface').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        window._finishingStudy = false;
        return;
    }
    // Per-subject breakdown for mock exams
    var breakdownHtml = '';
    if (studySession.mode === 'mock' && total > 0) {
        var subjStats = {};
        studySession.questions.forEach(function (q) {
            var subj = q.subject || 'Mixed';
            if (!subjStats[subj]) subjStats[subj] = { correct: 0, total: 0 };
            subjStats[subj].total++;
            if (studySession.answers[q.id] === q.correctAnswer) subjStats[subj].correct++;
        });
        breakdownHtml = '<div style="margin:1.5rem auto;max-width:640px;text-align:left;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:1rem 1.25rem;">' +
            '<div style="font-weight:700;margin-bottom:0.6rem;">Subject breakdown</div>';
        Object.keys(subjStats).sort().forEach(function (subj) {
            var s = subjStats[subj];
            var pct = s.total > 0 ? Math.round(s.correct * 100 / s.total) : 0;
            var color = pct >= 70 ? 'var(--color-success)' : (pct >= 50 ? '#f59e0b' : 'var(--color-danger)');
            breakdownHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px dashed var(--color-border);font-size:0.88rem;">' +
                '<span>' + escapeHtmlNotif(subj) + '</span>' +
                '<span><b style="color:' + color + ';">' + pct + '%</b> <span style="color:var(--color-text-secondary);font-size:0.78rem;">(' + s.correct + '/' + s.total + ')</span></span>' +
            '</div>';
        });
        breakdownHtml += '</div>';
    }

    card.innerHTML =
        '<div style="text-align:center;padding:2rem 1rem;">' +
            '<div style="font-size:3.5rem;line-height:1;margin-bottom:0.6rem;">' + (passed ? '🎉' : (timedOut ? '⏰' : '📊')) + '</div>' +
            '<h2 style="font-size:1.6rem;font-weight:800;color:var(--color-text);margin-bottom:0.5rem;">' + (studySession.mode === 'mock' ? 'Mock Exam Complete' : 'Practice Session Complete') + '</h2>' +
            (timedOut ? '<p style="color:var(--color-text-secondary);margin-bottom:1rem;">⏰ Time ran out. Your answers were auto-submitted.</p>' : '') +
            '<div style="font-size:3rem;font-weight:800;color:' + (passed ? 'var(--color-success)' : 'var(--color-danger)') + ';margin-bottom:0.4rem;">' + score + '%</div>' +
            '<div style="font-size:1.1rem;color:var(--color-text-secondary);margin-bottom:1.5rem;">' + correct + ' / ' + total + ' correct · ' + Math.floor(timeTakenSec/60) + 'm ' + (timeTakenSec%60) + 's</div>' +
            breakdownHtml +
            '<div style="display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">' +
                '<button id="reviewAnswersBtn" class="btn btn-secondary">Review Answers</button>' +
                '<button id="backToDashboardBtn" class="btn btn-primary">Back to Dashboard</button>' +
            '</div>' +
        '</div>';

    document.getElementById('backToDashboardBtn').addEventListener('click', function () {
        exitStudyInterface();
    });

    document.getElementById('reviewAnswersBtn').addEventListener('click', function () {
        // Re-show the header Back button for review mode (so user can exit back to scorecard)
        var hb = document.getElementById('studyBackBtn');
        if (hb) {
            hb.style.display = '';
            var fresh = hb.cloneNode(true);
            hb.parentNode.replaceChild(fresh, hb);
            fresh.addEventListener('click', function () {
                // Re-render the scorecard
                if (window._scorecardHtml) {
                    document.getElementById('questionContainer').innerHTML = window._scorecardHtml;
                    var rb = document.getElementById('reviewAnswersBtn');
                    var bd = document.getElementById('backToDashboardBtn');
                    if (rb) rb.addEventListener('click', function () { document.getElementById('reviewAnswersBtn').click(); });
                    if (bd) bd.addEventListener('click', function () { exitStudyInterface(); });
                }
            });
        }
        // Re-run the question rendering with all answers locked in & feedback shown
        studySession.currentIndex = 0;
        studySession.questions.forEach(function (q) {
            if (studySession.answers[q.id] === undefined) studySession.answers[q.id] = -1;
        });
        var originalMode = studySession.mode;
        studySession.mode = 'review';
        renderStudyQuestion();
        studySession.mode = originalMode;
    });

    // Cache the scorecard HTML so review-mode's Back button can restore it
    window._scorecardHtml = card.innerHTML;

    showToast((saveRes.status === 'success' ? 'Saved: ' : 'Save failed: ') + (saveRes.message || ''), saveRes.status === 'success' ? 'success' : 'error');
}

// Exit the study interface and return to the dashboard
function exitStudyInterface() {
    clearInterval(window._studyTimerInt);
    document.getElementById('examInterface').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.body.style.overflow = '';
    var navbar = document.querySelector('.navbar');
    var footer = document.querySelector('.site-footer');
    if (navbar) navbar.classList.add('hidden'); // dashboard has its own sidebar
    if (footer) footer.classList.remove('hidden');
    // Hide the back button
    var backBtn = document.getElementById('studyBackBtn');
    if (backBtn) backBtn.style.display = 'none';
    // Reset session
    var prevMode = studySession.mode;
    studySession = { mode: null, subject: '', questions: [], currentIndex: 0, answers: {}, startTime: 0, hintsRevealed: {} };
    window._finishingStudy = false;
    window._scorecardHtml = null;
    // Refresh current tab
    if (prevMode === 'mock') loadMockExam();
    else if (prevMode === 'srs') loadSrsQueue();
    else if (prevMode === 'subject') loadStudentSubjects();
    else if (currentUser && currentUser.role === 'student') loadStudentDashboard();
}

// =========================================================================
// QUESTION DISCUSSION MODAL
// =========================================================================
var currentDiscussionQuestionId = null;

function openDiscussionModal(questionId, questionText) {
    currentDiscussionQuestionId = questionId;
    var modal = document.getElementById('questionDiscussionModal');
    var preview = document.getElementById('discussionQuestionPreview');
    var list = document.getElementById('discussionList');
    var replyText = document.getElementById('discussionReplyText');
    var postBtn = document.getElementById('postDiscussionBtn');
    var closeBtn = document.getElementById('closeDiscussionModal');

    if (!modal) return;
    preview.innerHTML = '<b>Q:</b> ' + escapeHtmlNotif(questionText);
    list.innerHTML = '<div style="text-align:center;color:var(--color-text-secondary);padding:1rem;">Loading comments…</div>';
    replyText.value = '';
    modal.classList.remove('hidden');

    var newClose = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newClose, closeBtn);
    newClose.addEventListener('click', function () { modal.classList.add('hidden'); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.add('hidden'); });

    var newPost = postBtn.cloneNode(true);
    postBtn.parentNode.replaceChild(newPost, postBtn);
    newPost.addEventListener('click', function () { postDiscussionComment(); });

    loadDiscussionComments(questionId);
}

async function loadDiscussionComments(questionId) {
    var list = document.getElementById('discussionList');
    if (!list) return;
    var res = await apiRequest('study_list_discussion', { questionId: questionId }, 'GET');
    if (res.status !== 'success') {
        list.innerHTML = '<div style="color:var(--color-danger);padding:1rem;">Failed to load comments.</div>';
        return;
    }
    if (res.count === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--color-text-secondary);padding:1.5rem;">No comments yet. Be the first to discuss this question!</div>';
        return;
    }
    var html = '';
    res.comments.forEach(function (c) {
        var initials = (c.authorName || 'U').substring(0, 2).toUpperCase();
        var date = new Date(c.createdAt + 'Z').toLocaleString();
        var pinnedBadge = c.isPinned == 1 ? '📌 ' : '';
        var hiddenStyle = c.isHidden == 1 ? 'opacity:0.4;' : '';
        var isTeacher = currentUser.role === 'teacher';
        var canDelete = isTeacher || c.userId == currentUser.id;
        var roleTag = c.authorRole === 'teacher' ? '<span style="font-size:0.66rem;background:var(--color-primary);color:#fff;padding:0.05rem 0.35rem;border-radius:0.25rem;margin-left:0.3rem;">TEACHER</span>' : '';
        html +=
            '<div style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.9rem;margin-bottom:0.5rem;' + hiddenStyle + '">' +
                '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">' +
                    '<div style="width:28px;height:28px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">' + initials + '</div>' +
                    '<div><span style="font-weight:700;font-size:0.88rem;">' + pinnedBadge + escapeHtmlNotif(c.authorName) + '</span>' + roleTag + '<br><span style="font-size:0.72rem;color:var(--color-text-secondary);">' + date + '</span></div>' +
                    '<div style="margin-left:auto;display:flex;gap:0.25rem;">' +
                        (isTeacher ? '<button class="btn btn-secondary btn-small" style="padding:0.2rem 0.5rem;font-size:0.7rem;" data-disc-pin="' + c.id + '">' + (c.isPinned == 1 ? 'Unpin' : 'Pin') + '</button>' : '') +
                        (isTeacher ? '<button class="btn btn-secondary btn-small" style="padding:0.2rem 0.5rem;font-size:0.7rem;" data-disc-hide="' + c.id + '" data-hidden="' + c.isHidden + '">' + (c.isHidden == 1 ? 'Show' : 'Hide') + '</button>' : '') +
                        (canDelete ? '<button class="btn btn-danger btn-small" style="padding:0.2rem 0.5rem;font-size:0.7rem;" data-disc-del="' + c.id + '">Delete</button>' : '') +
                    '</div>' +
                '</div>' +
                '<div style="font-size:0.9rem;line-height:1.5;color:var(--color-text);white-space:pre-wrap;">' + escapeHtmlNotif(c.body) + '</div>' +
            '</div>';
    });
    list.innerHTML = html;

    list.querySelectorAll('[data-disc-del]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            if (!confirm('Delete this comment?')) return;
            var id = parseInt(this.getAttribute('data-disc-del'), 10);
            await apiRequest('study_delete_discussion', { id: id });
            loadDiscussionComments(currentDiscussionQuestionId);
        });
    });
    list.querySelectorAll('[data-disc-pin]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var id = parseInt(this.getAttribute('data-disc-pin'), 10);
            await apiRequest('study_toggle_pin_discussion', { id: id });
            loadDiscussionComments(currentDiscussionQuestionId);
        });
    });
    list.querySelectorAll('[data-disc-hide]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var id = parseInt(this.getAttribute('data-disc-hide'), 10);
            var hidden = parseInt(this.getAttribute('data-hidden'), 10);
            await apiRequest('study_hide_discussion', { id: id, hidden: hidden ? 0 : 1 });
            loadDiscussionComments(currentDiscussionQuestionId);
        });
    });
}

async function postDiscussionComment() {
    var body = document.getElementById('discussionReplyText').value.trim();
    if (!body) return;
    var btn = document.getElementById('postDiscussionBtn');
    btn.disabled = true; btn.textContent = 'Posting…';
    var res = await apiRequest('study_add_discussion', { questionId: currentDiscussionQuestionId, body: body });
    btn.disabled = false; btn.textContent = 'Post Comment';
    if (res.status === 'success') {
        document.getElementById('discussionReplyText').value = '';
        loadDiscussionComments(currentDiscussionQuestionId);
    } else {
        alert(res.message || 'Failed to post comment.');
    }
}

// =========================================================================
// WIRE UP — patch study navigation into the existing exam interface buttons
// =========================================================================
document.addEventListener('click', function (e) {
    // If we're in a study session, hijack next/prev button clicks
    if (!studySession || !studySession.mode) return;
    var nextBtn = e.target.closest('#nextBtn');
    var prevBtn = e.target.closest('#prevBtn');
    if (nextBtn) {
        // Don't double-handle if exam.js already did
        if (studySession.mode === 'subject' || studySession.mode === 'mock' || studySession.mode === 'srs' || studySession.mode === 'review') {
            e.preventDefault();
            e.stopPropagation();
            studyNextQuestion();
        }
    }
    if (prevBtn) {
        if (studySession.mode === 'subject' || studySession.mode === 'mock' || studySession.mode === 'srs' || studySession.mode === 'review') {
            e.preventDefault();
            e.stopPropagation();
            studyPrevQuestion();
        }
    }
}, true); // capture phase so we run before exam.js's listeners

// =========================================================================
// TEACHER CLASS ANALYTICS — class-wide subject mastery + hardest questions
// =========================================================================
async function loadClassAnalytics() {
    var container = document.getElementById('teacherAnalyticsContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading analytics…</div>';

    var res = await apiRequest('study_class_analytics', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load analytics.</div>';
        return;
    }

    var html =
        '<div style="margin-bottom:1rem;padding:0.85rem 1rem;background:rgba(87,120,90,0.08);border:1px solid rgba(87,120,90,0.18);border-radius:0.6rem;">' +
            '<b>Class Analytics:</b> Aggregated mastery per subject across all students, plus the hardest questions and overall exam pass rates. Use this to spot subjects where the whole class is struggling.' +
        '</div>';

    // Summary tiles
    var s = res.summary || {};
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.85rem;margin-bottom:1.5rem;">';
    html += renderAnalyticsStatTile('Students', s.totalStudents || 0, '👥');
    html += renderAnalyticsStatTile('Exams', s.totalExams || 0, '📝');
    html += renderAnalyticsStatTile('Real Exam Attempts', s.totalAttempts || 0, '🎯');
    html += renderAnalyticsStatTile('Practice Sessions', s.totalPracticeSessions || 0, '💪');
    html += '</div>';

    // Subject mastery table (from practice_sessions / subject_mastery)
    var subjMastery = res.subjectMastery || [];
    if (subjMastery.length > 0) {
        html += '<h3 style="margin:1.25rem 0 0.6rem;font-size:1.1rem;font-weight:700;">Subject Mastery (from practice sessions)</h3>';
        html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.92rem;">';
        html += '<thead><tr style="background:var(--glass-bg);">' +
                '<th style="text-align:left;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Subject</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Students</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Attempts</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Avg score</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Accuracy</th>' +
                '</tr></thead><tbody>';
        subjMastery.forEach(function (m) {
            var acc = m.totalQs > 0 ? Math.round(m.totalCorrect * 100 / m.totalQs) : 0;
            var color = acc >= 70 ? 'var(--color-success)' : (acc >= 50 ? '#f59e0b' : 'var(--color-danger)');
            html += '<tr style="background:var(--glass-bg);">' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);font-weight:600;">' + escapeHtmlNotif(m.subject) + '</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;">' + m.studentCount + '</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;">' + m.totalAttempts + '</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;font-weight:700;color:' + color + ';">' + m.avgScore + '%</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;">' + m.totalCorrect + '/' + m.totalQs + ' (' + acc + '%)</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
    }

    // Real exam stats per subject
    var examStats = res.examStats || [];
    if (examStats.length > 0) {
        html += '<h3 style="margin:1.75rem 0 0.6rem;font-size:1.1rem;font-weight:700;">Real Exam Results by Subject</h3>';
        html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.92rem;">';
        html += '<thead><tr style="background:var(--glass-bg);">' +
                '<th style="text-align:left;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Subject</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Attempts</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Students</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Avg</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Best</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Worst</th>' +
                '<th style="text-align:center;padding:0.55rem 0.85rem;border-bottom:2px solid var(--color-border);">Pass rate</th>' +
                '</tr></thead><tbody>';
        examStats.forEach(function (e) {
            var prColor = e.passRate >= 70 ? 'var(--color-success)' : (e.passRate >= 50 ? '#f59e0b' : 'var(--color-danger)');
            html += '<tr style="background:var(--glass-bg);">' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);font-weight:600;">' + escapeHtmlNotif(e.subject) + '</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;">' + e.attemptCount + '</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;">' + e.uniqueStudents + '</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;">' + (e.avgScore || 0) + '%</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;color:var(--color-success);font-weight:700;">' + e.bestScore + '%</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;color:var(--color-danger);font-weight:700;">' + e.worstScore + '%</td>' +
                '<td style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--color-border);text-align:center;font-weight:700;color:' + prColor + ';">' + e.passRate + '%</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
    }

    // Hardest questions
    var hardest = res.hardestQuestions || [];
    if (hardest.length > 0) {
        html += '<h3 style="margin:1.75rem 0 0.6rem;font-size:1.1rem;font-weight:700;">🔥 Top 10 Hardest Questions (most often wrong)</h3>';
        html += '<div style="display:grid;gap:0.5rem;">';
        hardest.forEach(function (q, i) {
            html += '<div style="background:var(--glass-bg);border:1px solid var(--color-border);border-left:3px solid var(--color-danger);border-radius:0.5rem;padding:0.6rem 0.9rem;font-size:0.9rem;">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.6rem;">' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-size:0.72rem;color:var(--color-text-secondary);margin-bottom:0.2rem;">#' + (i+1) + ' · ' + escapeHtmlNotif(q.subject) + '</div>' +
                        '<div>' + escapeHtmlNotif(q.question) + '</div>' +
                    '</div>' +
                    '<div style="text-align:right;font-size:0.78rem;color:var(--color-danger);font-weight:700;white-space:nowrap;">' +
                        '×' + q.totalWrong + ' wrong<br><span style="color:var(--color-text-secondary);font-weight:400;">by ' + q.studentsTried + ' students</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    } else {
        html += '<div style="margin-top:1.5rem;padding:1rem;background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;color:var(--color-text-secondary);font-size:0.88rem;">No "hardest questions" data yet — this fills up as students take practice sessions.</div>';
    }

    container.innerHTML = html;
}

function renderAnalyticsStatTile(label, value, icon) {
    return '<div style="background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:0.85rem 1rem;text-align:center;">' +
        '<div style="font-size:1.6rem;line-height:1;margin-bottom:0.2rem;">' + icon + '</div>' +
        '<div style="font-size:1.5rem;font-weight:800;color:var(--color-primary);">' + value + '</div>' +
        '<div style="font-size:0.78rem;color:var(--color-text-secondary);">' + label + '</div>' +
    '</div>';
}

// =========================================================================
// TEACHER STUDENT PROGRESS — per-student mastery table
// =========================================================================
async function loadStudentProgress() {
    var container = document.getElementById('teacherProgressContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading student progress…</div>';

    var res = await apiRequest('study_student_progress', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load.</div>';
        return;
    }

    var students = res.students || [];
    var html =
        '<div style="margin-bottom:1rem;padding:0.85rem 1rem;background:rgba(87,120,90,0.08);border:1px solid rgba(87,120,90,0.18);border-radius:0.6rem;">' +
            '<b>Student Progress Tracker:</b> For each student, see how many subjects they\'ve practiced, their average score, and weakest subject. Click a row to expand and see their per-subject breakdown.' +
        '</div>' +
        '<input type="text" id="progressSearch" class="form-input" placeholder="Search by name, email, or ID…" style="max-width:380px;width:100%;margin-bottom:1rem;">';

    if (students.length === 0) {
        html += '<div class="analytics-empty-state"><div class="aems-title">No students yet</div><div class="aems-desc">Register students via the Students tab to see their progress here.</div></div>';
        container.innerHTML = html;
        return;
    }

    html += '<div id="studentProgressList" style="display:grid;gap:0.5rem;"></div>';
    container.innerHTML = html;

    var list = document.getElementById('studentProgressList');
    list.innerHTML = '';
    students.forEach(function (stu) {
        var card = document.createElement('div');
        card.className = 'student-progress-card';
        card.style.cssText = 'background:var(--glass-bg);border:1px solid var(--color-border);border-radius:0.6rem;padding:0.7rem 0.95rem;cursor:pointer;';
        card.dataset.search = (stu.name + ' ' + stu.email + ' ' + stu.userId).toLowerCase();

        var initials = (stu.name || 'U').substring(0, 2).toUpperCase();
        var avgScore = stu.avgExamScore !== null ? stu.avgExamScore : '—';
        var avgColor = stu.avgExamScore === null ? 'var(--color-text-secondary)' :
                       (stu.avgExamScore >= 60 ? 'var(--color-success)' : 'var(--color-danger)');
        var masteryCount = stu.mastery.length;
        var weakSubject = stu.mastery.length > 0 ? stu.mastery[0] : null;
        var weakLabel = weakSubject ? weakSubject.subject + ' (' + weakSubject.avgScore + '%)' : '—';

        card.innerHTML =
            '<div style="display:flex;align-items:center;gap:0.8rem;">' +
                '<div style="width:38px;height:38px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;flex-shrink:0;">' + initials + '</div>' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-weight:700;color:var(--color-text);">' + escapeHtmlNotif(stu.name) + ' <span style="font-weight:400;color:var(--color-text-secondary);font-size:0.82rem;">(' + escapeHtmlNotif(stu.userId) + ')</span></div>' +
                    '<div style="font-size:0.78rem;color:var(--color-text-secondary);">' + escapeHtmlNotif(stu.email) + '</div>' +
                '</div>' +
                '<div style="text-align:center;min-width:80px;">' +
                    '<div style="font-size:0.7rem;color:var(--color-text-secondary);">Exam attempts</div>' +
                    '<div style="font-size:1.1rem;font-weight:700;color:var(--color-text);">' + stu.examAttempts + '</div>' +
                '</div>' +
                '<div style="text-align:center;min-width:80px;">' +
                    '<div style="font-size:0.7rem;color:var(--color-text-secondary);">Avg exam</div>' +
                    '<div style="font-size:1.1rem;font-weight:700;color:' + avgColor + ';">' + avgScore + (stu.avgExamScore !== null ? '%' : '') + '</div>' +
                '</div>' +
                '<div style="text-align:center;min-width:100px;">' +
                    '<div style="font-size:0.7rem;color:var(--color-text-secondary);">Subjects practiced</div>' +
                    '<div style="font-size:1.1rem;font-weight:700;color:var(--color-primary);">' + masteryCount + '</div>' +
                '</div>' +
                '<div style="text-align:center;min-width:140px;">' +
                    '<div style="font-size:0.7rem;color:var(--color-text-secondary);">Weakest</div>' +
                    '<div style="font-size:0.85rem;font-weight:600;color:var(--color-danger);">' + escapeHtmlNotif(weakLabel) + '</div>' +
                '</div>' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;color:var(--color-text-secondary);"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</div>' +
            '<div class="mastery-detail" style="display:none;margin-top:0.7rem;padding-top:0.7rem;border-top:1px dashed var(--color-border);"></div>';

        // Click to expand
        card.addEventListener('click', function () {
            var detail = card.querySelector('.mastery-detail');
            if (detail.style.display === 'none') {
                if (!detail.dataset.populated) {
                    var h = '<div style="font-size:0.82rem;color:var(--color-text-secondary);margin-bottom:0.4rem;">Per-subject mastery:</div>';
                    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.4rem;">';
                    if (stu.mastery.length === 0) {
                        h += '<div style="grid-column:1/-1;font-size:0.85rem;color:var(--color-text-secondary);">No practice sessions yet.</div>';
                    } else {
                        stu.mastery.forEach(function (m) {
                            var color = m.avgScore >= 70 ? 'var(--color-success)' : (m.avgScore >= 50 ? '#f59e0b' : 'var(--color-danger)');
                            h += '<div style="background:var(--color-bg);border-left:3px solid ' + color + ';border-radius:0.3rem;padding:0.4rem 0.6rem;font-size:0.82rem;">' +
                                '<div style="font-weight:600;color:var(--color-text);">' + escapeHtmlNotif(m.subject) + '</div>' +
                                '<div style="color:var(--color-text-secondary);font-size:0.75rem;">' + m.attempts + ' attempts · <b style="color:' + color + ';">' + m.avgScore + '%</b></div>' +
                            '</div>';
                        });
                    }
                    h += '</div>';
                    detail.innerHTML = h;
                    detail.dataset.populated = '1';
                }
                detail.style.display = 'block';
                card.querySelector('svg').style.transform = 'rotate(180deg)';
            } else {
                detail.style.display = 'none';
                card.querySelector('svg').style.transform = '';
            }
        });

        list.appendChild(card);
    });

    // Live search
    var searchInput = document.getElementById('progressSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            list.querySelectorAll('.student-progress-card').forEach(function (card) {
                card.style.display = card.dataset.search.includes(q) ? '' : 'none';
            });
        });
    }
}
