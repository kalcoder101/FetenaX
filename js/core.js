// js/core.js - FetenaX global state, utilities, and constants
// Loaded first. No DOMContentLoaded wrapper — state/functions become global.

// =========================================================================
// STATE VARIABLES
// =========================================================================

/** @var {object|null} Current logged-in user */
var currentUser = null;

/** @var {boolean} Whether auth form is in login (true) or signup (false) mode */
var isLoginMode = true;

/** @var {object} Search cache populated when dashboards load */
var searchCache = { exams: [], students: [], attempts: [] };

/** @var {object|null} Current exam being taken */
var currentExam = null;

/** @var {array|null} Answers for current exam (per question index) */
var currentExamAnswers = [];

/** @var {array|null} Flag state for current exam */
var currentExamFlags = [];

/** @var {number} Current question index (0-based) */
var currentExamIndex = 0;

/** @var {number} Timestamp when exam started */
var currentExamStartTime = 0;

/** @var {number|null} Timer interval handle */
var examTimerInterval = null;

/** @var {number} Anti-cheat warning count (3 = auto-submit) */
var warningsCount = 0;

/** @var {string} CSRF token for API requests (set after status check) */
var csrfToken = '';

// =========================================================================
// SVG ICON LIBRARY
// =========================================================================

var ICONS = {
    login: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none" /><path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" stroke-width="2" fill="none" /></svg>',
    signup: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none" /><path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" stroke="currentColor" stroke-width="2" fill="none" /><path d="M19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>',
    chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
    fileLg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
    users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
};

// =========================================================================
// UTILITY FUNCTIONS
// =========================================================================

/**
 * Determine whether the supplied role is a student role.
 * @param {string} role
 * @returns {boolean}
 */
function isStudentRole(role) {
    return role === 'student';
}

/**
 * Determine whether the supplied role is teacher-like (teacher or system admin).
 * @param {string} role
 * @returns {boolean}
 */
function isTeacherRole(role) {
    return role === 'teacher' || role === 'system_admin';
}

/**
 * Format seconds into MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainingSeconds).padStart(2, '0');
}

/**
 * Make an API request to api.php.
 * @param {string} action
 * @param {object} [data={}]
 * @param {string} [method='POST']
 * @returns {Promise<object>}
 */
async function apiRequest(action, data, method) {
    if (!method) method = 'POST';
    if (!data) data = {};
    var url = 'api.php';
    var options = { method: method, headers: {} };

    if (method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(Object.assign({ action: action, _csrf: csrfToken }, data));
    } else {
        var params = new URLSearchParams(Object.assign({ action: action }, data)).toString();
        url = url + '?' + params;
    }

    try {
        var response = await fetch(url, options);
        // Check if response is OK (200-299)
        if (!response.ok) {
            console.error('API returned HTTP', response.status);
            return { status: 'error', message: 'Server error (HTTP ' + response.status + '). Please try again.' };
        }
        // Try to parse as JSON
        var text = await response.text();
        try {
            return JSON.parse(text);
        } catch (parseErr) {
            console.error('API returned non-JSON:', text.substring(0, 200));
            return { status: 'error', message: 'Server returned an invalid response. Please try again.' };
        }
    } catch (error) {
        console.error('API request failed:', error);
        return { status: 'error', message: 'Network error. Please check your connection and try again.' };
    }
}

/**
 * Show a custom confirmation modal.
 * @param {string} title
 * @param {string} message
 * @param {function} onConfirm
 */
function showCustomConfirm(title, message, onConfirm) {
    var modal = document.getElementById('customConfirmModal');
    var titleEl = document.getElementById('confirmModalTitle');
    var msgEl = document.getElementById('confirmModalMessage');
    var okBtn = document.getElementById('confirmOkBtn');
    var cancelBtn = document.getElementById('confirmCancelBtn');

    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove('hidden');

    var newOkBtn = okBtn.cloneNode(true);
    var newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', function () {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    });
    newCancelBtn.addEventListener('click', function () { modal.classList.add('hidden'); });
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {string} [type='success']
 */
function showToast(message, type) {
    if (!type) type = 'success';
    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
        document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    var bg = type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)';
    toast.style.cssText = 'background:' + bg + ';color:#fff;padding:0.65rem 1.2rem;border-radius:0.65rem;font-size:0.9rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);transform:translateY(8px);opacity:0;transition:all 0.25s;pointer-events:auto;font-family:\'Plus Jakarta Sans\',\'Inter\',sans-serif;';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
    setTimeout(function () {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)';
        setTimeout(function () { toast.remove(); }, 300);
    }, 3200);
}

/**
 * Escape HTML entities for safe insertion into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlNotif(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
