// js/exam.js - Exam-taking interface, practice mode, results, and past attempt review
// No DOMContentLoaded wrapper — called from app.js after DOM is ready.

// =========================================================================
// EXAM PROTECTION (anti-cheat)
// =========================================================================

var warningsCount = 0;

function preventDefaultAction(e) { e.preventDefault(); }

function handleWindowBlur() {
    if (!currentExam) return;
    warningsCount++;
    alert('Security Warning #' + warningsCount + ': You navigated away from the active exam. Three violations trigger automatic submission.');
    if (warningsCount >= 3) {
        alert('Automatic submission triggered due to repeated focus/tab violations.');
        submitExam();
    }
}

function handleVisibilityChange() {
    if (document.hidden) handleWindowBlur();
}

function enableExamProtection() {
    warningsCount = 0;
    document.addEventListener('contextmenu',  preventDefaultAction);
    document.addEventListener('copy',         preventDefaultAction);
    document.addEventListener('cut',          preventDefaultAction);
    document.addEventListener('paste',        preventDefaultAction);
    document.addEventListener('selectstart',  preventDefaultAction);
    window.addEventListener('blur',           handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function disableExamProtection() {
    document.removeEventListener('contextmenu',  preventDefaultAction);
    document.removeEventListener('copy',         preventDefaultAction);
    document.removeEventListener('cut',          preventDefaultAction);
    document.removeEventListener('paste',        preventDefaultAction);
    document.removeEventListener('selectstart',  preventDefaultAction);
    window.removeEventListener('blur',           handleWindowBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

// =========================================================================
// START EXAM
// =========================================================================

async function startExam(examId, accessPassword) {
    var res = await apiRequest('get_exam', { examId: examId, accessPassword: accessPassword || '' }, 'GET');
    if (res.status === 'error' || !res.exam) {
        if (res.message === 'ACCESS_PASSWORD_REQUIRED') {
            promptExamPassword(examId);
            return;
        }
        // Check for "attempts exceeded" or scheduling errors — show a nice card
        var msg = res.message || 'Failed to load exam.';
        if (msg.indexOf('used all') !== -1 || msg.indexOf('not available') !== -1 || msg.indexOf('no longer') !== -1) {
            showExamErrorCard(msg);
        } else {
            alert(msg);
        }
        return;
    }
    await loadExamIntoInterface(res);
}

// Show a friendly error card for scheduling/attempts errors
function showExamErrorCard(message) {
    // Remove any existing error card
    var existing = document.getElementById('examErrorCard');
    if (existing) existing.remove();

    var isAttempts = message.indexOf('used all') !== -1;
    var icon = isAttempts ? '\uD83D\uDD12' : '\uD83D\uDCC5';
    var title = isAttempts ? 'Attempts Limit Reached' : 'Exam Not Available';

    var card = document.createElement('div');
    card.id = 'examErrorCard';
    card.className = 'attempts-exceeded-card';
    card.innerHTML =
        '<div class="attempts-exceeded-icon">' + icon + '</div>' +
        '<div class="attempts-exceeded-title">' + title + '</div>' +
        '<div class="attempts-exceeded-desc">' + message + '</div>' +
        '<button class="btn btn-primary" onclick="this.parentElement.remove()">Back to Exams</button>';

    // Insert it into the student-exams tab content
    var examsList = document.getElementById('examsList');
    if (examsList) {
        examsList.insertBefore(card, examsList.firstChild);
    } else {
        document.body.appendChild(card);
    }
}

function promptExamPassword(examId) {
    var modal  = document.getElementById('examPasswordModal');
    var form   = document.getElementById('examPasswordForm');
    var input  = document.getElementById('examPasswordInput');
    var errEl  = document.getElementById('examPasswordError');
    var closeBtn  = document.getElementById('closeExamPassword');
    var cancelBtn = document.getElementById('cancelExamPassword');
    if (!modal || !form) { alert('This exam requires a password.'); return; }

    input.value = '';
    errEl.style.display = 'none';
    errEl.textContent = '';
    modal.classList.remove('hidden');

    var close = function () { modal.classList.add('hidden'); };
    var newClose  = closeBtn.cloneNode(true);  closeBtn.parentNode.replaceChild(newClose, closeBtn);
    var newCancel = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    var newForm   = form.cloneNode(true);      form.parentNode.replaceChild(newForm, form);

    newClose.addEventListener('click', close);
    newCancel.addEventListener('click', close);
    newForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var pw = newForm.querySelector('#examPasswordInput').value.trim();
        if (!pw) return;
        var checkRes = await apiRequest('get_exam', { examId: examId, accessPassword: pw }, 'GET');
        if (checkRes.status === 'error') {
            if (checkRes.message === 'ACCESS_PASSWORD_REQUIRED') {
                errEl.textContent = 'Incorrect access code. Please try again.';
                errEl.style.display = 'block';
            } else {
                alert(checkRes.message || 'Failed to load exam.');
                close();
            }
            return;
        }
        close();
        await loadExamIntoInterface(checkRes);
    });
}

async function loadExamIntoInterface(res) {
    currentExam = res.exam;
    var total = currentExam.questions.length;
    currentExamAnswers = Array(total).fill(null);
    currentExamFlags   = Array(total).fill(false);

    if (res.progress) {
        currentExam.questions.forEach(function (q, idx) {
            if (res.progress[q.id]) {
                currentExamAnswers[idx] = res.progress[q.id].selectedAnswer;
                currentExamFlags[idx]   = res.progress[q.id].isFlagged;
            }
        });
    }

    currentExamIndex     = 0;
    currentExamStartTime = Date.now();

    document.getElementById('candidateName').textContent    = currentUser.name;
    document.getElementById('candidateId').textContent      = currentUser.userId;
    document.getElementById('examSubjectName').textContent  = currentExam.subject;
    document.getElementById('examTitle').textContent        = currentExam.title;

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('examInterface').classList.remove('hidden');
    var navbar = document.querySelector('.navbar');
    var footer = document.querySelector('.site-footer');
    if (navbar) navbar.classList.add('hidden');
    if (footer) footer.classList.add('hidden');
    document.body.style.overflow = 'hidden';

    enableExamProtection();
    startExamTimer(currentExam.duration * 60);
    renderQuestion();
    renderQuestionsGrid();
}

// =========================================================================
// EXAM TIMER
// =========================================================================

function startExamTimer(durationSeconds) {
    clearInterval(examTimerInterval);
    var timeRemaining = durationSeconds;
    function updateTimerDisplay() {
        if (timeRemaining < 0) {
            clearInterval(examTimerInterval);
            document.getElementById('examTimer').textContent = '00:00';
            autoSubmitExam();
            return;
        }
        var min = Math.floor(timeRemaining / 60);
        var sec = timeRemaining % 60;
        document.getElementById('examTimer').textContent =
            String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        if (timeRemaining <= 60) {
            document.getElementById('examTimer').style.color = 'var(--color-danger)';
        }
        timeRemaining--;
    }
    updateTimerDisplay();
    examTimerInterval = setInterval(updateTimerDisplay, 1000);
}

// =========================================================================
// RENDER QUESTION
// =========================================================================

function renderQuestion() {
    var q = currentExam.questions[currentExamIndex];
    var container = document.getElementById('questionContainer');
    var optionsHtml = '';
    q.options.forEach(function (opt, i) {
        var letter = String.fromCharCode(65 + i);
        var isChecked = currentExamAnswers[currentExamIndex] === i ? 'checked' : '';
        optionsHtml +=
            '<label class="option-item ' + (isChecked ? 'selected' : '') + '">' +
                '<input type="radio" name="optionRadio" value="' + i + '" ' + isChecked + '>' +
                '<span class="option-letter">' + letter + '</span>' +
                '<span class="option-text-content">' + (window.renderOptionHTML ? window.renderOptionHTML(opt) : escapeHtmlNotif(opt)) + '</span>' +
            '</label>';
    });

    // Word count + reading time hint
    var meta = '';
    if (window.countWords) {
        var wc = window.countWords(q.question);
        var rt = window.estimateReadingTime(q.question);
        meta = '<span style="font-size:0.72rem;color:var(--color-text-secondary);margin-left:0.6rem;">' + wc + ' words · ~' + rt + 's read</span>';
    }

    container.innerHTML =
        '<div class="question-header-strip">' +
            '<span class="question-number-label">Question ' + (currentExamIndex + 1) + ' of ' + currentExam.questions.length + meta + '</span>' +
            '<span class="question-points">(' + (q.points || 1) + ' Point' + ((q.points || 1) > 1 ? 's' : '') + ')</span>' +
        '</div>' +
        '<div class="question-text" id="questionTextContainer"></div>' +
        '<div class="options-list">' + optionsHtml + '</div>';

    // Render question text with code blocks, images, keyword highlighting
    var textContainer = document.getElementById('questionTextContainer');
    if (window.renderQuestionInto) {
        window.renderQuestionInto(textContainer, q.question, { imageUrl: q.imageUrl });
    } else {
        textContainer.innerHTML = escapeHtmlNotif(q.question);
    }

    // Update progress bar
    updateExamProgressBar();

    container.querySelectorAll('input[name="optionRadio"]').forEach(function (radio) {
        radio.addEventListener('change', async function () {
            var answer = parseInt(this.value);
            currentExamAnswers[currentExamIndex] = answer;
            container.querySelectorAll('.option-item').forEach(function (lbl) { lbl.classList.remove('selected'); });
            this.closest('.option-item').classList.add('selected');
            var questionId = currentExam.questions[currentExamIndex].id;
            await apiRequest('save_answer', { examId: currentExam.id, questionId: questionId, selectedAnswer: answer });
            updateQuestionsGridItem(currentExamIndex);
            updateExamProgressBar();
        });
    });

    document.getElementById('prevBtn').disabled = currentExamIndex === 0;
    var nextBtn = document.getElementById('nextBtn');
    if (currentExamIndex === currentExam.questions.length - 1) {
        nextBtn.textContent = 'Submit Exam';
        nextBtn.className   = 'btn btn-success';
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.className   = 'btn btn-primary';
    }

    var flagBtn = document.getElementById('flagBtn');
    if (currentExamFlags[currentExamIndex]) {
        flagBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/></svg> Unflag';
        flagBtn.className = 'btn btn-warning';
    } else {
        flagBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg> Flag';
        flagBtn.className = 'btn btn-warning-outline';
    }
}

// =========================================================================
// QUESTIONS MAP GRID
// =========================================================================

// =========================================================================
// PROGRESS BAR — visual indicator of answered/total questions
// =========================================================================
function updateExamProgressBar() {
    var bar = document.getElementById('examProgressBar');
    var label = document.getElementById('examProgressLabel');
    if (!bar || !label) return;
    var total = currentExam.questions.length;
    if (!total) return;
    var answered = 0;
    currentExam.questions.forEach(function (q, i) {
        // For real exams, currentExamAnswers is by index; for practice, by q.id
        if (currentExamAnswers[i] !== undefined && currentExamAnswers[i] !== null) answered++;
    });
    // Also count flagged
    var flagged = (currentExamFlags || []).filter(function (f) { return f; }).length;
    var pct = Math.round(answered * 100 / total);
    bar.style.width = pct + '%';
    label.textContent = answered + ' / ' + total + ' answered' + (flagged ? ' · ' + flagged + ' flagged' : '');
    // Color: green when 100%, orange when >=50%, red otherwise
    if (pct === 100) bar.style.background = 'var(--color-success)';
    else if (pct >= 50) bar.style.background = '#f59e0b';
    else bar.style.background = 'var(--color-primary)';
}

function renderQuestionsGrid() {
    var grid = document.getElementById('questionsMapGrid');
    grid.innerHTML = '';
    currentExam.questions.forEach(function (_, idx) {
        var cell = document.createElement('button');
        cell.className = 'grid-cell-btn';
        cell.innerHTML = '<span class="cell-num">' + (idx + 1) + '</span><span class="cell-shading"></span><span class="cell-flag-dot"></span>';
        cell.addEventListener('click', function () {
            currentExamIndex = idx;
            renderQuestion();
            highlightActiveGridItem();
        });
        grid.appendChild(cell);
        updateQuestionsGridItem(idx);
    });
    highlightActiveGridItem();
}

function updateQuestionsGridItem(idx) {
    var grid = document.getElementById('questionsMapGrid');
    var cell = grid.children[idx];
    if (!cell) return;
    cell.classList.toggle('answered', currentExamAnswers[idx] !== null);
    cell.classList.toggle('flagged',  currentExamFlags[idx]);
}

function highlightActiveGridItem() {
    var grid = document.getElementById('questionsMapGrid');
    if (!grid) return;
    Array.from(grid.children).forEach(function (cell, idx) {
        var isActive = idx === currentExamIndex;
        cell.classList.toggle('active', isActive);
        if (isActive) {
            try {
                cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (e) {
                // Fallback for older browsers
                grid.scrollLeft = cell.offsetLeft - (grid.offsetWidth / 2) + (cell.offsetWidth / 2);
            }
        }
    });
}


// =========================================================================
// SUBMIT EXAM
// =========================================================================

function confirmAndSubmit() {
    var unanswered = currentExamAnswers.filter(function (a) { return a === null; }).length;
    var msg = unanswered > 0
        ? 'You have ' + unanswered + ' unanswered question(s). Submit anyway?'
        : 'Are you sure you want to submit your exam?';
    showCustomConfirm('Submit Exam', msg, function () { submitExam(); });
}

async function autoSubmitExam() {
    alert('Time is up! Your exam is being submitted automatically.');
    submitExam();
}

async function submitExam() {
    // Preview mode — just return to dashboard, don't save anything
    if (currentExam && currentExam._isPreview) {
        if (confirm('Exit preview mode? No answers will be saved.')) {
            currentExam = null;
            document.getElementById('examInterface').classList.add('hidden');
            var tc = document.getElementById('examTimerContainer');
            if (tc) tc.classList.remove('practice-hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            loadTeacherDashboard();
        }
        return;
    }
    clearInterval(examTimerInterval);
    disableExamProtection();
    var timeTaken = Math.floor((Date.now() - currentExamStartTime) / 1000);
    var res = await apiRequest('submit_exam', { examId: currentExam.id, timeTaken: timeTaken });

    if (res.status === 'success') {
        var pct = res.score;
        var circumference = 2 * Math.PI * 82;
        var fillOffset = circumference - (pct / 100) * circumference;
        var ring = document.getElementById('scoreRingFill');
        if (ring) {
            ring.style.strokeDasharray  = circumference;
            ring.style.strokeDashoffset = circumference;
            ring.classList.remove('ring-pass', 'ring-fail');
            ring.classList.add(pct >= 60 ? 'ring-pass' : 'ring-fail');
            requestAnimationFrame(function () {
                ring.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
                ring.style.strokeDashoffset = fillOffset;
            });
        }

        document.getElementById('finalScore').textContent     = pct + '%';
        document.getElementById('correctAnswers').textContent = res.correctAnswers + '/' + res.totalQuestions;
        document.getElementById('timeTaken').textContent      = formatTime(res.timeTaken);

        var totalQsEl = document.getElementById('resultsTotalQs');
        if (totalQsEl) totalQsEl.textContent = res.totalQuestions;

        // Compute points from answerReview
        var earnedPts = 0, totalPts = 0;
        var correctCt = 0, wrongCt = 0, unansweredCt = 0;
        if (res.answerReview && res.answerReview.length > 0) {
            res.answerReview.forEach(function (item) {
                var pts = item.points || 1;
                totalPts += pts;
                if (item.selectedAnswer === null || item.selectedAnswer === undefined) {
                    unansweredCt++;
                } else if (item.isCorrect) {
                    earnedPts += pts;
                    correctCt++;
                } else {
                    wrongCt++;
                }
            });
        }
        var pointsEl = document.getElementById('resultsPoints');
        if (pointsEl) pointsEl.textContent = totalPts > 0 ? earnedPts + '/' + totalPts : '\u2014';

        // Performance Breakdown bar
        var totalForBar = Math.max(res.totalQuestions, 1);
        var bdCorrect   = document.getElementById('bdCorrect');
        var bdWrong     = document.getElementById('bdWrong');
        var bdUnanswered= document.getElementById('bdUnanswered');
        if (bdCorrect) bdCorrect.style.width     = ((correctCt    / totalForBar) * 100) + '%';
        if (bdWrong)   bdWrong.style.width       = ((wrongCt      / totalForBar) * 100) + '%';
        if (bdUnanswered) bdUnanswered.style.width = ((unansweredCt / totalForBar) * 100) + '%';

        var bdCorrectTxt    = document.getElementById('bdCorrectTxt');
        var bdWrongTxt      = document.getElementById('bdWrongTxt');
        var bdUnansweredTxt = document.getElementById('bdUnansweredTxt');
        if (bdCorrectTxt)    bdCorrectTxt.textContent    = correctCt + ' correct';
        if (bdWrongTxt)      bdWrongTxt.textContent      = wrongCt + ' wrong';
        if (bdUnansweredTxt) bdUnansweredTxt.textContent = unansweredCt + ' unanswered';

        var pctTextEl = document.getElementById('resultsPctText');
        if (pctTextEl) pctTextEl.textContent = pct + '%';

        var arCountEl = document.getElementById('answerReviewCount');
        if (arCountEl) arCountEl.textContent = (res.answerReview ? res.answerReview.length : 0) + ' questions';

        var titleEl = document.getElementById('reviewExamTitle');
        if (titleEl) titleEl.textContent = res.examTitle || '';

        var badge = document.getElementById('passBadge');
        var subtitleEl = document.getElementById('resultsSubtitle');
        if (badge) {
            if (pct >= 60) {
                badge.textContent = '\u2713 Passed';
                badge.className = 'pass-badge badge-pass';
            } else {
                badge.textContent = '\u2717 Failed';
                badge.className = 'pass-badge badge-fail';
            }
        }
        if (subtitleEl) {
            if (pct === 100) {
                subtitleEl.textContent = 'Perfect score! Outstanding work. \ud83c\udfaf';
            } else if (pct >= 90) {
                subtitleEl.textContent = 'Excellent performance \u2014 keep it up!';
            } else if (pct >= 75) {
                subtitleEl.textContent = 'Great job! You\'re well above average.';
            } else if (pct >= 60) {
                subtitleEl.textContent = 'Good effort \u2014 you passed this exam.';
            } else if (pct >= 40) {
                subtitleEl.textContent = 'Close to the pass mark. Review the answers below and try again.';
            } else {
                subtitleEl.textContent = 'Keep practicing! Review the answers and try again.';
            }
        }

        // Build answer review list
        var reviewList = document.getElementById('answerReviewList');
        reviewList.innerHTML = '';
        if (res.answerReview) {
            res.answerReview.forEach(function (item, idx) {
                var isCorrect = item.isCorrect;
                var isUnanswered = item.selectedAnswer === null || item.selectedAnswer === undefined;
                var statusClass = isUnanswered ? 'ar-unanswered' : (isCorrect ? 'ar-correct' : 'ar-wrong');
                var statusIcon = isUnanswered ? '\u26aa' : (isCorrect ? '\u2713' : '\u2717');
                var correctAnsText = item.options && item.options[item.correctAnswer] ? item.options[item.correctAnswer] : 'Option ' + String.fromCharCode(65 + item.correctAnswer);
                var selectedAnsText = (item.selectedAnswer !== null && item.selectedAnswer !== undefined && item.options && item.options[item.selectedAnswer])
                    ? item.options[item.selectedAnswer] : '(none)';

                reviewList.innerHTML +=
                    '<div class="ar-card ' + statusClass + '">' +
                        '<div class="ar-header">' +
                            '<span class="ar-num">Q' + (idx + 1) + '</span>' +
                            '<span class="ar-status-icon">' + statusIcon + '</span>' +
                            '<span class="ar-points">' + (item.isCorrect ? '+' : '') + item.points + ' pts</span>' +
                        '</div>' +
                        '<div class="ar-question">' + escapeHtmlNotif(item.question) + '</div>' +
                        '<div class="ar-answers">' +
                            '<div class="ar-your-ans">Your answer: <strong>' + escapeHtmlNotif(selectedAnsText) + '</strong></div>' +
                            '<div class="ar-correct-ans">Correct answer: <strong>' + escapeHtmlNotif(correctAnsText) + '</strong></div>' +
                        '</div>' +
                    '</div>';
            });
        }

        // New badges
        var badgesRow = document.getElementById('resultsBadges');
        if (res.newBadges && res.newBadges.length > 0 && badgesRow) {
            badgesRow.style.display = 'flex';
            badgesRow.innerHTML = '';
            res.newBadges.forEach(function (b) {
                badgesRow.innerHTML +=
                    '<div class="results-badge-item" title="' + b.label + '">' +
                        '<span class="rb-icon">' + b.icon + '</span>' +
                        '<span class="rb-label">' + b.label + '</span>' +
                    '</div>';
            });
        } else if (badgesRow) {
            badgesRow.style.display = 'none';
        }

        // Store exam info for "Practice Again" button
        var practiceBtn = document.getElementById('practiceAgainBtn');
        if (practiceBtn) practiceBtn.dataset.examId = currentExam.id;

        // Show results page
        document.getElementById('examInterface').classList.add('hidden');
        document.getElementById('resultsPage').classList.remove('hidden');
        document.body.style.overflow = '';
    } else {
        alert(res.message || 'Failed to submit exam.');
    }
}

// =========================================================================
// PRACTICE MODE
// =========================================================================

async function startPractice(examId) {
    var res = await apiRequest('practice_exam', { examId: examId }, 'GET');
    if (res.status === 'error' || !res.exam) {
        alert(res.message || 'Failed to load exam for practice.');
        return;
    }

    currentExam = res.exam;
    // Practice API returns questions separately from the exam object — attach them.
    if (res.questions && !currentExam.questions) {
        currentExam.questions = res.questions;
    }
    if (!currentExam.questions || currentExam.questions.length === 0) {
        alert('This exam has no questions to practice.');
        return;
    }
    currentExam._isPractice = true;
    var total = currentExam.questions.length;
    currentExamAnswers = Array(total).fill(null);
    currentExamFlags   = Array(total).fill(false);
    currentExamIndex   = 0;
    currentExamStartTime = Date.now();

    document.getElementById('candidateName').textContent    = currentUser.name;
    document.getElementById('candidateId').textContent      = currentUser.userId;
    document.getElementById('examSubjectName').textContent  = currentExam.subject;
    document.getElementById('examTitle').textContent        = currentExam.title + ' (Practice)';

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('examInterface').classList.remove('hidden');
    var navbar = document.querySelector('.navbar');
    var footer = document.querySelector('.site-footer');
    if (navbar) navbar.classList.add('hidden');
    if (footer) footer.classList.add('hidden');
    document.body.style.overflow = 'hidden';

    // Remove timer, show practice label
    var timerContainer = document.getElementById('examTimerContainer');
    if (timerContainer) {
        timerContainer.classList.add('practice-hidden');
        timerContainer.innerHTML = '<span class="practice-label" style="color:var(--color-primary);font-weight:700;font-size:0.95rem;">\ud83d\udd0d Practice Mode</span>';
    }

    buildPracticeGrid();
    renderPracticeQuestion();
}

function renderPracticeQuestion() {
    var q = currentExam.questions[currentExamIndex];
    var container = document.getElementById('questionContainer');
    var optionsHtml = '';
    q.options.forEach(function (opt, i) {
        var letter = String.fromCharCode(65 + i);
        var isChecked = currentExamAnswers[currentExamIndex] === i ? 'checked' : '';
        optionsHtml +=
            '<label class="option-item ' + (isChecked ? 'selected' : '') + '">' +
                '<input type="radio" name="optionRadio" value="' + i + '" ' + isChecked + '>' +
                '<span class="option-letter">' + letter + '</span>' +
                '<span class="option-text-content">' + (window.renderOptionHTML ? window.renderOptionHTML(opt) : escapeHtmlNotif(opt)) + '</span>' +
            '</label>';
    });

    // Word count + reading time hint
    var meta = '';
    if (window.countWords) {
        var wc = window.countWords(q.question);
        var rt = window.estimateReadingTime(q.question);
        meta = '<span style="font-size:0.72rem;color:var(--color-text-secondary);margin-left:0.6rem;">' + wc + ' words · ~' + rt + 's read</span>';
    }

    container.innerHTML =
        '<div class="question-header-strip">' +
            '<span class="question-number-label">Practice \u2014 Question ' + (currentExamIndex + 1) + ' of ' + currentExam.questions.length + meta + '</span>' +
            '<span class="question-points">(' + (q.points || 1) + ' Point' + ((q.points || 1) > 1 ? 's' : '') + ')</span>' +
        '</div>' +
        '<div class="question-text" id="questionTextContainer"></div>' +
        '<div class="options-list">' + optionsHtml + '</div>' +
        '<div id="practiceFeedback" class="practice-feedback" style="display:none;margin-top:0.5rem;padding:0.6rem 0.9rem;border-radius:0.5rem;font-weight:600;font-size:0.9rem;"></div>';

    // Render question text with code blocks, images, keyword highlighting
    var textContainer = document.getElementById('questionTextContainer');
    if (window.renderQuestionInto) {
        window.renderQuestionInto(textContainer, q.question, { imageUrl: q.imageUrl });
    } else {
        textContainer.innerHTML = escapeHtmlNotif(q.question);
    }

    // Show feedback for previously answered questions
    if (currentExamAnswers[currentExamIndex] !== null) {
        showPracticeFeedback(currentExamIndex);
    }

    container.querySelectorAll('input[name="optionRadio"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            var answer = parseInt(this.value);
            currentExamAnswers[currentExamIndex] = answer;
            container.querySelectorAll('.option-item').forEach(function (lbl) { lbl.classList.remove('selected'); });
            this.closest('.option-item').classList.add('selected');
            updateQuestionsGridItem(currentExamIndex);
            showPracticeFeedback(currentExamIndex);
        });
    });

    document.getElementById('prevBtn').disabled = currentExamIndex === 0;
    var nextBtn = document.getElementById('nextBtn');
    if (currentExamIndex === currentExam.questions.length - 1) {
        nextBtn.textContent = 'Finish Practice';
        nextBtn.className   = 'btn btn-success';
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.className   = 'btn btn-primary';
    }
    // Navigation handled by wireExamButtons() which checks currentExam._isPractice
}

function showPracticeFeedback(idx) {
    var q = currentExam.questions[idx];
    var fb = document.getElementById('practiceFeedback');
    if (!fb) return;
    var ans = currentExamAnswers[idx];
    fb.style.display = 'block';
    if (ans === null) {
        fb.style.background = 'rgba(255,255,255,0.05)';
        fb.style.color = 'var(--color-text-secondary)';
        fb.textContent = 'Select an answer to get instant feedback.';
        return;
    }
    var isCorrect = ans === q.correctAnswer;
    fb.style.background = isCorrect ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)';
    fb.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
    var head = isCorrect
        ? '\u2713 Correct! +' + (q.points || 1) + ' point'
        : '\u2717 Incorrect. The correct answer was: ' + (q.options[q.correctAnswer] || 'Option ' + String.fromCharCode(65 + q.correctAnswer));
    var explanationHtml = '';
    if (q.explanation) {
        // Render the explanation as rich text too (may contain code blocks)
        if (window.renderQuestionHTML) {
            explanationHtml = '<div style="margin-top:0.6rem;padding:0.6rem 0.85rem;background:rgba(87,120,90,0.08);border-left:3px solid var(--color-primary);border-radius:0.4rem;font-size:0.88rem;line-height:1.55;color:var(--color-text);"><b>💡 Explanation:</b><br>' + window.renderQuestionHTML(q.explanation) + '</div>';
        } else {
            explanationHtml = '<div style="margin-top:0.6rem;padding:0.6rem 0.85rem;background:rgba(87,120,90,0.08);border-left:3px solid var(--color-primary);border-radius:0.4rem;font-size:0.88rem;line-height:1.55;color:var(--color-text);"><b>💡 Explanation:</b><br>' + escapeHtmlNotif(q.explanation) + '</div>';
        }
    }
    fb.innerHTML = '<div>' + head + '</div>' + explanationHtml;
    // Trigger Prism on any code blocks in the explanation
    if (window.Prism) { try { window.Prism.highlightAllUnder(fb); } catch (e) {} }
}

function buildPracticeGrid() {
    var grid = document.getElementById('questionsMapGrid');
    grid.innerHTML = '';
    currentExam.questions.forEach(function (_, idx) {
        var cell = document.createElement('button');
        cell.className = 'grid-cell-btn';
        cell.innerHTML = '<span class="cell-num">' + (idx + 1) + '</span><span class="cell-shading"></span><span class="cell-flag-dot"></span>';
        cell.addEventListener('click', function () {
            currentExamIndex = idx;
            renderPracticeQuestion();
            highlightActiveGridItem();
        });
        grid.appendChild(cell);
        updateQuestionsGridItem(idx);
    });
    highlightActiveGridItem();
}

// Show a Practice Summary Modal when practice ends
function showPracticeSummary() {
    var total = currentExam.questions.length;
    var answered = currentExamAnswers.filter(function (a) { return a !== null; }).length;
    var correct = 0;
    currentExam.questions.forEach(function (q, idx) {
        if (currentExamAnswers[idx] !== null && currentExamAnswers[idx] === q.correctAnswer) correct++;
    });
    var score = total > 0 ? Math.round((correct / total) * 100) : 0;

    var modal = document.getElementById('customConfirmModal');
    var titleEl = document.getElementById('confirmModalTitle');
    var msgEl = document.getElementById('confirmModalMessage');
    titleEl.textContent = 'Practice Summary';
    msgEl.innerHTML =
        '<div style="text-align:center;padding:1rem 0;">' +
            '<div style="font-size:2.5rem;font-weight:800;color:' + (score >= 60 ? '#2ecc71' : '#e74c3c') + ';">' + score + '%</div>' +
            '<div style="font-size:0.9rem;color:var(--color-text-secondary);margin-top:0.3rem;">' + correct + '/' + total + ' correct</div>' +
            '<div style="font-size:0.85rem;color:var(--color-text-secondary);margin-top:0.2rem;">' + answered + ' answered, ' + (total - answered) + ' skipped</div>' +
        '</div>';

    var okBtn = document.getElementById('confirmOkBtn');
    var cancelBtn = document.getElementById('confirmCancelBtn');
    var newOkBtn = okBtn.cloneNode(true);
    var newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    modal.classList.remove('hidden');
    newCancelBtn.textContent = 'Exit';
    newOkBtn.textContent = 'Continue Practice';
    newCancelBtn.className = 'btn btn-secondary';
    newOkBtn.className = 'btn btn-primary';

    newCancelBtn.addEventListener('click', function () {
        modal.classList.add('hidden');
        // Go back to dashboard
        currentExam = null;
        document.getElementById('examInterface').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.body.style.overflow = '';
        var tc = document.getElementById('examTimerContainer');
        if (tc) {
            tc.classList.remove('practice-hidden');
            tc.innerHTML = '<span class="timer-label">Time Remaining:</span><span id="examTimer" class="timer-value">30:00</span>';
        }
        loadStudentDashboard();
    });
    newOkBtn.addEventListener('click', function () {
        modal.classList.add('hidden');
    });
}

// =========================================================================
// OPEN PAST ATTEMPT (review previous results)
// =========================================================================

async function openPastAttempt(resultId) {
    var res = await apiRequest('get_attempt_review', { resultId: resultId }, 'GET');
    // API returns { result: {...}, answerReview: [...], hasAnswerData: bool }
    if (res.status === 'error' || !res.result) {
        alert(res.message || 'Failed to load attempt review.');
        return;
    }

    var data = res.result;
    var pct = data.score;
    var circumference = 2 * Math.PI * 82;
    var fillOffset = circumference - (pct / 100) * circumference;
    var ring = document.getElementById('scoreRingFill');
    if (ring) {
        ring.style.transition = 'none';
        ring.style.strokeDasharray  = circumference;
        ring.style.strokeDashoffset = fillOffset;
        ring.classList.remove('ring-pass', 'ring-fail');
        ring.classList.add(pct >= 60 ? 'ring-pass' : 'ring-fail');
    }

    document.getElementById('finalScore').textContent     = pct + '%';
    document.getElementById('correctAnswers').textContent = data.correctAnswers + '/' + data.totalQuestions;
    document.getElementById('timeTaken').textContent      = formatTime(data.timeTaken);

    var totalQsEl = document.getElementById('resultsTotalQs');
    if (totalQsEl) totalQsEl.textContent = data.totalQuestions;

    var pointsEl = document.getElementById('resultsPoints');
    if (pointsEl) pointsEl.textContent = '\u2014';

    // Breakdown bar
    var correctCt = data.correctAnswers || 0;
    var wrongCt = data.totalQuestions - correctCt;
    var unansweredCt = 0;
    var totalForBar = Math.max(data.totalQuestions, 1);
    var bdC = document.getElementById('bdCorrect');
    var bdW = document.getElementById('bdWrong');
    var bdU = document.getElementById('bdUnanswered');
    if (bdC) bdC.style.width = ((correctCt / totalForBar) * 100) + '%';
    if (bdW) bdW.style.width = ((wrongCt / totalForBar) * 100) + '%';
    if (bdU) bdU.style.width = '0%';

    var bdCT = document.getElementById('bdCorrectTxt');
    var bdWT = document.getElementById('bdWrongTxt');
    var bdUT = document.getElementById('bdUnansweredTxt');
    if (bdCT) bdCT.textContent = correctCt + ' correct';
    if (bdWT) bdWT.textContent = wrongCt + ' wrong';
    if (bdUT) bdUT.textContent = '0 unanswered';

    var pctTextEl = document.getElementById('resultsPctText');
    if (pctTextEl) pctTextEl.textContent = pct + '%';

    var arCountEl = document.getElementById('answerReviewCount');
    var badge = document.getElementById('passBadge');
    var subtitleEl = document.getElementById('resultsSubtitle');
    var titleEl = document.getElementById('reviewExamTitle');

    if (titleEl) titleEl.textContent = data.examTitle || 'Past Attempt';
    if (badge) {
        if (pct >= 60) {
            badge.textContent = '\u2713 Passed';
            badge.className = 'pass-badge badge-pass';
        } else {
            badge.textContent = '\u2717 Failed';
            badge.className = 'pass-badge badge-fail';
        }
    }
    if (subtitleEl) subtitleEl.textContent = 'Review of your previous attempt.';
    if (arCountEl) arCountEl.textContent = data.totalQuestions + ' questions';

    // Answer review list — use res.answerReview (not data.details.answerReview)
    var reviewList = document.getElementById('answerReviewList');
    reviewList.innerHTML = '';
    if (res.answerReview && res.answerReview.length > 0) {
        res.answerReview.forEach(function (item, idx) {
            var isCorrect = item.isCorrect;
            var isUnanswered = item.selectedAnswer === null || item.selectedAnswer === undefined;
            var statusClass = isUnanswered ? 'ar-unanswered' : (isCorrect ? 'ar-correct' : 'ar-wrong');
            var statusIcon = isUnanswered ? '\u26aa' : (isCorrect ? '\u2713' : '\u2717');
            var correctAnsText = item.options && item.options[item.correctAnswer] ? item.options[item.correctAnswer] : 'Option ' + String.fromCharCode(65 + item.correctAnswer);
            var selectedAnsText = (item.selectedAnswer !== null && item.selectedAnswer !== undefined && item.options && item.options[item.selectedAnswer])
                ? item.options[item.selectedAnswer] : '(none)';

            reviewList.innerHTML +=
                '<div class="ar-card ' + statusClass + '">' +
                    '<div class="ar-header">' +
                        '<span class="ar-num">Q' + (idx + 1) + '</span>' +
                        '<span class="ar-status-icon">' + statusIcon + '</span>' +
                        '<span class="ar-points">' + (item.isCorrect ? '+' : '') + (item.points || 1) + ' pts</span>' +
                    '</div>' +
                    '<div class="ar-question">' + escapeHtmlNotif(item.question) + '</div>' +
                    '<div class="ar-answers">' +
                        '<div class="ar-your-ans">Your answer: <strong>' + escapeHtmlNotif(selectedAnsText) + '</strong></div>' +
                        '<div class="ar-correct-ans">Correct answer: <strong>' + escapeHtmlNotif(correctAnsText) + '</strong></div>' +
                    '</div>' +
                '</div>';
        });
    } else {
        reviewList.innerHTML = '<div style="color:var(--color-text-secondary);text-align:center;padding:1.5rem;">No detailed answer data available for this attempt.</div>';
    }

    // Hide badges row
    var badgesRow = document.getElementById('resultsBadges');
    if (badgesRow) badgesRow.style.display = 'none';

    // Show results page
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('examInterface').classList.add('hidden');
    document.getElementById('resultsPage').classList.remove('hidden');
    document.body.style.overflow = '';
}

// =========================================================================
// DOM EVENT WIRING (called from app.js with fresh listeners)
// =========================================================================

function wireExamButtons() {
    var flagBtn = document.getElementById('flagBtn');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');

    if (flagBtn) {
        var newFlag = flagBtn.cloneNode(true);
        flagBtn.parentNode.replaceChild(newFlag, flagBtn);
        newFlag.addEventListener('click', async function () {
            if (!currentExam) return;
            var newFlagState = !currentExamFlags[currentExamIndex];
            currentExamFlags[currentExamIndex] = newFlagState;
            var questionId = currentExam.questions[currentExamIndex].id;
            await apiRequest('toggle_flag', {
                examId: currentExam.id,
                questionId: questionId,
                isFlagged: newFlagState ? 1 : 0
            });
            renderQuestion();
            updateQuestionsGridItem(currentExamIndex);
            syncMobileGrid();
        });
    }

    if (prevBtn) {
        var newPrev = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        newPrev.addEventListener('click', function () {
            if (typeof studySession !== 'undefined' && studySession && studySession.mode) return;
            if (currentExam && currentExam._isPractice) {
                if (currentExamIndex > 0) {
                    currentExamIndex--;
                    renderPracticeQuestion();
                    highlightActiveGridItem();
                    syncMobileGrid();
                }
            } else if (currentExamIndex > 0) {
                currentExamIndex--;
                renderQuestion();
                highlightActiveGridItem();
                syncMobileGrid();
            }
        });
    }

    if (nextBtn) {
        var newNext = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        newNext.addEventListener('click', function () {
            if (typeof studySession !== 'undefined' && studySession && studySession.mode) return;
            if (currentExam && currentExam._isPractice) {
                if (currentExamIndex < currentExam.questions.length - 1) {
                    currentExamIndex++;
                    renderPracticeQuestion();
                    highlightActiveGridItem();
                    syncMobileGrid();
                } else {
                    showPracticeSummary();
                }
            } else if (currentExamIndex < currentExam.questions.length - 1) {
                currentExamIndex++;
                renderQuestion();
                highlightActiveGridItem();
                syncMobileGrid();
            } else {
                confirmAndSubmit();
            }
        });
    }

    // ── Wire mobile floating nav buttons ──
    wireMobileExamNav();
}

function wireMobileExamNav() {
    var mobileNav = document.getElementById('examMobileNav');
    if (!mobileNav) return;

    // Show/hide based on viewport
    function checkMobileNav() {
        mobileNav.style.display = window.innerWidth <= 700 ? 'flex' : 'none';
    }
    checkMobileNav();
    window.addEventListener('resize', checkMobileNav);

    // Prev
    var mobPrev = document.getElementById('mobPrevBtn');
    if (mobPrev) {
        mobPrev.addEventListener('click', function () {
            document.getElementById('prevBtn') && document.getElementById('prevBtn').click();
            syncMobileNavState();
        });
    }

    // Flag
    var mobFlag = document.getElementById('mobFlagBtn');
    if (mobFlag) {
        mobFlag.addEventListener('click', function () {
            document.getElementById('flagBtn') && document.getElementById('flagBtn').click();
            setTimeout(syncMobileNavState, 50);
        });
    }

    // Next
    var mobNext = document.getElementById('mobNextBtn');
    if (mobNext) {
        mobNext.addEventListener('click', function () {
            document.getElementById('nextBtn') && document.getElementById('nextBtn').click();
            syncMobileNavState();
        });
    }

    // Map — open bottom sheet
    var mobMap = document.getElementById('mobMapBtn');
    var sheet   = document.getElementById('mobileQmapSheet');
    var backdrop = document.getElementById('mobileQmapBackdrop');
    var closeBtn = document.getElementById('mobileQmapClose');

    function openSheet() {
        buildMobileGrid();
        sheet && sheet.classList.add('open');
        backdrop && backdrop.classList.add('open');
    }
    function closeSheet() {
        sheet && sheet.classList.remove('open');
        backdrop && backdrop.classList.remove('open');
    }

    if (mobMap) mobMap.addEventListener('click', openSheet);
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    if (backdrop) backdrop.addEventListener('click', closeSheet);
}

function buildMobileGrid() {
    if (!currentExam) return;
    var grid = document.getElementById('mobileQuestionsMapGrid');
    if (!grid) return;
    grid.innerHTML = '';
    currentExam.questions.forEach(function (_, idx) {
        var cell = document.createElement('button');
        cell.className = 'grid-cell-btn' +
            (currentExamAnswers[idx] !== null ? ' answered' : '') +
            (currentExamFlags[idx] ? ' flagged' : '') +
            (idx === currentExamIndex ? ' active' : '');
        cell.innerHTML = '<span class="cell-num">' + (idx + 1) + '</span><span class="cell-shading"></span><span class="cell-flag-dot"></span>';
        cell.addEventListener('click', function () {
            currentExamIndex = idx;
            if (currentExam._isPractice) {
                renderPracticeQuestion();
            } else {
                renderQuestion();
            }
            highlightActiveGridItem();
            syncMobileGrid();
            // close sheet
            var sheet = document.getElementById('mobileQmapSheet');
            var backdrop = document.getElementById('mobileQmapBackdrop');
            if (sheet) sheet.classList.remove('open');
            if (backdrop) backdrop.classList.remove('open');
        });
        grid.appendChild(cell);
    });
}

function syncMobileGrid() {
    if (!currentExam) return;
    var grid = document.getElementById('mobileQuestionsMapGrid');
    if (!grid || !grid.children.length) return;
    Array.from(grid.children).forEach(function (cell, idx) {
        cell.classList.toggle('answered', currentExamAnswers[idx] !== null);
        cell.classList.toggle('flagged',  currentExamFlags[idx]);
        cell.classList.toggle('active',   idx === currentExamIndex);
    });
    syncMobileNavState();
}

function syncMobileNavState() {
    var mobPrev = document.getElementById('mobPrevBtn');
    var mobNext = document.getElementById('mobNextBtn');
    var mobFlag = document.getElementById('mobFlagBtn');
    if (!currentExam) return;
    if (mobPrev) mobPrev.disabled = currentExamIndex === 0;
    if (mobNext) {
        var isLast = currentExamIndex === currentExam.questions.length - 1;
        mobNext.textContent = '';
        if (isLast) {
            mobNext.innerHTML = currentExam._isPractice ? 'Finish' : 'Submit';
            mobNext.className = 'btn btn-success';
        } else {
            mobNext.innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
            mobNext.className = 'btn btn-primary';
        }
    }
    if (mobFlag) {
        var isFlagged = currentExamFlags && currentExamFlags[currentExamIndex];
        mobFlag.className = isFlagged ? 'btn btn-warning' : 'btn btn-warning-outline';
        mobFlag.innerHTML = isFlagged
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/></svg> Unflag'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Flag';
    }
}


function wireResultsButtons() {
    var backBtn = document.getElementById('resultsBackBtn');
    if (backBtn) {
        var newBack = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBack, backBtn);
        newBack.addEventListener('click', function () {
            document.getElementById('resultsPage').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            if (currentUser && isTeacherRole(currentUser.role)) {
                loadTeacherDashboard();
            } else {
                loadStudentDashboard();
            }
        });
    }

    var backDashBtn = document.getElementById('backToDashboard');
    if (backDashBtn) {
        var newBack2 = backDashBtn.cloneNode(true);
        backDashBtn.parentNode.replaceChild(newBack2, backDashBtn);
        newBack2.addEventListener('click', function () {
            document.getElementById('resultsPage').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
        });
    }

    var practiceAgain = document.getElementById('practiceAgainBtn');
    if (practiceAgain) {
        var newPA = practiceAgain.cloneNode(true);
        practiceAgain.parentNode.replaceChild(newPA, practiceAgain);
        newPA.addEventListener('click', function () {
            var eid = parseInt(newPA.dataset.examId || '0');
            if (eid > 0) {
                document.getElementById('resultsPage').classList.add('hidden');
                startPractice(eid);
            }
        });
    }
}
