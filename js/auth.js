// js/auth.js - Authentication functions for FetenaX
// No DOMContentLoaded wrapper — functions are called from app.js after DOM is ready.

// =========================================================================
// AUTH UI
// =========================================================================

/**
 * Set auth mode (login vs signup) and update UI.
 * @param {boolean} loginMode
 */
function setAuthMode(loginMode) {
    isLoginMode = loginMode;
    var titleEl    = document.getElementById('authTitle');
    var subtitleEl = document.getElementById('authSubtitle');
    var submitText = document.getElementById('authSubmitText');
    var demoHint   = document.getElementById('authDemoHint');
    var signupFlds = document.getElementById('signupFields');
    var tabLogin   = document.getElementById('authTabLogin');
    var tabSignup  = document.getElementById('authTabSignup');

    if (loginMode) {
        if (titleEl)    titleEl.textContent = 'Welcome back';
        if (subtitleEl) subtitleEl.textContent = 'Sign in to your account to continue';
        if (submitText) submitText.textContent = 'Sign In';
        if (demoHint)   demoHint.style.display = 'flex';
        if (signupFlds) signupFlds.classList.add('hidden');
        if (tabLogin)   tabLogin.classList.add('active');
        if (tabSignup)  tabSignup.classList.remove('active');
    } else {
        if (titleEl)    titleEl.textContent = 'Create your account';
        if (subtitleEl) subtitleEl.textContent = 'Sign up as a student to start taking exams';
        if (submitText) submitText.textContent = 'Create Account';
        if (demoHint)   demoHint.style.display = 'none';
        if (signupFlds) signupFlds.classList.remove('hidden');
        if (tabLogin)   tabLogin.classList.remove('active');
        if (tabSignup)  tabSignup.classList.add('active');
    }
}

/**
 * Show the auth modal and hide everything else.
 */
function showAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('resultsPage').classList.add('hidden');
    document.getElementById('examInterface').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    // Hide the top navbar when login page is showing
    var navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.add('hidden');
    // Hide about page if open
    var aboutPage = document.getElementById('aboutFullPage');
    if (aboutPage) aboutPage.classList.add('hidden');
    document.getElementById('authForm').reset();
    setAuthMode(true);
}

/**
 * Hide the auth modal and show the dashboard.
 */
function hideAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    // Keep navbar hidden — dashboard has its own sidebar
    var navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.add('hidden');
}

// =========================================================================
// AUTH ACTIONS
// =========================================================================

/**
 * Check if user is already logged in via session.
 */
async function checkAuthStatus() {
    var res = await apiRequest('status', {}, 'GET');
    if (res.status === 'success' && res.user) {
        currentUser = res.user;
        hideAuthModal();
        showDashboardForRole(currentUser.role);
    } else {
        showAuthModal();
    }
}

/**
 * Handle logout action.
 */
async function handleLogout() {
    var res = await apiRequest('logout');
    if (res.status === 'success') {
        currentUser = null;
        showAuthModal();
    }
}
