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
    modal.classList.remove('hidden');

    var newClose = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newClose, closeBtn);
    newClose.addEventListener('click', function () { modal.classList.add('hidden'); });

    var res = await apiRequest('teacher_question_analytics', { examId: examId }, 'GET');
    if (res.status !== 'success' || !res.questions) {
        if (body) body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);">Failed to load question analytics.</div>';
        return;
    }

    var html = '';
    res.questions.forEach(function (q, idx) {
        var pct = q.totalResponses > 0 ? Math.round((q.correctCount / q.totalResponses) * 100) : 0;
        var barColor = pct >= 75 ? '#2ecc71' : pct >= 50 ? '#f59e0b' : '#e74c3c';
        var needsReview = pct < 40;

        html += '<div class="qa-card" style="margin-bottom:0.85rem;padding:1rem;border-radius:0.65rem;background:var(--glass-bg);border:1px solid var(--color-border);">' +
            '<div class="qa-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">' +
                '<span style="font-weight:700;font-size:0.88rem;">Q' + (idx + 1) + '</span>' +
                '<span style="font-size:0.8rem;color:var(--color-text-secondary);">' + q.totalResponses + ' responses</span>' +
            '</div>' +
            '<div class="qa-text" style="margin-bottom:0.5rem;font-size:0.9rem;">' + escapeHtmlNotif(q.question) + '</div>' +
            '<div class="qa-bar-row" style="display:flex;align-items:center;gap:0.5rem;">' +
                '<div class="qa-bar-track" style="flex:1;height:6px;border-radius:3px;background:var(--color-border);">' +
                    '<div class="qa-bar-fill" style="width:' + pct + '%;height:100%;border-radius:3px;background:' + barColor + ';"></div>' +
                '</div>' +
                '<span class="qa-pct" style="font-weight:700;font-size:0.85rem;color:' + barColor + ';">' + pct + '%</span>' +
            '</div>' +
            (needsReview ? '<div style="margin-top:0.4rem;font-size:0.78rem;color:var(--color-danger);font-weight:600;">\u26a0 Needs review \u2014 less than 40% correct</div>' : '') +
        '</div>';
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

    renderQuestion();
    renderQuestionsGrid();
}

// =========================================================================
// QUESTION BANK (Teacher)
// =========================================================================

async function loadTeacherBank() {
    var container = document.getElementById('teacherBankContent');
    container.innerHTML =
        '<div class="bank-toolbar" style="display:flex;gap:0.75rem;margin-bottom:1.25rem;flex-wrap:wrap;align-items:center;">' +
            '<input type="text" id="bankSearchInput" class="form-input" placeholder="Search questions..." style="flex:1;min-width:160px;">' +
            '<select id="bankSubjectFilter" class="form-input form-select" style="max-width:160px;width:100%;">' +
                '<option value="">All Subjects</option>' +
            '</select>' +
            '<button id="bankAddBtn" class="btn btn-primary btn-small">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                ' Add Question' +
            '</button>' +
            '<span id="bankCountDisplay" class="bank-count-badge" style="font-size:0.85rem;color:var(--color-text-secondary);margin-left:auto;"></span>' +
        '</div>' +
        '<div id="bankListContainer" style="display:flex;flex-direction:column;gap:0.5rem;"></div>' +
        '<div id="bankAddFormContainer"></div>';

    await refetchBank();

    document.getElementById('bankSearchInput').addEventListener('input', debounce(refetchBank, 300));
    document.getElementById('bankSubjectFilter').addEventListener('change', refetchBank);
    document.getElementById('bankAddBtn').addEventListener('click', function () { openBankAddForm(); });
}

var bankQuestions = [];
var bankSubjects = [];

async function refetchBank() {
    var search  = document.getElementById('bankSearchInput') ? document.getElementById('bankSearchInput').value.trim() : '';
    var subject = document.getElementById('bankSubjectFilter') ? document.getElementById('bankSubjectFilter').value : '';
    var res = await apiRequest('teacher_get_bank', { search: search, subject: subject }, 'GET');
    if (res.status !== 'success') return;

    bankQuestions = res.questions || [];
    bankSubjects  = res.subjects || [];

    // Populate subject filter
    var sel = document.getElementById('bankSubjectFilter');
    if (sel) {
        var cur = sel.value;
        sel.innerHTML = '<option value="">All Subjects</option>';
        bankSubjects.forEach(function (s) {
            var o = document.createElement('option');
            o.value = s; o.textContent = s;
            sel.appendChild(o);
        });
        sel.value = cur;
    }

    // Count badge
    var countEl = document.getElementById('bankCountDisplay');
    if (countEl) countEl.textContent = res.totalCount || bankQuestions.length + ' question' + (bankQuestions.length !== 1 ? 's' : '');

    // Render list
    var list = document.getElementById('bankListContainer');
    list.innerHTML = '';
    if (bankQuestions.length === 0) {
        list.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">No questions found. Add your first question above.</div>';
        return;
    }
    bankQuestions.forEach(function (q) {
        var div = document.createElement('div');
        div.className = 'bank-item';
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.65rem 0.9rem;border-radius:0.55rem;background:var(--glass-bg);border:1px solid var(--color-border);gap:1rem;';
        div.innerHTML =
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtmlNotif(q.question) + '</div>' +
                '<div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:0.15rem;">' +
                    (q.subject ? '<span>' + q.subject + '</span>' : '') +
                    (q.difficulty ? '<span style="margin-left:0.5rem;">' + q.difficulty + '</span>' : '') +
                    (q.usageCount > 0 ? '<span style="margin-left:0.5rem;">Used ' + q.usageCount + 'x</span>' : '') +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:0.35rem;flex-shrink:0;">' +
                '<button class="btn btn-danger btn-small bank-delete-btn" data-id="' + q.id + '" style="padding:0.2rem 0.55rem;font-size:0.78rem;">Delete</button>' +
            '</div>';

        div.querySelector('.bank-delete-btn').addEventListener('click', async function () {
            var qid = parseInt(this.getAttribute('data-id'));
            var r = await apiRequest('teacher_delete_from_bank', { questionId: qid });
            if (r.status === 'success') { showToast('Question removed.', 'success'); refetchBank(); }
            else { alert(r.message || 'Failed to delete question.'); }
        });

        list.appendChild(div);
    });
}

function openBankAddForm(callback) {
    var container = document.getElementById('bankAddFormContainer');
    if (!container) return;
    container.innerHTML =
        '<div class="bank-add-form" style="margin-top:1rem;padding:1.25rem;border-radius:0.65rem;background:var(--glass-bg);border:1.5px solid var(--color-primary);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem;">' +
                '<span style="font-weight:700;font-size:0.95rem;">Add New Question to Bank</span>' +
                '<button id="bankAddFormClose" class="btn btn-secondary btn-small">Cancel</button>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0.6rem;">' +
                '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Question Text</label>' +
                '<input type="text" id="bankNewQuestion" class="form-input" placeholder="Enter your question...">' +
            '</div>' +
            '<div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.6rem;">' +
                '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">A</span><input type="text" id="bankNewOptA" class="form-input" placeholder="Option A" style="padding-left:26px;"></div>' +
                '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">B</span><input type="text" id="bankNewOptB" class="form-input" placeholder="Option B" style="padding-left:26px;"></div>' +
                '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">C</span><input type="text" id="bankNewOptC" class="form-input" placeholder="Option C" style="padding-left:26px;"></div>' +
                '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">D</span><input type="text" id="bankNewOptD" class="form-input" placeholder="Option D" style="padding-left:26px;"></div>' +
            '</div>' +
            '<div class="correct-answer-row" style="margin-bottom:0.6rem;">' +
                '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);margin-right:0.5rem;">Correct:</label>' +
                '<label class="correct-opt"><input type="radio" name="bankNewCorrect" value="0" checked> A</label>' +
                '<label class="correct-opt"><input type="radio" name="bankNewCorrect" value="1"> B</label>' +
                '<label class="correct-opt"><input type="radio" name="bankNewCorrect" value="2"> C</label>' +
                '<label class="correct-opt"><input type="radio" name="bankNewCorrect" value="3"> D</label>' +
            '</div>' +
            '<div style="display:flex;gap:0.75rem;margin-bottom:0.6rem;">' +
                '<div class="form-group" style="flex:1;"><label style="font-size:0.78rem;font-weight:700;color:var(--color-text-secondary);">Subject</label><input type="text" id="bankNewSubject" class="form-input" placeholder="e.g. Java OOP"></div>' +
                '<div class="form-group" style="flex:1;"><label style="font-size:0.78rem;font-weight:700;color:var(--color-text-secondary);">Difficulty</label><select id="bankNewDifficulty" class="form-input form-select"><option value="Easy">Easy</option><option value="Medium" selected>Medium</option><option value="Hard">Hard</option></select></div>' +
            '</div>' +
            '<button id="bankNewSaveBtn" class="btn btn-primary btn-small">Save to Bank</button>' +
            '<span id="bankNewMsg" style="margin-left:0.5rem;font-size:0.85rem;"></span>' +
        '</div>';

    document.getElementById('bankAddFormClose').addEventListener('click', function () { container.innerHTML = ''; });
    document.getElementById('bankNewSaveBtn').addEventListener('click', async function () {
        var question = document.getElementById('bankNewQuestion').value.trim();
        var options = [
            document.getElementById('bankNewOptA').value.trim(),
            document.getElementById('bankNewOptB').value.trim(),
            document.getElementById('bankNewOptC').value.trim(),
            document.getElementById('bankNewOptD').value.trim()
        ];
        var correct = parseInt(document.querySelector('input[name="bankNewCorrect"]:checked').value);
        var subject = document.getElementById('bankNewSubject').value.trim();
        var difficulty = document.getElementById('bankNewDifficulty').value;

        if (!question || options.some(function (o) { return !o; })) {
            document.getElementById('bankNewMsg').textContent = 'All fields required.';
            document.getElementById('bankNewMsg').style.color = 'var(--color-danger)';
            return;
        }
        var r = await apiRequest('teacher_add_to_bank', {
            question: question, options: options, correctAnswer: correct,
            subject: subject, difficulty: difficulty
        });
        if (r.status === 'success') {
            document.getElementById('bankNewMsg').textContent = 'Saved!';
            document.getElementById('bankNewMsg').style.color = 'var(--color-success)';
            container.innerHTML = '';
            refetchBank();
        } else {
            document.getElementById('bankNewMsg').textContent = r.message || 'Failed.';
            document.getElementById('bankNewMsg').style.color = 'var(--color-danger)';
        }
    });
}

// =========================================================================
// CLASS GROUPS (Teacher)
// =========================================================================

async function loadTeacherGroups() {
    var container = document.getElementById('teacherGroupsContent');
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--color-text-secondary);">Loading groups...</div>';

    var groupsRes = await apiRequest('teacher_list_groups', {}, 'GET');

    container.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
            '<h3 style="font-size:1.1rem;font-weight:700;">Class Groups</h3>' +
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
            if (r.status === 'success') { close(); loadTeacherGroups(); }
            else { alert(r.message || 'Failed to create group.'); }
        });
    });

    var listContainer = document.getElementById('groupListContainer');
    if (groupsRes.status !== 'success' || !groupsRes.groups || groupsRes.groups.length === 0) {
        listContainer.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--color-text-secondary);">No groups created yet.</div>';
        return;
    }

    listContainer.innerHTML = '';
    groupsRes.groups.forEach(function (group) {
        var card = document.createElement('div');
        card.className = 'group-card';
        card.style.cssText = 'margin-bottom:0.85rem;padding:1rem;border-radius:0.65rem;background:var(--glass-bg);border:1px solid var(--color-border);';

        var membersHtml = '';
        if (group.members && group.members.length > 0) {
            group.members.forEach(function (m) {
                membersHtml += '<span class="group-member-chip" style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.2rem 0.55rem;border-radius:0.35rem;background:rgba(87,120,90,0.1);font-size:0.8rem;margin-right:0.3rem;margin-bottom:0.3rem;">' +
                    escapeHtmlNotif(m.name) +
                    '<button class="group-remove-member" data-group-id="' + group.id + '" data-student-id="' + m.id + '" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:0.85rem;padding:0;line-height:1;">\u00d7</button>' +
                '</span>';
            });
        } else {
            membersHtml = '<span style="color:var(--color-text-secondary);font-size:0.82rem;">No members yet</span>';
        }

        // Group-exam assignments
        var examsHtml = '';
        if (group.assignedExams && group.assignedExams.length > 0) {
            group.assignedExams.forEach(function (e) {
                examsHtml += '<span class="exam-chip" style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.2rem 0.55rem;border-radius:0.35rem;background:rgba(52,152,219,0.1);font-size:0.8rem;margin-right:0.3rem;margin-bottom:0.3rem;">' +
                    escapeHtmlNotif(e.title) +
                '</span>';
            });
        } else {
            examsHtml = '<span style="color:var(--color-text-secondary);font-size:0.82rem;">No exams assigned</span>';
        }

        card.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">' +
                '<div style="flex:1;">' +
                    '<div style="font-weight:700;font-size:0.95rem;margin-bottom:0.3rem;">' + escapeHtmlNotif(group.name) + '</div>' +
                    '<div style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:0.5rem;">\ud83d\udc65 Members: ' + membersHtml + '</div>' +
                    '<div style="font-size:0.8rem;color:var(--color-text-secondary);">\ud83d\udccb Assigned Exams: ' + examsHtml + '</div>' +
                '</div>' +
                '<button class="btn btn-danger btn-small group-delete-btn" data-id="' + group.id + '" style="flex-shrink:0;">Delete</button>' +
            '</div>' +
            '<div style="margin-top:0.6rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
                '<button class="btn btn-secondary btn-small group-add-member" data-id="' + group.id + '" style="font-size:0.78rem;">+ Add Member</button>' +
                '<button class="btn btn-secondary btn-small group-assign-exam" data-id="' + group.id + '" style="font-size:0.78rem;">+ Assign Exam</button>' +
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

        // Add member
        card.querySelector('.group-add-member').addEventListener('click', function () {
            var gid = parseInt(this.getAttribute('data-id'));
            var studentId = prompt('Enter student ID to add:');
            if (!studentId || isNaN(parseInt(studentId))) return;
            apiRequest('teacher_group_member', { groupId: gid, studentId: parseInt(studentId), action2: 'add' }).then(function (r) {
                if (r.status === 'success') { showToast('Member added.', 'success'); loadTeacherGroups(); }
                else { alert(r.message || 'Failed to add member.'); }
            });
        });

        // Assign exam
        card.querySelector('.group-assign-exam').addEventListener('click', function () {
            var gid = parseInt(this.getAttribute('data-id'));
            var examId = prompt('Enter exam ID to assign:');
            if (!examId || isNaN(parseInt(examId))) return;
            apiRequest('teacher_assign_exam_group', { groupId: gid, examId: parseInt(examId) }).then(function (r) {
                if (r.status === 'success') { showToast('Exam assigned.', 'success'); loadTeacherGroups(); }
                else { alert(r.message || 'Failed to assign exam.'); }
            });
        });

        // Remove member (via chip ×)
        card.querySelectorAll('.group-remove-member').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var gid = parseInt(this.getAttribute('data-group-id'));
                var sid = parseInt(this.getAttribute('data-student-id'));
                var r = await apiRequest('teacher_group_member', { groupId: gid, studentId: sid, action2: 'remove' });
                if (r.status === 'success') { loadTeacherGroups(); }
            });
        });

        listContainer.appendChild(card);
    });
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
