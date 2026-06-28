// js/teacher.js - Teacher dashboard functions for FetenaX
// No DOMContentLoaded wrapper — called from app.js after DOM is ready.

// =========================================================================
// TEACHER DASHBOARD (loads on overview, exams, students, attempts tabs)
// =========================================================================

async function loadTeacherDashboard() {
    var statsRes     = await apiRequest('teacher_stats',     {}, 'GET');
    var analyticsRes = await apiRequest('teacher_analytics', {}, 'GET');
    var attemptsRes  = await apiRequest('teacher_attempts',  {}, 'GET');
    var studentsRes  = await apiRequest('teacher_students',  {}, 'GET');

    // Refresh global search cache
    searchCache.exams    = (analyticsRes.status === 'success' && analyticsRes.analytics) ? analyticsRes.analytics : [];
    searchCache.attempts = (attemptsRes.status  === 'success' && attemptsRes.attempts)   ? attemptsRes.attempts   : [];
    searchCache.students = (studentsRes.status  === 'success' && studentsRes.students)  ? studentsRes.students  : [];

    // ---- CSV Export: populate exam filter + wire button ----
    var csvExamFilter = document.getElementById('csvExamFilter');
    var csvExportBtn  = document.getElementById('csvExportBtn');
    if (csvExamFilter && analyticsRes.status === 'success') {
        var cur = csvExamFilter.value;
        csvExamFilter.innerHTML = '<option value="0">All Exams</option>';
        (analyticsRes.analytics || []).forEach(function (e) {
            var o = document.createElement('option');
            o.value = e.id; o.textContent = e.title;
            csvExamFilter.appendChild(o);
        });
        csvExamFilter.value = cur;
    }
    function updateCsvLink() {
        if (!csvExportBtn) return;
        var eid  = csvExamFilter ? csvExamFilter.value : '0';
        var from = document.getElementById('csvDateFrom') ? document.getElementById('csvDateFrom').value : '';
        var to   = document.getElementById('csvDateTo')   ? document.getElementById('csvDateTo').value   : '';
        var url = 'api.php?action=teacher_export_csv';
        if (eid && eid !== '0') url += '&examId=' + eid;
        if (from) url += '&dateFrom=' + from;
        if (to)   url += '&dateTo=' + to;
        csvExportBtn.href = url;
    }
    updateCsvLink();
    ['csvExamFilter', 'csvDateFrom', 'csvDateTo'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { var clone = el.cloneNode(true); el.parentNode.replaceChild(clone, el); clone.addEventListener('change', updateCsvLink); }
    });

    // ---- Stats Cards ----
    if (statsRes.status === 'success') {
        document.getElementById('totalExams').textContent    = statsRes.totalExams;
        document.getElementById('totalAttempts').textContent = statsRes.totalAttempts;
        document.getElementById('avgScore').textContent      = statsRes.avgScore + '%';
    }

    // ---- Recent Activity (Overview tab) ----
    var recentResultsDiv = document.getElementById('recentResults');
    recentResultsDiv.innerHTML = '';
    if (attemptsRes.status === 'success' && attemptsRes.attempts) {
        if (attemptsRes.attempts.length === 0) {
            recentResultsDiv.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;">No activity yet.</div>';
        } else {
            attemptsRes.attempts.slice(0, 6).forEach(function (attempt) {
                var div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML =
                    '<div class="result-info">' +
                        '<h4>' + attempt.studentName + '</h4>' +
                        '<p>' + attempt.examTitle + '</p>' +
                    '</div>' +
                    '<div class="result-score">' +
                        '<span class="score ' + (attempt.score >= 60 ? 'score-pass' : 'score-fail') + '">' + attempt.score + '%</span><br>' +
                        '<span class="date">' + (attempt.completedAt || '').split(' ')[0] + '</span>' +
                    '</div>';
                recentResultsDiv.appendChild(div);
            });
        }
    }

    // ---- Analytics Cards ----
    var analyticsDiv = document.getElementById('teacherAnalytics');
    if (analyticsDiv) {
        analyticsDiv.innerHTML =
            '<div class="analytics-loading-state">' +
                '<div class="als-spinner"></div>' +
                '<div class="als-text">Loading analytics\u2026</div>' +
            '</div>';
    }

    var totalExamsCount  = 0;
    var totalAttemptsSum = 0;
    var overallAvg       = 0;
    var overallPassRate  = 0;
    if (analyticsRes.status === 'success' && analyticsRes.analytics) {
        totalExamsCount = analyticsRes.analytics.length;
        analyticsRes.analytics.forEach(function (e) { totalAttemptsSum += (e.totalAttempts || 0); });
        var withAttempts = analyticsRes.analytics.filter(function (e) { return e.totalAttempts > 0; });
        if (withAttempts.length > 0) {
            overallAvg = Math.round(withAttempts.reduce(function (s, e) { return s + (e.averageScore || 0); }, 0) / withAttempts.length);
            overallPassRate = Math.round(withAttempts.reduce(function (s, e) { return s + (e.passRate || 0); }, 0) / withAttempts.length);
        }
    }

    if (analyticsDiv) {
        var apiError = analyticsRes.status !== 'success';
        var isEmpty  = (!apiError) && totalExamsCount === 0;

        if (apiError) {
            analyticsDiv.innerHTML =
                '<div class="analytics-error-state">' +
                    '<div class="aes-icon">\u26a0</div>' +
                    '<div class="aes-title">Failed to load analytics</div>' +
                    '<div class="aes-desc">' + (analyticsRes.message || 'The server did not respond correctly. Try refreshing the page.') + '</div>' +
                    '<button class="btn btn-primary" onclick="location.reload()">Reload Page</button>' +
                '</div>';
        } else if (isEmpty) {
            analyticsDiv.innerHTML =
                '<div class="analytics-empty-state">' +
                    '<div class="aems-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>' +
                    '<div class="aems-title">No exams created yet</div>' +
                    '<div class="aems-desc">You haven\'t created any exams. Click the button below to build your first exam \u2014 it only takes a minute.</div>' +
                    '<button id="emptyStateCreateBtn" class="btn btn-primary" style="margin-top:0.8rem;">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                        ' Create Your First Exam' +
                    '</button>' +
                '</div>';
            var emptyBtn = document.getElementById('emptyStateCreateBtn');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', function () {
                    var ceb = document.getElementById('createExamBtn');
                    if (ceb) ceb.click();
                });
            }
        } else {
            analyticsDiv.innerHTML =
                '<div class="analytics-page-header">' +
                    '<div class="aph-left">' +
                        '<h3 class="aph-title">' + ICONS.chart + ' Exam Performance Analytics</h3>' +
                        '<span class="aph-count">' + totalExamsCount + ' exam' + (totalExamsCount === 1 ? '' : 's') + ' \u00b7 ' + totalAttemptsSum + ' total attempt' + (totalAttemptsSum === 1 ? '' : 's') + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="analytics-summary-banner">' +
                    '<div class="asb-card"><div class="asb-icon asb-icon-exams"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="asb-body"><div class="asb-val">' + totalExamsCount + '</div><div class="asb-lbl">Total Exams</div></div></div>' +
                    '<div class="asb-card"><div class="asb-icon asb-icon-attempts"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div class="asb-body"><div class="asb-val">' + totalAttemptsSum + '</div><div class="asb-lbl">Total Attempts</div></div></div>' +
                    '<div class="asb-card"><div class="asb-icon asb-icon-avg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="asb-body"><div class="asb-val">' + overallAvg + '%</div><div class="asb-lbl">Overall Avg Score</div></div></div>' +
                    '<div class="asb-card"><div class="asb-icon asb-icon-pass"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><div class="asb-body"><div class="asb-val" style="color:' + (overallPassRate >= 60 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + overallPassRate + '%</div><div class="asb-lbl">Overall Pass Rate</div></div></div>' +
                '</div>';
        }
    }

    // Build analytics cards grid
    if (analyticsRes.status === 'success' && analyticsRes.analytics && analyticsRes.analytics.length > 0) {
        var grid = document.createElement('div');
        grid.className = 'analytics-cards-grid';

        analyticsRes.analytics.forEach(function (exam) {
            var card = document.createElement('div');
            card.className = 'exam-analytics-card';

            var avgPct = exam.averageScore || 0;
            var passRate = exam.passRate || 0;
            var diffColor = { Easy: 'var(--color-success)', Medium: '#f59e0b', Hard: 'var(--color-danger)' }[exam.difficulty] || 'var(--color-primary)';
            var hasAttempts = exam.totalAttempts > 0;
            var circ = 2 * Math.PI * 24;

            card.innerHTML =
                '<div class="eac-header">' +
                    '<div class="eac-title-row"><span class="eac-diff-dot" style="background:' + diffColor + ';" title="' + exam.difficulty + '"></span><span class="eac-title" title="' + exam.title + '">' + exam.title + '</span></div>' +
                    '<div class="eac-meta-row">' +
                        '<span class="eac-chip">' + exam.subject + '</span>' +
                        '<span class="eac-chip" style="color:' + diffColor + ';background:' + diffColor + '18;">' + exam.difficulty + '</span>' +
                        '<span class="eac-chip">' + exam.totalQuestions + 'Q \u00b7 ' + exam.duration + 'min</span>' +
                        (!hasAttempts ? '<span class="eac-chip eac-chip-muted">No attempts yet</span>' : '') +
                    '</div>' +
                '</div>' +
                '<div class="eac-score-section">' +
                    '<div class="eac-score-circle" style="--score-color:' + (avgPct >= 75 ? '#2ecc71' : avgPct >= 50 ? '#f59e0b' : '#e74c3c') + ';">' +
                        '<svg viewBox="0 0 60 60" class="eac-score-svg">' +
                            '<circle cx="30" cy="30" r="24" fill="none" stroke="var(--color-border)" stroke-width="6"/>' +
                            '<circle cx="30" cy="30" r="24" fill="none" stroke="var(--score-color)" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ - (avgPct / 100) * circ) + '" transform="rotate(-90 30 30)"/>' +
                        '</svg>' +
                        '<div class="eac-score-pct">' + avgPct + '<span class="eac-pct-sym">%</span></div>' +
                        '<div class="eac-score-lbl">Avg</div>' +
                    '</div>' +
                    '<div class="eac-stats-trio">' +
                        '<div class="eac-stat-mini"><div class="val">' + exam.totalAttempts + '</div><div class="lbl">Attempts</div></div>' +
                        '<div class="eac-stat-mini"><div class="val" style="color:var(--color-success);">' + (hasAttempts ? exam.highestScore + '%' : '\u2014') + '</div><div class="lbl">Best</div></div>' +
                        '<div class="eac-stat-mini"><div class="val" style="color:' + (passRate >= 60 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + (hasAttempts ? passRate + '%' : '\u2014') + '</div><div class="lbl">Pass Rate</div></div>' +
                    '</div>' +
                '</div>' +
                '<div class="eac-action-row">' +
                    '<button class="btn btn-secondary btn-small eac-preview-btn" title="Preview this exam"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview</button>' +
                    '<button class="btn btn-secondary btn-small eac-analytics-btn" title="Per-question analytics"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Analytics</button>' +
                    '<button class="btn btn-secondary btn-small eac-edit-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>' +
                    '<button class="btn btn-danger btn-small eac-delete-btn">' + ICONS.trash + ' Delete</button>' +
                '</div>';

            var previewBtn = card.querySelector('.eac-preview-btn');
            if (previewBtn) previewBtn.addEventListener('click', function () { previewExam(exam.id); });

            var analyticsBtn = card.querySelector('.eac-analytics-btn');
            if (analyticsBtn) analyticsBtn.addEventListener('click', function () { openQuestionAnalytics(exam.id, exam.title); });

            var editBtn = card.querySelector('.eac-edit-btn');
            if (editBtn) editBtn.addEventListener('click', function () { openEditExam(exam.id); });

            var deleteBtn = card.querySelector('.eac-delete-btn');
            if (deleteBtn) {
                var eid = exam.id;
                var etitle = exam.title;
                deleteBtn.addEventListener('click', function () {
                    showCustomConfirm('Delete Exam', 'Permanently delete "' + etitle + '"? This will also remove all student results for this exam.', async function () {
                        var r = await apiRequest('teacher_delete_exam', { examId: eid });
                        if (r.status === 'success') { showToast('Exam deleted.', 'success'); loadTeacherDashboard(); }
                        else { alert(r.message || 'Failed to delete exam.'); }
                    });
                });
            }

            grid.appendChild(card);
        });
        analyticsDiv.appendChild(grid);
    }

    // ---- Attempts Review Table ----
    var reviewDiv = document.getElementById('teacherReviewTable');
    reviewDiv.innerHTML = '<h3 style="margin-bottom:1.25rem;font-size:1.1rem;font-weight:700;color:var(--color-text);display:flex;align-items:center;gap:0.6em;">' + ICONS.fileLg + ' All Student Attempts</h3>';
    var tableWrap = document.createElement('div');
    tableWrap.style.cssText = 'overflow:auto;max-height:55vh;border-radius:0.7rem;box-shadow:0 1px 3px rgba(0,0,0,0.07);';

    if (attemptsRes.status === 'success' && attemptsRes.attempts && attemptsRes.attempts.length > 0) {
        var tableHtml = '<table id="attemptsDataTable" style="width:100%;border-collapse:collapse;font-size:0.95rem;">' +
            '<thead><tr style="background:var(--glass-bg);color:var(--color-text);position:sticky;top:0;z-index:1;">' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Student</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Exam</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Score</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Correct</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Time</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Date</th>' +
            '</tr></thead><tbody>';
        attemptsRes.attempts.forEach(function (r) {
            tableHtml +=
                '<tr style="background:var(--glass-bg);color:var(--color-text);" data-search="' + (r.studentName + ' ' + r.examTitle).toLowerCase() + '">' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + r.studentName + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + r.examTitle + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);font-weight:700;color:' + (r.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + r.score + '%</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + r.correctAnswers + '/' + r.totalQuestions + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + formatTime(r.timeTaken) + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + (r.completedAt || '').split(' ')[0] + '</td>' +
                '</tr>';
        });
        tableHtml += '</tbody></table>';
        var table = document.createElement('table');
        table.id = 'attemptsDataTable';
        table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.95rem;';
        table.innerHTML = tableHtml;
        tableWrap.appendChild(table);
    } else {
        tableWrap.innerHTML = '<div style="color:var(--color-text-secondary);padding:1.2rem;">No attempts submitted yet.</div>';
    }
    reviewDiv.appendChild(tableWrap);

    // Live search for attempts
    var attemptSearchInput = document.getElementById('teacherAttemptSearch');
    if (attemptSearchInput) {
        var freshInput = attemptSearchInput.cloneNode(true);
        attemptSearchInput.parentNode.replaceChild(freshInput, attemptSearchInput);
        freshInput.value = '';
        freshInput.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            tableWrap.querySelectorAll('tbody tr[data-search]').forEach(function (row) {
                row.style.display = row.dataset.search.includes(q) ? '' : 'none';
            });
        });
    }

    // ---- Student Management Table ----
    var userMgmtDiv = document.getElementById('teacherUserMgmt');
    userMgmtDiv.innerHTML = '<h3 style="margin-bottom:1.25rem;font-size:1.1rem;font-weight:700;color:var(--color-text);display:flex;align-items:center;gap:0.6em;">' + ICONS.users + ' Student Accounts</h3>';
    var userTableWrap = document.createElement('div');
    userTableWrap.style.cssText = 'overflow:auto;max-height:55vh;border-radius:0.7rem;box-shadow:0 1px 3px rgba(0,0,0,0.07);';

    if (studentsRes.status === 'success' && studentsRes.students && studentsRes.students.length > 0) {
        var userTableHtml = '<table id="studentsDataTable" style="width:100%;border-collapse:collapse;font-size:0.95rem;">' +
            '<thead><tr style="background:var(--glass-bg);color:var(--color-text);">' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Name</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Email / Username</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Student ID</th>' +
                '<th style="padding:10px 12px;border:1px solid var(--color-border);font-weight:700;text-align:left;">Actions</th>' +
            '</tr></thead><tbody>';
        studentsRes.students.forEach(function (s) {
            userTableHtml +=
                '<tr style="background:var(--glass-bg);color:var(--color-text);" data-search="' + (s.name + ' ' + s.email + ' ' + s.userId).toLowerCase() + '">' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + s.name + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + s.email + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);">' + s.userId + '</td>' +
                    '<td style="padding:9px 12px;border:1px solid var(--color-border);white-space:nowrap;">' +
                        '<button class="btn btn-primary btn-small view-profile" data-id="' + s.id + '" data-name="' + s.name + '" style="margin-right:0.4rem;">View Profile</button>' +
                        '<button class="btn btn-secondary btn-small reset-pw" data-id="' + s.id + '" data-name="' + s.name + '" style="margin-right:0.4rem;">Reset Password</button>' +
                        '<button class="btn btn-danger btn-small remove-student" data-id="' + s.id + '">Remove</button>' +
                    '</td>' +
                '</tr>';
        });
        userTableHtml += '</tbody></table>';
        userTableWrap.innerHTML = userTableHtml;

        // Bind View Profile buttons
        userTableWrap.querySelectorAll('.view-profile').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openStudentProfile(parseInt(this.getAttribute('data-id')), this.getAttribute('data-name'));
            });
        });

        // Bind reset password buttons
        userTableWrap.querySelectorAll('.reset-pw').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var studentId   = parseInt(this.getAttribute('data-id'));
                var studentName = this.getAttribute('data-name');

                var modal    = document.getElementById('customResetPasswordModal');
                var form     = document.getElementById('resetPasswordForm');
                var input    = document.getElementById('newStudentPasswordInput');
                var closeBtn = document.getElementById('closeResetPasswordModal');
                var cancelBtn= document.getElementById('cancelResetPasswordBtn');
                var titleEl  = document.getElementById('resetPasswordTitle');

                titleEl.textContent = 'Reset Password \u2014 ' + studentName;
                input.value = '';
                modal.classList.remove('hidden');

                var newForm      = form.cloneNode(true);
                var newCloseBtn  = closeBtn.cloneNode(true);
                var newCancelBtn = cancelBtn.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

                newCloseBtn.addEventListener('click',  function () { modal.classList.add('hidden'); });
                newCancelBtn.addEventListener('click', function () { modal.classList.add('hidden'); });

                newForm.addEventListener('submit', async function (e) {
                    e.preventDefault();
                    var newPassword = newForm.querySelector('#newStudentPasswordInput').value;
                    if (newPassword.length < 6) { alert('Password must be at least 6 characters.'); return; }
                    var res = await apiRequest('teacher_reset_password', { studentId: studentId, newPassword: newPassword });
                    if (res.status === 'success') { alert('Password reset successfully.'); modal.classList.add('hidden'); }
                    else { alert(res.message || 'Failed to reset password.'); }
                });
            });
        });

        // Bind remove student buttons
        userTableWrap.querySelectorAll('.remove-student').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var sid = parseInt(this.getAttribute('data-id'));
                showCustomConfirm('Remove Student', 'Remove this student account? All their exam results will also be deleted.', async function () {
                    var r = await apiRequest('teacher_remove_student', { studentId: sid });
                    if (r.status === 'success') { loadTeacherDashboard(); }
                    else { alert(r.message || 'Failed to remove student.'); }
                });
            });
        });
    } else {
        userTableWrap.innerHTML = '<div style="color:var(--color-text-secondary);padding:1.2rem;">No student accounts registered yet.</div>';
    }
    userMgmtDiv.appendChild(userTableWrap);

    // Live search for students table
    var studentSearchInput = document.getElementById('teacherStudentSearch');
    if (studentSearchInput) {
        var freshSearch = studentSearchInput.cloneNode(true);
        studentSearchInput.parentNode.replaceChild(freshSearch, studentSearchInput);
        freshSearch.value = '';
        freshSearch.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            userTableWrap.querySelectorAll('tbody tr[data-search]').forEach(function (row) {
                row.style.display = row.dataset.search.includes(q) ? '' : 'none';
            });
        });
    }
}

// =========================================================================
// QUESTION ANALYTICS
// =========================================================================

async function openQuestionAnalytics(examId, examTitle) {
    var modal = document.getElementById('questionAnalyticsModal');
    var titleEl = document.getElementById('qaModalTitle');
    var body = document.getElementById('questionAnalyticsBody');
    var closeBtn = document.getElementById('closeQuestionAnalytics');

    if (titleEl) titleEl.textContent = 'Question Analytics \u2014 ' + (examTitle || 'Exam');
    if (body) body.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">Loading...</div>';
    if (modal) modal.classList.remove('hidden');

    if (closeBtn) {
        var newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', function () { modal.classList.add('hidden'); });
    }

    var res = await apiRequest('teacher_question_analytics', { examId: examId }, 'GET');
    // API returns 'analytics' array, not 'questions'
    if (res.status !== 'success' || !res.analytics) {
        if (body) body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Failed to load question analytics.</div>';
        return;
    }

    var analytics = res.analytics;
    if (analytics.length === 0) {
        if (body) body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">No questions found.</div>';
        return;
    }

    var letters = ['A','B','C','D'];
    var html = '';
    analytics.forEach(function (q, idx) {
        var pct = q.pctCorrect || 0;
        var barColor = pct >= 75 ? '#2ecc71' : pct >= 50 ? '#f59e0b' : '#e74c3c';
        var needsReview = q.needsReview;
        var maxDist = Math.max.apply(null, q.distribution.concat([1]));

        html += '<div class="qa-question-card' + (needsReview ? ' needs-review' : '') + '">';
        html += '<div class="qa-q-header">';
        html += '<span class="qa-q-num">Q' + (idx + 1) + '</span>';
        html += '<span class="qa-q-text">' + escapeHtmlNotif(q.question) + '</span>';
        if (needsReview) html += '<span class="qa-review-flag">\u26a0 Needs Review</span>';
        html += '</div>';
        html += '<div class="qa-stats-row">';
        // Percentage circle
        html += '<div class="qa-pct-circle" style="--pct-color:' + barColor + ';">';
        var circ = 2 * Math.PI * 16;
        html += '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-border)" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="var(--pct-color)" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ - (pct / 100) * circ) + '" transform="rotate(-90 20 20)"/></svg>';
        html += '<div class="qa-pct-val">' + pct + '%</div>';
        html += '</div>';
        // Distribution bars
        html += '<div class="qa-dist-bars">';
        q.distribution.forEach(function (count, i) {
            var heightPct = (count / maxDist) * 100;
            var isCorrect = i === q.correctAnswer;
            html += '<div class="qa-dist-bar' + (isCorrect ? ' is-correct' : '') + '">';
            html += '<div class="qa-dist-fill" style="height:' + heightPct + '%;background:' + (isCorrect ? '#2ecc71' : '#94a3b8') + ';"></div>';
            html += '<div class="qa-dist-letter">' + letters[i] + '</div>';
            html += '<div class="qa-dist-count">' + count + '</div>';
            html += '</div>';
        });
        html += '</div>';
        // Meta info
        html += '<div class="qa-meta">';
        html += '<div class="qa-meta-row"><span class="qa-meta-lbl">Attempts:</span> <b>' + q.totalAttempts + '</b></div>';
        html += '<div class="qa-meta-row"><span class="qa-meta-lbl">Correct:</span> <b style="color:#2ecc71;">' + q.correctCount + '</b></div>';
        html += '<div class="qa-meta-row"><span class="qa-meta-lbl">Unanswered:</span> <b>' + q.unanswered + '</b></div>';
        if (q.mostCommonWrong) {
            html += '<div class="qa-meta-row"><span class="qa-meta-lbl">Common wrong:</span> <b style="color:#e74c3c;">' + letters[q.mostCommonWrong.index] + ' (' + q.mostCommonWrong.count + '\u00d7)</b></div>';
        }
        html += '</div>';
        html += '</div>'; // close qa-stats-row
        html += '</div>'; // close qa-question-card
    });

    if (body) body.innerHTML = html;
}

// =========================================================================
// OPEN EDIT EXAM
// =========================================================================

async function openEditExam(examId) {
    var res = await apiRequest('get_exam', { examId: examId }, 'GET');
    if (res.status !== 'success' || !res.exam) {
        alert(res.message || 'Failed to load exam for editing.');
        return;
    }

    var exam = res.exam;
    var modal = document.getElementById('createExamModal');
    var form = document.getElementById('createExamForm');
    var questionsContainer = document.getElementById('questionsContainer');
    var submitBtn = form.querySelector('[type="submit"]');

    // Set form title to Edit mode
    var modalTitle = document.getElementById('createExamTitle');
    var submitText = document.getElementById('createExamSubmitText');
    if (modalTitle) modalTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Exam';
    if (submitText) submitText.textContent = 'Update Exam';

    // Populate fields
    document.getElementById('examTitleInput').value = exam.title || '';
    document.getElementById('examSubject').value = exam.subject || '';
    document.getElementById('examDuration').value = exam.duration || '30';
    document.getElementById('examDifficulty').value = exam.difficulty || 'Medium';
    document.getElementById('examPassMark').value = exam.passMark || '60';
    document.getElementById('optShuffle').checked = !!exam.shuffleQuestions;
    document.getElementById('optShuffleOptions').checked = !!exam.shuffleOptions;
    document.getElementById('optShowCorrect').checked = exam.showCorrectAnswers !== 0;
    document.getElementById('optAllowReview').checked = !!exam.allowReReview;
    document.getElementById('optAttempts').value = exam.maxAttempts || '1';
    document.getElementById('examCategory').value = exam.category || '';
    document.getElementById('examAvailableFrom').value = exam.availableFrom ? exam.availableFrom.replace(' ', 'T').substring(0, 16) : '';
    document.getElementById('examAvailableUntil').value = exam.availableUntil ? exam.availableUntil.replace(' ', 'T').substring(0, 16) : '';
    document.getElementById('examAccessPassword').value = '';

    // Populate questions
    questionsContainer.innerHTML = '';
    if (exam.questions) {
        exam.questions.forEach(function (q) {
            var block = document.createElement('div');
            block.className = 'question-block';
            var uid = 'edit_' + q.id + '_' + Date.now();
            block.innerHTML =
                '<div class="question-block-header">' +
                    '<span class="question-block-num">Question</span>' +
                    '<button type="button" class="btn btn-danger btn-small remove-question" style="padding:0.2rem 0.65rem;font-size:0.78rem;">' +
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:3px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg> Remove' +
                    '</button>' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0.6rem;">' +
                    '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Question Text</label>' +
                    '<input type="text" class="form-input question-input" required placeholder="Enter your question here\u2026" value="' + escapeHtmlNotif(q.question) + '">' +
                '</div>' +
                '<div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.7rem;">' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">A</span><input type="text" class="form-input option-input" placeholder="Option A" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.option1 || (q.options && q.options[0]) || '') + '"></div>' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">B</span><input type="text" class="form-input option-input" placeholder="Option B" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.option2 || (q.options && q.options[1]) || '') + '"></div>' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">C</span><input type="text" class="form-input option-input" placeholder="Option C" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.option3 || (q.options && q.options[2]) || '') + '"></div>' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">D</span><input type="text" class="form-input option-input" placeholder="Option D" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.option4 || (q.options && q.options[3]) || '') + '"></div>' +
                '</div>' +
                '<div class="correct-answer-row">' +
                    '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Correct Answer:</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="0" ' + ((q.correctAnswer === 0 || q.correctAnswer === '0') ? 'checked' : '') + '> A</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="1" ' + (q.correctAnswer == 1 ? 'checked' : '') + '> B</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="2" ' + (q.correctAnswer == 2 ? 'checked' : '') + '> C</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="3" ' + (q.correctAnswer == 3 ? 'checked' : '') + '> D</label>' +
                    '<div class="question-points-input" style="margin-left:auto;"><label>Points:</label><input type="number" class="form-input points-input" min="1" max="100" value="' + (q.points || 1) + '" style="width:58px;padding:0.3rem 0.5rem;font-size:0.85rem;"></div>' +
                '</div>';

            block.querySelector('.remove-question').addEventListener('click', function () {
                block.remove();
                questionsContainer.querySelectorAll('.question-block-num').forEach(function (el, i) { el.textContent = 'Question ' + (i + 1); });
            });
            questionsContainer.appendChild(block);
        });
    }

    modal.classList.remove('hidden');

    // Override form submit for edit mode
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var title      = newForm.querySelector('#examTitleInput').value.trim();
        var duration   = parseInt(newForm.querySelector('#examDuration').value);
        var subject    = newForm.querySelector('#examSubject').value.trim();
        var difficulty = newForm.querySelector('#examDifficulty').value || 'Medium';
        var questions  = [];
        var formError  = null;

        newForm.querySelectorAll('.question-block').forEach(function (block, bi) {
            if (formError) return;
            var qText  = block.querySelector('.question-input').value.trim();
            var opts   = Array.from(block.querySelectorAll('.option-input')).map(function (i) { return i.value.trim(); });
            var radioSel = block.querySelector('input[type="radio"]:checked');
            var correct  = radioSel ? parseInt(radioSel.value) : 0;
            var ptsEl    = block.querySelector('.points-input');
            var pts      = ptsEl ? Math.max(1, parseInt(ptsEl.value) || 1) : 1;

            if (!qText) { formError = 'Question ' + (bi + 1) + ': question text is empty.'; return; }
            if (opts.some(function (o) { return !o; })) { formError = 'Question ' + (bi + 1) + ': all 4 options are required.'; return; }
            questions.push({ question: qText, options: opts, correctAnswer: correct, points: pts });
        });

        if (formError) { alert(formError); return; }
        if (!title || !subject || duration <= 0 || questions.length === 0) {
            alert('Please fill in all exam details and add at least one question.');
            return;
        }

        var payload = {
            examId: examId, title: title, subject: subject, difficulty: difficulty, duration: duration, questions: questions,
            passMark:         parseInt(newForm.querySelector('#examPassMark').value || '60'),
            shuffleQuestions: newForm.querySelector('#optShuffle').checked || false,
            shuffleOptions:   newForm.querySelector('#optShuffleOptions').checked || false,
            showCorrectAnswers: newForm.querySelector('#optShowCorrect').checked !== false,
            allowReReview:    newForm.querySelector('#optAllowReview').checked || false,
            maxAttempts:      parseInt(newForm.querySelector('#optAttempts').value || '1'),
            accessPassword:   newForm.querySelector('#examAccessPassword').value || '',
            availableFrom:    newForm.querySelector('#examAvailableFrom').value || '',
            availableUntil:   newForm.querySelector('#examAvailableUntil').value || '',
            category:         newForm.querySelector('#examCategory').value || ''
        };

        var res = await apiRequest('teacher_edit_exam', payload);
        if (res.status === 'success') {
            modal.classList.add('hidden');
            showToast('Exam updated successfully!', 'success');
            loadTeacherDashboard();
        } else {
            alert(res.message || 'Failed to update exam.');
        }
    });
}

// =========================================================================
// PREVIEW EXAM
// =========================================================================

async function previewExam(examId) {
    var res = await apiRequest('practice_exam', { examId: examId }, 'GET');
    if (res.status !== 'success' || !res.exam) {
        alert(res.message || 'Failed to load exam preview.');
        return;
    }

    currentExam = res.exam;
    currentExam.questions = res.questions || [];
    currentExam._isPreview = true;
    var total = currentExam.questions.length;
    currentExamAnswers = Array(total).fill(null);
    currentExamFlags   = Array(total).fill(false);
    currentExamIndex   = 0;
    currentExamStartTime = Date.now();

    document.getElementById('candidateName').textContent    = 'Preview Mode';
    document.getElementById('candidateId').textContent      = 'Teacher';
    document.getElementById('examSubjectName').textContent  = currentExam.subject;
    document.getElementById('examTitle').textContent        = currentExam.title + ' (Preview)';

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('examInterface').classList.remove('hidden');
    var navbar = document.querySelector('.navbar');
    var footer = document.querySelector('.site-footer');
    if (navbar) navbar.classList.add('hidden');
    if (footer) footer.classList.add('hidden');
    document.body.style.overflow = 'hidden';

    // No timer or protection for preview
    var tc = document.getElementById('examTimerContainer');
    if (tc) {
        tc.classList.add('practice-hidden');
        tc.innerHTML = '<span class="practice-label" style="color:var(--color-warning);font-weight:700;font-size:0.95rem;">\ud83d\udc40 Preview Mode (no timer)</span>';
    }

    // Add a "Back to Dashboard" button (preview only) — fixed in top-right corner
    var existingBackBtn = document.getElementById('previewBackBtn');
    if (existingBackBtn) existingBackBtn.remove();
    var backBtn = document.createElement('button');
    backBtn.id = 'previewBackBtn';
    backBtn.className = 'preview-back-btn';
    backBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Exit Preview';
    backBtn.addEventListener('click', function () {
        if (confirm('Exit preview mode? No answers will be saved.')) {
            currentExam = null;
            document.getElementById('examInterface').classList.add('hidden');
            document.getElementById('examTimerContainer')?.classList.remove('practice-hidden');
            document.body.style.overflow = '';
            backBtn.remove();
            dashboard.classList.remove('hidden');
            loadTeacherDashboard();
        }
    });
    document.body.appendChild(backBtn);

    renderQuestion();
    renderQuestionsGrid();
}

// =========================================================================
// QUESTION BANK (Teacher) — Ported from v15 with full option display
// =========================================================================

async function loadTeacherBank() {
    var container = document.getElementById('teacherBankContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading question bank…</div>';

    var res = await apiRequest('teacher_get_bank', {}, 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">' + (res.message || 'Failed to load question bank.') + '</div>';
        return;
    }

    var questions = res.questions || [];
    var subjects  = res.subjects  || [];
    var total     = res.totalCount || questions.length;

    // Toolbar
    container.innerHTML =
        '<div class="bank-toolbar">' +
            '<div class="bank-search-wrap">' +
                '<svg class="bank-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" id="bankSearchInput" class="form-input bank-search-input" placeholder="Search questions…" autocomplete="off">' +
            '</div>' +
            '<select id="bankSubjectFilter" class="form-input form-select bank-subject-filter">' +
                '<option value="">All Subjects</option>' +
                subjects.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
            '</select>' +
            '<div class="bank-stats-pill">' + total + ' question' + (total === 1 ? '' : 's') + ' in bank</div>' +
            '<button id="bankAddNewBtn" class="btn btn-primary bank-add-btn">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                'Add Question' +
            '</button>' +
        '</div>' +
        '<div class="bank-list-wrap" id="bankListWrap"></div>' +
        '<div id="bankAddFormContainer"></div>';

    renderBankList(questions);

    // Live search + subject filter
    var searchDebounce = null;
    document.getElementById('bankSearchInput').addEventListener('input', function () {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(refetchBank, 250);
    });
    document.getElementById('bankSubjectFilter').addEventListener('change', refetchBank);
    document.getElementById('bankAddNewBtn').addEventListener('click', function () { openBankAddFormV2(); });
}

function renderBankList(qs) {
    var listWrap = document.getElementById('bankListWrap');
    if (!listWrap) return;
    listWrap.innerHTML = '';
    if (!qs || qs.length === 0) {
        listWrap.innerHTML =
            '<div class="bank-empty-state">' +
                '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>' +
                '<div class="bank-empty-title">No questions match your filters</div>' +
                '<div class="bank-empty-desc">Try a different search term or subject, or add a new question to the bank.</div>' +
            '</div>';
        return;
    }
    var letters = ['A','B','C','D'];
    qs.forEach(function (q) {
        var row = document.createElement('div');
        row.className = 'bank-question-row';
        var diffColor = { Easy: 'var(--color-success)', Medium: '#f59e0b', Hard: 'var(--color-danger)' }[q.difficulty] || 'var(--color-primary)';
        row.innerHTML =
            '<div class="bqr-main">' +
                '<div class="bqr-question">' + escapeHtmlNotif(q.question) + '</div>' +
                '<div class="bqr-meta">' +
                    '<span class="bqr-chip bqr-chip-subject">' + escapeHtmlNotif(q.subject || '—') + '</span>' +
                    '<span class="bqr-chip" style="color:' + diffColor + ';background:' + diffColor + '18;">' + escapeHtmlNotif(q.difficulty || 'Medium') + '</span>' +
                    '<span class="bqr-chip bqr-chip-correct">Correct: ' + (letters[q.correctAnswer] || '—') + '</span>' +
                    '<span class="bqr-chip bqr-chip-usage">Used ' + (q.usageCount || 0) + '\u00d7</span>' +
                '</div>' +
                '<div class="bqr-options">' +
                    [0,1,2,3].map(function (i) {
                        return '<div class="bqr-option ' + (i === q.correctAnswer ? 'is-correct' : '') + '">' +
                            '<span class="bqr-opt-letter">' + letters[i] + '</span>' +
                            '<span class="bqr-opt-text">' + escapeHtmlNotif(q['option' + (i+1)]) + '</span>' +
                            (i === q.correctAnswer ? '<span class="bqr-opt-check">\u2713</span>' : '') +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>' +
            '<div class="bqr-actions">' +
                '<button class="btn btn-secondary btn-small bqr-use-btn" data-id="' + q.id + '">Use in Exam</button>' +
                '<button class="btn btn-danger btn-small bqr-delete-btn" data-id="' + q.id + '" data-q="' + escapeHtmlNotif(q.question.substring(0, 60)) + '">Delete</button>' +
            '</div>';

        // Wire delete
        row.querySelector('.bqr-delete-btn').addEventListener('click', function () {
            var qid = parseInt(this.getAttribute('data-id'));
            var preview = this.getAttribute('data-q');
            showCustomConfirm('Delete Question', 'Delete this question from the bank?\n\n"' + preview + '…"', async function () {
                var r = await apiRequest('teacher_delete_from_bank', { questionId: qid });
                if (r.status === 'success') { showToast('Question deleted.', 'success'); refetchBank(); }
                else { alert(r.message || 'Failed to delete.'); }
            });
        });

        // Wire "Use in Exam"
        row.querySelector('.bqr-use-btn').addEventListener('click', async function () {
            var qid = parseInt(this.getAttribute('data-id'));
            var r = await apiRequest('teacher_import_from_bank', { questionIds: [qid] });
            if (r.status !== 'success') { alert(r.message || 'Import failed.'); return; }
            var ceb = document.getElementById('createExamBtn');
            if (ceb) ceb.click();
            setTimeout(function () {
                var qc = document.getElementById('questionsContainer');
                if (qc) qc.innerHTML = '';
                if (typeof updateQuestionCount === 'function') updateQuestionCount();
                r.questions.forEach(function (q) {
                    if (typeof addQuestionBlock === 'function') {
                        addQuestionBlock();
                        var block = qc.lastElementChild;
                        block.querySelector('.question-input').value = q.question;
                        var opts = block.querySelectorAll('.option-input');
                        q.options.forEach(function (o, i) { if (opts[i]) opts[i].value = o; });
                        var radio = block.querySelector('input[type="radio"][value="' + q.correctAnswer + '"]');
                        if (radio) radio.checked = true;
                    }
                });
                if (typeof updateQuestionCount === 'function') updateQuestionCount();
                showToast('Question loaded into new exam.', 'success');
            }, 150);
        });

        listWrap.appendChild(row);
    });
}

async function refetchBank() {
    var search  = document.getElementById('bankSearchInput') ? document.getElementById('bankSearchInput').value.trim() : '';
    var subject = document.getElementById('bankSubjectFilter') ? document.getElementById('bankSubjectFilter').value : '';
    var listWrap = document.getElementById('bankListWrap');
    if (listWrap) listWrap.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">Filtering…</div>';
    var res = await apiRequest('teacher_get_bank', { search: search, subject: subject }, 'GET');
    if (res.status === 'success') {
        // Update subject filter
        var sel = document.getElementById('bankSubjectFilter');
        if (sel && res.subjects) {
            var cur = sel.value;
            sel.innerHTML = '<option value="">All Subjects</option>';
            res.subjects.forEach(function (s) { var o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
            sel.value = cur;
        }
        renderBankList(res.questions || []);
    } else {
        if (listWrap) listWrap.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Filter failed.</div>';
    }
}

function openBankAddFormV2() {
    var container = document.getElementById('bankAddFormContainer');
    if (!container) return;
    container.innerHTML =
        '<div class="bank-add-form-overlay">' +
            '<div class="bank-add-form-card">' +
                '<div class="bank-add-header">' +
                    '<h3>Add Question to Bank</h3>' +
                    '<button type="button" class="bank-add-close-btn">\u00d7</button>' +
                '</div>' +
                '<form id="bankAddFormV2" style="padding:1.2rem;">' +
                    '<div class="form-group">' +
                        '<label>Question Text <span class="req">*</span></label>' +
                        '<textarea id="bankNewQuestion" class="form-input" rows="2" required placeholder="Enter the question…"></textarea>' +
                    '</div>' +
                    '<div class="bank-add-grid">' +
                        '<div class="form-group"><label>A <span class="req">*</span></label><input type="text" id="bankNewOptA" class="form-input" required></div>' +
                        '<div class="form-group"><label>B <span class="req">*</span></label><input type="text" id="bankNewOptB" class="form-input" required></div>' +
                        '<div class="form-group"><label>C <span class="req">*</span></label><input type="text" id="bankNewOptC" class="form-input" required></div>' +
                        '<div class="form-group"><label>D <span class="req">*</span></label><input type="text" id="bankNewOptD" class="form-input" required></div>' +
                    '</div>' +
                    '<div style="display:flex;gap:0.6rem;margin-bottom:1rem;flex-wrap:wrap;">' +
                        '<div class="form-group" style="flex:1;"><label>Correct Answer</label><select id="bankNewCorrect" class="form-input form-select"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>' +
                        '<div class="form-group" style="flex:1;"><label>Subject</label><input type="text" id="bankNewSubject" class="form-input" placeholder="e.g. Java OOP"></div>' +
                        '<div class="form-group" style="flex:1;"><label>Difficulty</label><select id="bankNewDifficulty" class="form-input form-select"><option value="Easy">Easy</option><option value="Medium" selected>Medium</option><option value="Hard">Hard</option></select></div>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:flex-end;gap:0.5rem;padding-top:0.5rem;border-top:1px solid var(--color-border);">' +
                        '<button type="button" class="btn btn-secondary bank-add-cancel-btn">Cancel</button>' +
                        '<button type="submit" class="btn btn-success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><polyline points="20 6 9 17 4 12"/></svg>Save to Bank</button>' +
                    '</div>' +
                '</form>' +
            '</div>' +
        '</div>';
    document.body.appendChild(container.firstChild); // Move overlay to body

    var overlay = document.querySelector('.bank-add-form-overlay');
    if (!overlay) return;
    var close = function () { overlay.remove(); };
    overlay.querySelector('.bank-add-close-btn').addEventListener('click', close);
    overlay.querySelector('.bank-add-cancel-btn').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    overlay.querySelector('#bankAddFormV2').addEventListener('submit', async function (e) {
        e.preventDefault();
        var question = overlay.querySelector('#bankNewQuestion').value.trim();
        var options = [
            overlay.querySelector('#bankNewOptA').value.trim(),
            overlay.querySelector('#bankNewOptB').value.trim(),
            overlay.querySelector('#bankNewOptC').value.trim(),
            overlay.querySelector('#bankNewOptD').value.trim()
        ];
        var correctAnswer = parseInt(overlay.querySelector('#bankNewCorrect').value);
        var subject = overlay.querySelector('#bankNewSubject').value.trim();
        var difficulty = overlay.querySelector('#bankNewDifficulty').value;
        if (!question || options.some(function (o) { return !o; })) {
            alert('Question text and all 4 options are required.');
            return;
        }
        var r = await apiRequest('teacher_add_to_bank', { question: question, options: options, correctAnswer: correctAnswer, subject: subject, difficulty: difficulty });
        if (r.status === 'success') {
            showToast('Question added to bank!', 'success');
            close();
            refetchBank();
        } else {
            alert(r.message || 'Failed to add question.');
        }
    });
}

// =========================================================================
// CLASS GROUPS (Teacher)
// =========================================================================

async function loadTeacherGroups() {
    var container = document.getElementById('teacherGroupsContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--color-text-secondary);">Loading groups...</div>';

    var groupsRes = await apiRequest('teacher_list_groups', {}, 'GET');
    // Also fetch all students + all exams for the dropdowns
    var studentsRes = await apiRequest('teacher_students', {}, 'GET');
    var examsRes = await apiRequest('teacher_analytics', {}, 'GET');

    var allStudents = (studentsRes.status === 'success' && studentsRes.students) ? studentsRes.students : [];
    var allExams = (examsRes.status === 'success' && examsRes.analytics) ? examsRes.analytics : [];

    container.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
            '<h3 style="font-size:1.1rem;font-weight:700;margin:0;">Class Groups</h3>' +
            '<button id="createGroupBtn" class="btn btn-primary btn-small"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Group</button>' +
        '</div>' +
        '<div id="groupListContainer"></div>';

    document.getElementById('createGroupBtn').addEventListener('click', function () {
        var modal = document.getElementById('createGroupModal');
        var input = document.getElementById('groupNameInput');
        var confirmBtn = document.getElementById('confirmGroupCreate');
        var cancelBtn = document.getElementById('cancelGroupCreate');
        var closeBtn = document.getElementById('closeGroupModal');

        input.value = '';
        modal.classList.remove('hidden');

        var newConfirm = confirmBtn.cloneNode(true);
        var newCancel = cancelBtn.cloneNode(true);
        var newClose = closeBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);

        var close = function () { modal.classList.add('hidden'); };
        newCancel.addEventListener('click', close);
        newClose.addEventListener('click', close);
        newConfirm.addEventListener('click', async function () {
            var name = input.value.trim();
            if (!name) { alert('Group name is required.'); return; }
            var r = await apiRequest('teacher_create_group', { name: name });
            if (r.status === 'success') { close(); showToast('Group created!', 'success'); loadTeacherGroups(); }
            else { alert(r.message || 'Failed to create group.'); }
        });
    });

    var listContainer = document.getElementById('groupListContainer');
    if (groupsRes.status !== 'success' || !groupsRes.groups || groupsRes.groups.length === 0) {
        listContainer.innerHTML =
            '<div class="analytics-empty-state" style="padding:2.5rem 1.5rem;text-align:center;">' +
                '<div style="font-size:1rem;font-weight:700;color:var(--color-text);margin-bottom:0.3rem;">No groups created yet</div>' +
                '<div style="font-size:0.85rem;color:var(--color-text-secondary);">Create a group to organise students and restrict exam access.</div>' +
            '</div>';
        return;
    }

    listContainer.innerHTML = '';
    var groupsGrid = document.createElement('div');
    groupsGrid.className = 'groups-grid';

    groupsRes.groups.forEach(function (group) {
        var card = document.createElement('div');
        card.className = 'group-card';

        // Build member chips with remove buttons
        var membersHtml = '';
        if (group.members && group.members.length > 0) {
            group.members.forEach(function (m) {
                membersHtml += '<span class="group-member-chip">' +
                    escapeHtmlNotif(m.name) +
                    '<button class="group-remove-member" data-group-id="' + group.id + '" data-student-id="' + m.id + '" title="Remove">\u00d7</button>' +
                '</span>';
            });
        } else {
            membersHtml = '<span style="color:var(--color-text-secondary);font-size:0.8rem;">No members yet</span>';
        }

        // Build assigned exam chips
        var examsHtml = '';
        if (group.exams && group.exams.length > 0) {
            group.exams.forEach(function (e) {
                examsHtml += '<span class="exam-chip">' + escapeHtmlNotif(e.title) + '</span>';
            });
        } else {
            examsHtml = '<span style="color:var(--color-text-secondary);font-size:0.8rem;">No exams assigned</span>';
        }

        // Build "Add member" dropdown from allStudents
        var addMemberOpts = allStudents.filter(function (s) {
            return !group.members || !group.members.find(function (m) { return m.id === s.id; });
        }).map(function (s) {
            return '<option value="' + s.id + '">' + escapeHtmlNotif(s.name) + ' (' + escapeHtmlNotif(s.email) + ')</option>';
        }).join('');

        // Build "Assign exam" dropdown from allExams
        var assignExamOpts = allExams.filter(function (e) {
            return !group.exams || !group.exams.find(function (ae) { return ae.id === e.id; });
        }).map(function (e) {
            return '<option value="' + e.id + '">' + escapeHtmlNotif(e.title) + '</option>';
        }).join('');

        card.innerHTML =
            '<div class="group-card-header">' +
                '<span class="group-card-name">' + escapeHtmlNotif(group.name) + '</span>' +
                '<span class="group-member-count">' + (group.members ? group.members.length : 0) + ' members</span>' +
            '</div>' +
            '<div class="group-card-section">' +
                '<div class="group-section-label">Members</div>' +
                '<div class="group-member-chips">' + membersHtml + '</div>' +
            '</div>' +
            '<div class="group-card-section">' +
                '<div class="group-section-label">Assigned Exams</div>' +
                '<div class="group-exam-chips">' + examsHtml + '</div>' +
            '</div>' +
            '<div class="group-card-actions">' +
                '<select class="form-input form-select group-add-select" data-group-id="' + group.id + '" style="flex:1;font-size:0.82rem;padding:0.35rem 0.5rem;">' +
                    '<option value="">+ Add student...</option>' +
                    addMemberOpts +
                '</select>' +
                '<select class="form-input form-select group-assign-select" data-group-id="' + group.id + '" style="flex:1;font-size:0.82rem;padding:0.35rem 0.5rem;">' +
                    '<option value="">+ Assign exam...</option>' +
                    assignExamOpts +
                '</select>' +
                '<button class="btn btn-danger btn-small group-delete-btn" data-id="' + group.id + '" title="Delete group">Delete</button>' +
            '</div>';

        // Delete group
        card.querySelector('.group-delete-btn').addEventListener('click', async function () {
            var gid = parseInt(this.getAttribute('data-id'));
            showCustomConfirm('Delete Group', 'Delete this group? Members will not be affected.', async function () {
                var r = await apiRequest('teacher_delete_group', { groupId: gid });
                if (r.status === 'success') { showToast('Group deleted.', 'success'); loadTeacherGroups(); }
                else { alert(r.message || 'Failed to delete group.'); }
            });
        });

        // Add member via dropdown
        var addSelect = card.querySelector('.group-add-select');
        if (addSelect) {
            addSelect.addEventListener('change', async function () {
                var gid = parseInt(this.getAttribute('data-group-id'));
                var sid = parseInt(this.value);
                if (!sid) return;
                var r = await apiRequest('teacher_group_member', { groupId: gid, studentId: sid, action2: 'add' });
                if (r.status === 'success') { showToast('Member added.', 'success'); loadTeacherGroups(); }
                else { alert(r.message || 'Failed to add member.'); }
            });
        }

        // Assign exam via dropdown
        var assignSelect = card.querySelector('.group-assign-select');
        if (assignSelect) {
            assignSelect.addEventListener('change', async function () {
                var gid = parseInt(this.getAttribute('data-group-id'));
                var eid = parseInt(this.value);
                if (!eid) return;
                var r = await apiRequest('teacher_assign_exam_group', { groupId: gid, examId: eid, assign: true });
                if (r.status === 'success') { showToast('Exam assigned.', 'success'); loadTeacherGroups(); }
                else { alert(r.message || 'Failed to assign exam.'); }
            });
        }

        // Remove member via chip ×
        card.querySelectorAll('.group-remove-member').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var gid = parseInt(this.getAttribute('data-group-id'));
                var sid = parseInt(this.getAttribute('data-student-id'));
                var r = await apiRequest('teacher_group_member', { groupId: gid, studentId: sid, action2: 'remove' });
                if (r.status === 'success') { showToast('Member removed.', 'success'); loadTeacherGroups(); }
                else { alert(r.message || 'Failed to remove member.'); }
            });
        });

        groupsGrid.appendChild(card);
    });
    listContainer.appendChild(groupsGrid);
}

// =========================================================================
// STUDENT PROFILE (Teacher view)
// =========================================================================

async function openStudentProfile(studentId, studentName) {
    var modal = document.getElementById('studentProfileModal');
    var body = document.getElementById('studentProfileBody');
    var closeBtn = document.getElementById('closeStudentProfile');

    body.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">Loading profile...</div>';
    modal.classList.remove('hidden');

    var newClose = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newClose, closeBtn);
    newClose.addEventListener('click', function () { modal.classList.add('hidden'); });

    var res = await apiRequest('teacher_student_profile', { studentId: studentId }, 'GET');
    if (res.status !== 'success' || !res.student) {
        body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Failed to load student profile.</div>';
        return;
    }

    var s = res.student;
    var stats = s.stats || {};
    var html =
        '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">' +
            '<div style="width:50px;height:50px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;">' + (s.name || '?').substring(0, 2).toUpperCase() + '</div>' +
            '<div><div style="font-weight:700;font-size:1.1rem;">' + escapeHtmlNotif(s.name) + '</div>' +
            '<div style="font-size:0.85rem;color:var(--color-text-secondary);">' + (s.email || '') + ' \u2022 ID: ' + (s.userId || '') + '</div></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:1.25rem;">' +
            '<div class="perf-stat-card" style="padding:0.6rem;"><div class="perf-stat-num" style="font-size:1.2rem;">' + (stats.totalAttempts || 0) + '</div><div class="perf-stat-lbl">Attempts</div></div>' +
            '<div class="perf-stat-card" style="padding:0.6rem;"><div class="perf-stat-num" style="font-size:1.2rem;">' + (stats.averageScore || 0) + '%</div><div class="perf-stat-lbl">Avg</div></div>' +
            '<div class="perf-stat-card" style="padding:0.6rem;"><div class="perf-stat-num" style="font-size:1.2rem;">' + (stats.bestScore || 0) + '%</div><div class="perf-stat-lbl">Best</div></div>' +
            '<div class="perf-stat-card" style="padding:0.6rem;"><div class="perf-stat-num" style="font-size:1.2rem;">' + (stats.passRate || 0) + '%</div><div class="perf-stat-lbl">Pass Rate</div></div>' +
        '</div>';

    // Subject breakdown
    if (s.subjectStats && s.subjectStats.length > 0) {
        html += '<div style="margin-bottom:1.25rem;"><div style="font-size:0.85rem;font-weight:700;color:var(--color-text-secondary);margin-bottom:0.5rem;">Performance by Subject</div>';
        s.subjectStats.forEach(function (sub) {
            var avg = sub.avgScore || 0;
            var barColor = avg >= 75 ? 'var(--color-success)' : avg >= 50 ? '#f59e0b' : 'var(--color-danger)';
            html += '<div class="subject-bar-row" style="margin-bottom:0.3rem;"><div class="subject-bar-name" style="font-size:0.8rem;min-width:100px;">' + sub.subject + '</div><div class="subject-bar-track" style="height:5px;"><div class="subject-bar-fill" style="width:' + avg + '%;background:' + barColor + ';height:5px;"></div></div><div class="subject-bar-pct" style="font-size:0.8rem;">' + avg + '%</div></div>';
        });
        html += '</div>';
    }

    // Badges
    if (s.badges && s.badges.length > 0) {
        html += '<div style="margin-bottom:1.25rem;"><div style="font-size:0.85rem;font-weight:700;color:var(--color-text-secondary);margin-bottom:0.4rem;">Badges</div><div style="display:flex;gap:0.4rem;flex-wrap:wrap;">';
        s.badges.forEach(function (b) {
            html += '<span style="padding:0.25rem 0.6rem;border-radius:0.35rem;background:rgba(87,120,90,0.1);font-size:0.8rem;">' + (b.icon || '\ud83c\udfc6') + ' ' + (b.label || b.type) + '</span>';
        });
        html += '</div></div>';
    }

    // Attempt history table
    if (s.attempts && s.attempts.length > 0) {
        html += '<div style="font-size:0.85rem;font-weight:700;color:var(--color-text-secondary);margin-bottom:0.5rem;">Attempt History</div>';
        html += '<div style="overflow:auto;max-height:280px;border-radius:0.5rem;border:1px solid var(--color-border);">';
        html += '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">';
        html += '<thead><tr style="background:var(--glass-bg);"><th style="padding:6px 8px;text-align:left;">Exam</th><th style="padding:6px 8px;text-align:left;">Score</th><th style="padding:6px 8px;text-align:left;">Date</th></tr></thead><tbody>';
        s.attempts.forEach(function (a) {
            html += '<tr style="background:var(--glass-bg);border-top:1px solid var(--color-border);">' +
                '<td style="padding:6px 8px;">' + escapeHtmlNotif(a.examTitle) + '</td>' +
                '<td style="padding:6px 8px;font-weight:700;color:' + (a.score >= 60 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + a.score + '%</td>' +
                '<td style="padding:6px 8px;">' + (a.completedAt || '').split(' ')[0] + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
    }

    body.innerHTML = html;
}

// =========================================================================
// DEBOUNCE UTILITY
// =========================================================================

function debounce(fn, delay) {
    var timer = null;
    return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(context, args); }, delay);
    };
}

// =========================================================================
// ACCESS CODES — Display exam access codes for teacher reference
// =========================================================================

async function loadAccessCodes() {
    var container = document.getElementById('teacherCodesContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Loading access codes…</div>';

    var res = await apiRequest('teacher_analytics', {}, 'GET');
    if (res.status !== 'success' || !res.analytics) {
        container.innerHTML = '<div style="padding:1.5rem;color:var(--color-danger);">Failed to load exams.</div>';
        return;
    }

    var exams = res.analytics;
    if (exams.length === 0) {
        container.innerHTML =
            '<div class="analytics-empty-state">' +
                '<div class="aems-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>' +
                '<div class="aems-title">No exams created yet</div>' +
                '<div class="aems-desc">Create an exam with an access code to see it listed here.</div>' +
            '</div>';
        return;
    }

    // Build the access codes list — use hasAccessCode from analytics response
    container.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
            '<h3 style="font-size:1.1rem;font-weight:700;margin:0;">Exam Access Codes</h3>' +
            '<span style="font-size:0.82rem;color:var(--color-text-secondary);">' + exams.length + ' exam' + (exams.length === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<div style="font-size:0.82rem;color:var(--color-text-secondary);margin-bottom:1rem;padding:0.6rem 0.85rem;background:rgba(26,80,139,0.06);border:1px solid rgba(26,80,139,0.15);border-radius:0.5rem;">' +
            '<b>ℹ Note:</b> Access codes are shown in plain text for easy sharing with students. Click "Regenerate" to create a new code, or "Set Code" to add one.' +
        '</div>' +
        '<div id="accessCodesList"></div>';

    var list = document.getElementById('accessCodesList');
    list.innerHTML = '';
    exams.forEach(function (exam) {
        var card = document.createElement('div');
        card.className = 'access-code-card';
        var diffColor = { Easy: 'var(--color-success)', Medium: '#f59e0b', Hard: 'var(--color-danger)' }[exam.difficulty] || 'var(--color-primary)';
        var hasCode = exam.hasAccessCode;
        var accessCode = exam.accessCode || '';
        var statusBadge = hasCode
            ? '<span class="ac-status ac-status-set">🔒 Protected</span>'
            : '<span class="ac-status ac-status-none">🔓 Open Access</span>';

        // Show the actual code if available, otherwise show status text
        var codeDisplay = '';
        if (hasCode && accessCode) {
            codeDisplay = '<div class="ac-code-display" id="ac-code-' + exam.id + '">' + escapeHtmlNotif(accessCode) + '</div>';
        } else if (hasCode) {
            codeDisplay = '<div class="ac-code-value has-code">✓ Code set (created before plain-text storage)</div>';
        } else {
            codeDisplay = '<div class="ac-code-value no-code">No access code — any student can start</div>';
        }

        // Copy button only if we have the actual code
        var copyBtn = (hasCode && accessCode)
            ? '<button class="btn btn-secondary btn-small ac-copy-btn" data-code="' + escapeHtmlNotif(accessCode) + '" title="Copy code"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>'
            : '';

        card.innerHTML =
            '<div class="ac-card-header">' +
                '<div class="ac-card-title">' + escapeHtmlNotif(exam.title) + '</div>' +
                '<div style="display:flex;gap:0.35rem;align-items:center;">' +
                    statusBadge +
                    '<span class="ac-card-chip" style="color:' + diffColor + ';background:' + diffColor + '18;">' + exam.difficulty + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="ac-card-meta">' +
                '<span class="ac-meta-item">' + escapeHtmlNotif(exam.subject || '—') + '</span>' +
                '<span class="ac-meta-item">' + exam.totalQuestions + 'Q · ' + exam.duration + 'min</span>' +
                '<span class="ac-meta-item">Max attempts: ' + (exam.maxAttempts || 1) + '</span>' +
            '</div>' +
            '<div class="ac-code-row">' +
                '<div class="ac-code-label">Access Code:</div>' +
                codeDisplay +
                copyBtn +
                '<button class="btn btn-primary btn-small ac-edit-btn" data-exam-id="' + exam.id + '" title="Edit exam to set/regenerate code">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:3px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    (hasCode ? 'Regenerate' : 'Set Code') +
                '</button>' +
            '</div>';

        list.appendChild(card);
    });

    // Wire copy buttons
    list.querySelectorAll('.ac-copy-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var code = this.getAttribute('data-code');
            navigator.clipboard.writeText(code).then(function () {
                showToast('Code "' + code + '" copied to clipboard!', 'success');
            }).catch(function () {
                showToast('Copy failed. Code: ' + code, 'error');
            });
        });
    });

    // Wire edit/regenerate buttons — open the edit exam modal
    list.querySelectorAll('.ac-edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var examId = parseInt(this.getAttribute('data-exam-id'));
            openEditExam(examId);
        });
    });
}
