// js/exam-creation.js - Exam creation and editing for FetenaX
// No DOMContentLoaded wrapper — functions are called from app.js after DOM is ready.

// =========================================================================
// CREATE EXAM MODAL SETUP (wired from app.js DOMContentLoaded)
// =========================================================================

var createExamBtn     = document.getElementById('createExamBtn');
var createExamModal   = document.getElementById('createExamModal');
var closeModal        = document.getElementById('closeModal');
var cancelCreate      = document.getElementById('cancelCreate');
var createExamForm    = document.getElementById('createExamForm');
var questionsContainer = document.getElementById('questionsContainer');
var addQuestionBtn    = document.getElementById('addQuestionBtn');

/**
 * Initialize the create exam modal with reset and open logic.
 * Called from app.js.
 */
function initExamCreation() {
    if (createExamBtn) {
        createExamBtn.addEventListener('click', function () {
            createExamModal.classList.remove('hidden');
            resetCreateExamForm();
        });
    }

    if (closeModal) closeModal.addEventListener('click', function () { createExamModal.classList.add('hidden'); });
    if (cancelCreate) cancelCreate.addEventListener('click', function () { createExamModal.classList.add('hidden'); });

    if (addQuestionBtn) addQuestionBtn.addEventListener('click', addQuestionBlock);

    // Bind live summary updates to all relevant inputs
    var summaryFields = [
        'examTitleInput', 'examSubject', 'examDuration', 'examDifficulty', 'examPassMark',
        'optShuffle', 'optShuffleOptions', 'optShowCorrect', 'optAllowReview', 'optAttempts',
        'examCategory', 'examAvailableFrom', 'examAvailableUntil', 'examAccessPassword'
    ];
    summaryFields.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var evt = (el.type === 'checkbox') ? 'change' : 'input';
        el.addEventListener(evt, updateExamSummary);
    });

    // Auto-generate password button — use document-level delegation so it survives form cloning
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('#autoGeneratePasswordBtn');
        if (!btn) return;
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var pw = '';
        for (var i = 0; i < 8; i++) {
            pw += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        var pwInput = document.getElementById('examAccessPassword');
        if (pwInput) {
            pwInput.value = pw;
            pwInput.dispatchEvent(new Event('input'));
            showToast('Access code generated: ' + pw, 'success');
        }
    });

    // Import from bank button
    var importBankBtn = document.getElementById('importFromBankBtn');
    if (importBankBtn) {
        importBankBtn.addEventListener('click', function () {
            openBankImportPicker();
        });
    }

    // Wire form submit
    if (createExamForm) {
        createExamForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await submitCreateExamForm();
        });
    }

    // Bulk exam import
    var bulkImportBtn = document.getElementById('bulkExamImportBtn');
    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', function () {
            document.getElementById('bulkExamImportModal').classList.remove('hidden');
        });
    }
}

/**
 * Reset the create exam form to defaults.
 */
function resetCreateExamForm() {
    var fields = {
        'examTitleInput':     '',
        'examSubject':        '',
        'examDuration':       '30',
        'examDifficulty':     'Medium',
        'examPassMark':       '60',
        'examCategory':       '',
        'examAvailableFrom':  '',
        'examAvailableUntil': '',
        'examAccessPassword': ''
    };
    Object.keys(fields).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = fields[id];
    });
    // Auto-generate a password since it's now mandatory
    // Directly generate instead of .click() since the button may have been cloned
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var pw = '';
    for (var i = 0; i < 8; i++) { pw += chars.charAt(Math.floor(Math.random() * chars.length)); }
    var pwInput = document.getElementById('examAccessPassword');
    if (pwInput) { pwInput.value = pw; pwInput.dispatchEvent(new Event('input')); }

    var checks = {
        'optShuffle':       false,
        'optShuffleOptions': false,
        'optShowCorrect':   true,
        'optAllowReview':   false
    };
    Object.keys(checks).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.checked = checks[id];
    });

    var optAttempts = document.getElementById('optAttempts');
    if (optAttempts) optAttempts.value = '1';

    var submitText = document.getElementById('createExamSubmitText');
    if (submitText) submitText.textContent = 'Publish Exam';

    var modalTitle = document.getElementById('createExamTitle');
    if (modalTitle) {
        modalTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:7px;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> Create New Exam';
    }

    if (questionsContainer) {
        questionsContainer.innerHTML = '';
        updateQuestionCount();
        addQuestionBlock();
        updateExamSummary();
    }

    // CRITICAL: Restore the original create submit handler (openEditExam replaces the form)
    // This fixes the bug where editing an exam then creating a new one shows old data
    var form = document.getElementById('createExamForm');
    if (form) {
        var newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await submitCreateExamForm();
        });
    }
    // Clear any edit mode flag
    var modal = document.getElementById('createExamModal');
    if (modal) delete modal.dataset.editId;
}

/**
 * Update the question count badge.
 */
function updateQuestionCount() {
    var badge = document.getElementById('questionCount');
    if (!badge) return;
    var n = questionsContainer ? questionsContainer.querySelectorAll('.question-block').length : 0;
    badge.textContent = n + (n === 1 ? ' Question' : ' Questions');
    updateExamSummary();
}

/**
 * Update the live exam summary sidebar.
 */
function updateExamSummary() {
    var getVal = function (id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    };
    var getChecked = function (id) {
        var el = document.getElementById(id);
        return el ? el.checked : false;
    };

    var title      = getVal('examTitleInput').trim();
    var subject    = getVal('examSubject').trim();
    var duration   = getVal('examDuration') || '30';
    var difficulty = getVal('examDifficulty') || 'Medium';
    var passMark   = getVal('examPassMark') || '60';
    var shuffle    = getChecked('optShuffle');
    var review     = getChecked('optShowCorrect');
    var attempts   = getVal('optAttempts') || '1';

    var setText = function (id, txt) {
        var el = document.getElementById(id);
        if (el) el.textContent = txt;
    };

    setText('sumTitle',      title || '\u2014');
    setText('sumSubject',    subject || '\u2014');
    setText('sumDifficulty', difficulty);
    setText('sumDuration',   duration + ' min');
    setText('sumPassMark',   passMark + '%');

    var blocks = questionsContainer ? questionsContainer.querySelectorAll('.question-block') : [];
    var totalPoints = 0;
    blocks.forEach(function (b) {
        var ptsInput = b.querySelector('input.points-input');
        var pts = ptsInput ? parseInt(ptsInput.value) || 1 : 1;
        totalPoints += pts;
    });
    setText('sumQuestionCount', blocks.length);
    setText('sumTotalPoints', totalPoints);

    var optsEl = document.getElementById('sumOptions');
    if (optsEl) {
        optsEl.innerHTML =
            '<span class="ces-opt-pill ' + (shuffle ? 'on' : '') + '">Shuffle: ' + (shuffle ? 'On' : 'Off') + '</span>' +
            '<span class="ces-opt-pill ' + (review ? 'on' : '') + '">Review: ' + (review ? 'On' : 'Off') + '</span>' +
            '<span class="ces-opt-pill">Attempts: ' + attempts + '</span>';
    }
}

/**
 * Add a new question block to the builder.
 */
function addQuestionBlock() {
    var idx = questionsContainer.querySelectorAll('.question-block').length + 1;
    var block = document.createElement('div');
    block.className = 'question-block';
    var uid = 'q' + Date.now() + '_' + idx;

    block.innerHTML =
        '<div class="question-block-header">' +
            '<span class="question-block-num">Question ' + idx + '</span>' +
            '<button type="button" class="btn btn-danger btn-small remove-question" style="padding:0.2rem 0.65rem;font-size:0.78rem;">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:3px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg> Remove' +
            '</button>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0.6rem;">' +
            '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Question Text</label>' +
            '<input type="text" class="form-input question-input" required placeholder="Enter your question here\u2026">' +
        '</div>' +
        '<div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.7rem;">' +
            '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">A</span><input type="text" class="form-input option-input" placeholder="Option A" required style="padding-left:26px;"></div>' +
            '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">B</span><input type="text" class="form-input option-input" placeholder="Option B" required style="padding-left:26px;"></div>' +
            '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">C</span><input type="text" class="form-input option-input" placeholder="Option C" required style="padding-left:26px;"></div>' +
            '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">D</span><input type="text" class="form-input option-input" placeholder="Option D" required style="padding-left:26px;"></div>' +
        '</div>' +
        '<div class="correct-answer-row">' +
            '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Correct Answer:</label>' +
            '<label class="correct-opt"><input type="radio" name="' + uid + '" value="0" checked> A</label>' +
            '<label class="correct-opt"><input type="radio" name="' + uid + '" value="1"> B</label>' +
            '<label class="correct-opt"><input type="radio" name="' + uid + '" value="2"> C</label>' +
            '<label class="correct-opt"><input type="radio" name="' + uid + '" value="3"> D</label>' +
            '<div class="question-points-input" style="margin-left:auto;"><label>Points:</label><input type="number" class="form-input points-input" min="1" max="100" value="1" style="width:58px;padding:0.3rem 0.5rem;font-size:0.85rem;"></div>' +
        '</div>';

    block.querySelector('.remove-question').addEventListener('click', function () {
        block.remove();
        updateQuestionCount();
        questionsContainer.querySelectorAll('.question-block-num').forEach(function (el, i) {
            el.textContent = 'Question ' + (i + 1);
        });
    });

    var ptsInput = block.querySelector('.points-input');
    if (ptsInput) ptsInput.addEventListener('input', updateExamSummary);

    questionsContainer.appendChild(block);
    updateQuestionCount();
}

/**
 * Submit the create exam form.
 */
async function submitCreateExamForm() {
    var title      = document.getElementById('examTitleInput').value.trim();
    var duration   = parseInt(document.getElementById('examDuration').value);
    var subject    = document.getElementById('examSubject').value.trim();
    var difficulty = (document.getElementById('examDifficulty') || {}).value || 'Medium';
    var questions  = [];
    var formError  = null;

    questionsContainer.querySelectorAll('.question-block').forEach(function (block, bi) {
        if (formError) return;
        var qText   = block.querySelector('.question-input').value.trim();
        var opts    = Array.from(block.querySelectorAll('.option-input')).map(function (i) { return i.value.trim(); });
        var radioSel = block.querySelector('input[type="radio"]:checked');
        var correct  = radioSel ? parseInt(radioSel.value) : 0;
        var ptsEl    = block.querySelector('.points-input');
        var pts      = ptsEl ? Math.max(1, parseInt(ptsEl.value) || 1) : 1;

        if (!qText) { formError = 'Question ' + (bi + 1) + ': question text is empty.'; return; }
        if (opts.some(function (o) { return !o; })) { formError = 'Question ' + (bi + 1) + ': all 4 options are required.'; return; }
        questions.push({ question: qText, options: opts, correctAnswer: correct, points: pts });
    });

    if (formError) { alert(formError); return; }
    var pwVal = document.getElementById('examAccessPassword')?.value || '';
    if (!title || !subject || duration <= 0 || questions.length === 0) {
        alert('Please fill in all exam details and add at least one question.');
        return;
    }
    if (!pwVal) {
        alert('Access password is required. Click "Auto-Generate" to create one.');
        return;
    }

    var submitBtn = createExamForm.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating\u2026'; }

    var payload = {
        title: title, subject: subject, difficulty: difficulty, duration: duration, questions: questions,
        passMark:         parseInt(document.getElementById('examPassMark')?.value || '60'),
        shuffleQuestions: document.getElementById('optShuffle')?.checked || false,
        shuffleOptions:   document.getElementById('optShuffleOptions')?.checked || false,
        showCorrectAnswers: document.getElementById('optShowCorrect')?.checked !== false,
        allowReReview:    document.getElementById('optAllowReview')?.checked || false,
        maxAttempts:      parseInt(document.getElementById('optAttempts')?.value || '1'),
        accessPassword:   document.getElementById('examAccessPassword')?.value || '',
        availableFrom:    document.getElementById('examAvailableFrom')?.value || '',
        availableUntil:   document.getElementById('examAvailableUntil')?.value || '',
        category:         document.getElementById('examCategory')?.value || ''
    };

    var res = await apiRequest('teacher_create_exam', payload);

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Publish Exam';
    }

    if (res.status === 'success') {
        createExamModal.classList.add('hidden');
        questionsContainer.innerHTML = '';
        updateQuestionCount();
        showToast('Exam created successfully!', 'success');
        loadTeacherDashboard();
    } else {
        alert(res.message || 'Failed to create exam.');
    }
}

// =========================================================================
// BANK IMPORT PICKER (modal for importing questions from bank into new exam)
// =========================================================================

function openBankImportPicker() {
    var modal = document.getElementById('bankImportModal');
    var searchInput = document.getElementById('bankPickerSearch');
    var subjectSelect = document.getElementById('bankPickerSubject');
    var list = document.getElementById('bankPickerList');
    var closeBtn = document.getElementById('closeBankImport');
    var cancelBtn = document.getElementById('cancelBankImport');
    var confirmBtn = document.getElementById('confirmBankImport');
    var selCount = document.getElementById('bankPickerSelCount');

    modal.classList.remove('hidden');

    // Clone buttons to clear stale listeners
    var newClose = closeBtn.cloneNode(true);
    var newCancel = cancelBtn.cloneNode(true);
    var newConfirm = confirmBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newClose, closeBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

    newClose.addEventListener('click', function () { modal.classList.add('hidden'); });
    newCancel.addEventListener('click', function () { modal.classList.add('hidden'); });

    var selectedIds = [];

    function refreshBankPicker() {
        var search = searchInput.value.trim();
        var subject = subjectSelect.value;
        apiRequest('teacher_get_bank', { search: search, subject: subject }, 'GET').then(function (res) {
            if (res.status !== 'success') { list.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;">Failed to load bank.</div>'; return; }

            // Populate subjects
            if (res.subjects) {
                var curSub = subjectSelect.value;
                subjectSelect.innerHTML = '<option value="">All Subjects</option>';
                res.subjects.forEach(function (s) {
                    var o = document.createElement('option');
                    o.value = s; o.textContent = s;
                    subjectSelect.appendChild(o);
                });
                subjectSelect.value = curSub;
            }

            var questions = res.questions || [];
            list.innerHTML = '';
            if (questions.length === 0) {
                list.innerHTML = '<div style="color:var(--color-text-secondary);padding:1rem;">No questions found.</div>';
                return;
            }

            questions.forEach(function (q) {
                var item = document.createElement('label');
                item.className = 'bank-picker-item';
                item.style.cssText = 'display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0.7rem;border-radius:0.5rem;background:var(--glass-bg);border:1.5px solid var(--color-border);cursor:pointer;transition:border-color 0.15s;';
                var isChecked = selectedIds.indexOf(q.id) !== -1;
                item.innerHTML =
                    '<input type="checkbox" class="bank-picker-check" value="' + q.id + '" ' + (isChecked ? 'checked' : '') + ' style="flex-shrink:0;">' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtmlNotif(q.question) + '</div>' +
                        '<div style="font-size:0.75rem;color:var(--color-text-secondary);">' + (q.subject || '') + (q.difficulty ? ' \u00b7 ' + q.difficulty : '') + '</div>' +
                    '</div>';

                item.querySelector('input').addEventListener('change', function () {
                    var val = parseInt(this.value);
                    if (this.checked) {
                        if (selectedIds.indexOf(val) === -1) selectedIds.push(val);
                    } else {
                        selectedIds = selectedIds.filter(function (id) { return id !== val; });
                    }
                    selCount.textContent = selectedIds.length + ' selected';
                    item.style.borderColor = this.checked ? 'var(--color-primary)' : 'var(--color-border)';
                });
                if (isChecked) item.style.borderColor = 'var(--color-primary)';

                list.appendChild(item);
            });
        });
    }

    // Search/filter
    var newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);
    newSearch.addEventListener('input', refreshBankPicker);

    var newSubject = subjectSelect.cloneNode(true);
    subjectSelect.parentNode.replaceChild(newSubject, subjectSelect);
    newSubject.addEventListener('change', refreshBankPicker);

    selCount.textContent = '0 selected';
    refreshBankPicker();

    newConfirm.addEventListener('click', async function () {
        if (selectedIds.length === 0) { alert('Select at least one question.'); return; }
        var res = await apiRequest('teacher_import_from_bank', { questionIds: selectedIds });
        if (res.status !== 'success' || !res.questions) {
            alert(res.message || 'Failed to import questions.');
            return;
        }
        // Add each imported question to the exam builder
        res.questions.forEach(function (q) {
            var block = document.createElement('div');
            block.className = 'question-block';
            var uid = 'bank_' + q.id + '_' + Date.now();
            block.innerHTML =
                '<div class="question-block-header">' +
                    '<span class="question-block-num">Question</span>' +
                    '<button type="button" class="btn btn-danger btn-small remove-question" style="padding:0.2rem 0.65rem;font-size:0.78rem;">' +
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:3px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg> Remove' +
                    '</button>' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0.6rem;">' +
                    '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Question Text</label>' +
                    '<input type="text" class="form-input question-input" required value="' + escapeHtmlNotif(q.question) + '">' +
                '</div>' +
                '<div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.7rem;">' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">A</span><input type="text" class="form-input option-input" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.options[0] || '') + '"></div>' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">B</span><input type="text" class="form-input option-input" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.options[1] || '') + '"></div>' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">C</span><input type="text" class="form-input option-input" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.options[2] || '') + '"></div>' +
                    '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-weight:800;font-size:0.78rem;color:var(--color-primary);">D</span><input type="text" class="form-input option-input" required style="padding-left:26px;" value="' + escapeHtmlNotif(q.options[3] || '') + '"></div>' +
                '</div>' +
                '<div class="correct-answer-row">' +
                    '<label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Correct Answer:</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="0" ' + (q.correctAnswer == 0 ? 'checked' : '') + '> A</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="1" ' + (q.correctAnswer == 1 ? 'checked' : '') + '> B</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="2" ' + (q.correctAnswer == 2 ? 'checked' : '') + '> C</label>' +
                    '<label class="correct-opt"><input type="radio" name="' + uid + '" value="3" ' + (q.correctAnswer == 3 ? 'checked' : '') + '> D</label>' +
                    '<div class="question-points-input" style="margin-left:auto;"><label>Points:</label><input type="number" class="form-input points-input" min="1" max="100" value="1" style="width:58px;padding:0.3rem 0.5rem;font-size:0.85rem;"></div>' +
                '</div>';

            block.querySelector('.remove-question').addEventListener('click', function () {
                block.remove();
                updateQuestionCount();
                questionsContainer.querySelectorAll('.question-block-num').forEach(function (el, i) { el.textContent = 'Question ' + (i + 1); });
            });

            questionsContainer.appendChild(block);
        });

        updateQuestionCount();
        modal.classList.add('hidden');
        showToast('Imported ' + res.questions.length + ' question(s).', 'success');
    });
}

// =========================================================================
// BULK EXAM IMPORT MODAL
// =========================================================================

function initBulkExamImport() {
    var modal = document.getElementById('bulkExamImportModal');
    var form = document.getElementById('bulkExamImportForm');
    var closeBtn = document.getElementById('closeBulkExamImport');
    var cancelBtn = document.getElementById('cancelBulkExamImport');
    var resultsDiv = document.getElementById('bulkExamImportResults');
    var templateSelect = document.getElementById('bulkExamTemplate');
    var bulkExamImportBtn = document.getElementById('bulkExamImportBtn');

    if (closeBtn) closeBtn.addEventListener('click', function () { modal.classList.add('hidden'); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { modal.classList.add('hidden'); });

    // CSV template download
    var downloadTemplate = document.getElementById('downloadExamCsvTemplate');
    if (downloadTemplate) {
        downloadTemplate.addEventListener('click', function (e) {
            e.preventDefault();
            var csv = 'question,optionA,optionB,optionC,optionD,correctAnswer,points\n' +
                'What is 2+2?,1,2,3,4,3,1\n' +
                'Which planet is closest to the sun?,Venus,Earth,Mercury,Mars,2,1\n' +
                'What is the capital of France?,London,Paris,Berlin,Madrid,1,2\n';
            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'fetenax_exam_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // When the modal opens, load templates into the dropdown
    if (bulkExamImportBtn) {
        bulkExamImportBtn.addEventListener('click', async function () {
            form.reset();
            resultsDiv.style.display = 'none';
            resultsDiv.innerHTML = '';
            // Load templates
            if (templateSelect) {
                templateSelect.innerHTML = '<option value="">\u2014 No template, fill manually \u2014</option>';
                var res = await apiRequest('teacher_list_templates', {}, 'GET');
                if (res.status === 'success' && res.templates) {
                    res.templates.forEach(function (t) {
                        var o = document.createElement('option');
                        o.value = t.id;
                        o.textContent = t.name + ' (' + t.subject + ', ' + t.duration + 'min, ' + t.difficulty + ')';
                        o.dataset.template = JSON.stringify(t);
                        templateSelect.appendChild(o);
                    });
                }
            }
            modal.classList.remove('hidden');
        });
    }

    // When a template is selected, pre-fill the form fields
    if (templateSelect) {
        templateSelect.addEventListener('change', function () {
            var selected = templateSelect.options[templateSelect.selectedIndex];
            if (!selected || !selected.dataset.template) return;
            var t = JSON.parse(selected.dataset.template);
            document.getElementById('bulkExamTitle').value = t.name || '';
            document.getElementById('bulkExamSubject').value = t.subject || '';
            document.getElementById('bulkExamDifficulty').value = t.difficulty || 'Medium';
            document.getElementById('bulkExamDuration').value = t.duration || 30;
        });
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var title = document.getElementById('bulkExamTitle').value.trim();
            var subject = document.getElementById('bulkExamSubject').value.trim();
            var difficulty = document.getElementById('bulkExamDifficulty').value;
            var duration = parseInt(document.getElementById('bulkExamDuration').value);
            var fileInput = document.getElementById('bulkExamCsvFile');

            if (!title || !subject || !fileInput.files.length) {
                alert('Please fill all required fields and upload a CSV file.');
                return;
            }

            var submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Importing\u2026'; }

            var fd = new FormData();
            fd.append('action', 'teacher_bulk_import_exam');
            fd.append('title', title);
            fd.append('subject', subject);
            fd.append('difficulty', difficulty);
            fd.append('duration', duration);
            fd.append('csv', fileInput.files[0]); // API expects 'csv' not 'csvFile'

            try {
                var res = await fetch('api.php', { method: 'POST', body: fd });
                var data = await res.json();
                if (data.status === 'success') {
                    resultsDiv.style.display = 'block';
                    resultsDiv.innerHTML = '<div style="padding:0.85rem;border-radius:0.5rem;background:rgba(46,204,113,0.1);color:#2ecc71;font-weight:600;">' +
                        (data.message || 'Exam created with ' + (data.imported || 0) + ' question(s)!') +
                        '</div>';
                    setTimeout(function () { modal.classList.add('hidden'); loadTeacherDashboard(); }, 1500);
                } else {
                    resultsDiv.style.display = 'block';
                    resultsDiv.innerHTML = '<div style="padding:0.85rem;border-radius:0.5rem;background:rgba(231,76,60,0.1);color:#e74c3c;font-weight:600;">' +
                        (data.message || 'Import failed.') + '</div>';
                }
            } catch (err) {
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = '<div style="color:var(--color-danger);">Network error: ' + err.message + '</div>';
            }

            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;"><polyline points="20 6 9 17 4 12"/></svg> Import & Create Exam'; }
        });
    }
}

// =========================================================================
// BULK IMPORT STUDENTS
// =========================================================================

function initBulkStudentImport() {
    var modal = document.getElementById('bulkImportModal');
    var form = document.getElementById('bulkImportForm');
    var closeBtn = document.getElementById('closeBulkImport');
    var cancelBtn = document.getElementById('cancelBulkImport');
    var resultsDiv = document.getElementById('bulkImportResults');
    var downloadTemplate = document.getElementById('downloadCsvTemplate');

    if (closeBtn) closeBtn.addEventListener('click', function () { modal.classList.add('hidden'); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { modal.classList.add('hidden'); });

    // Bulk import button from student management tab
    var bulkImportBtn = document.getElementById('bulkImportBtn');
    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', function () { modal.classList.remove('hidden'); });
    }

    // Download CSV template
    if (downloadTemplate) {
        downloadTemplate.addEventListener('click', function (e) {
            e.preventDefault();
            var csv = 'name,email,student_id,password\nJohn Doe,john@example.com,12345,welcome123\nJane Smith,jane@example.com,12346,welcome456';
            var blob = new Blob([csv], { type: 'text/csv' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'student_import_template.csv';
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var fileInput = document.getElementById('bulkImportFile');
            if (!fileInput.files.length) { alert('Select a CSV file.'); return; }

            var submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading\u2026'; }

            var fd = new FormData();
            fd.append('action', 'teacher_bulk_import');
            fd.append('csvFile', fileInput.files[0]);

            try {
                var res = await fetch('api.php', { method: 'POST', body: fd });
                var data = await res.json();
                resultsDiv.style.display = 'block';
                if (data.status === 'success') {
                    resultsDiv.innerHTML = '<div style="padding:0.85rem;border-radius:0.5rem;background:rgba(46,204,113,0.1);color:#2ecc71;font-weight:600;">' +
                        'Imported ' + data.imported + ' student(s). ' +
                        (data.errors && data.errors.length > 0 ? data.errors.length + ' error(s)' : '') +
                        '</div>';
                    if (data.errors && data.errors.length > 0) {
                        resultsDiv.innerHTML += '<div style="margin-top:0.5rem;font-size:0.82rem;color:var(--color-danger);">' + data.errors.join('<br>') + '</div>';
                    }
                    setTimeout(function () { modal.classList.add('hidden'); loadTeacherDashboard(); }, 2000);
                } else {
                    resultsDiv.innerHTML = '<div style="padding:0.85rem;border-radius:0.5rem;background:rgba(231,76,60,0.1);color:#e74c3c;font-weight:600;">' +
                        (data.message || 'Import failed.') + '</div>';
                }
            } catch (err) {
                resultsDiv.innerHTML = '<div style="color:var(--color-danger);">Network error.</div>';
            }

            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> Upload & Import'; }
        });
    }
}
