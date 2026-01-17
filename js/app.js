// ========================================
// MAIN APP – ENTRY POINT
// ========================================

// Imports from other modules
import { appData, setAppData } from './config.js';
import { togglePassword } from './utils.js';
import { loadData, saveData } from './data.js';
import { toggleAuthForm, signup, login, logout, deleteAccount, initAuthListeners } from './auth.js';
import { renderCalendar, changeMonth, openTagSelectionModal, closeTagSelectionModal, saveTagSelection } from './calendar.js';
import { renderTags, openAddTagModal, closeAddTagModal, saveNewTag, openEditTagModal, closeEditTagModal, saveEditTag, deleteTag, tryCustomColor } from './tags.js';
import { updateStats, setTrendPeriod, tryPremiumFeature } from './stats.js';
import { openAddGoalModal, closeAddGoalModal, saveGoal, updateGoals, deleteGoal } from './goals.js';
import { changePassword, toggleDarkMode, exportData, openImportModal, closeImportModal, importData } from './profile.js';
import { renderHealthTab, openHealthSetup, closeHealthSetup, saveHealthSetup, openLogPeriodModal, closeLogPeriodModal, logPeriod, openEditHealthSettings, closeEditHealthSettings, saveHealthSettings } from './health.js';

// Make functions globally accessible for onclick handlers
window.togglePassword = togglePassword;
window.toggleAuthForm = toggleAuthForm;
window.signup = signup;
window.login = login;
window.logout = logout;
window.deleteAccount = deleteAccount;
window.initAuthListeners = initAuthListeners;
window.renderCalendar = renderCalendar;
window.changeMonth = changeMonth;
window.openTagSelectionModal = openTagSelectionModal;
window.closeTagSelectionModal = closeTagSelectionModal;
window.saveTagSelection = saveTagSelection;
window.renderTags = renderTags;
window.openAddTagModal = openAddTagModal;
window.closeAddTagModal = closeAddTagModal;
window.saveNewTag = saveNewTag;
window.openEditTagModal = openEditTagModal;
window.closeEditTagModal = closeEditTagModal;
window.saveEditTag = saveEditTag;
window.deleteTag = deleteTag;
window.tryCustomColor = tryCustomColor;
window.updateStats = updateStats;
window.setTrendPeriod = setTrendPeriod;
window.tryPremiumFeature = tryPremiumFeature;
window.openAddGoalModal = openAddGoalModal;
window.closeAddGoalModal = closeAddGoalModal;
window.saveGoal = saveGoal;
window.updateGoals = updateGoals;
window.deleteGoal = deleteGoal;
window.changePassword = changePassword;
window.toggleDarkMode = toggleDarkMode;
window.exportData = exportData;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.importData = importData;
window.openHealthSetup = openHealthSetup;
window.closeHealthSetup = closeHealthSetup;
window.saveHealthSetup = saveHealthSetup;
window.openLogPeriodModal = openLogPeriodModal;
window.closeLogPeriodModal = closeLogPeriodModal;
window.logPeriod = logPeriod;
window.openEditHealthSettings = openEditHealthSettings;
window.closeEditHealthSettings = closeEditHealthSettings;
window.saveHealthSettings = saveHealthSettings;

// Initialize application
function init() {
    loadData();
    initAuthListeners();

    // Default Dark Mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === null || savedDarkMode === 'true') {
        document.body.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark');
    }

    // Update toggle checkbox
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = document.body.classList.contains('dark');
    }

    // Health initialization
    initHealthData();

    // Show main app if session exists
    if (appData.currentUser && appData.sessionToken) {
        showMainApp();
    } else {
        console.log('No active session');
    }
}

// Show main UI after authentication
function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('profileUsername').textContent = appData.currentUser;

    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('darkModeToggle').checked = savedDarkMode;
    if (savedDarkMode) document.body.classList.add('dark');

    renderCalendar();
    renderTags();
    renderHealthTab();   // <-- NEW: render health tab on load
}

// Switch visible tab
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const tabElement = document.getElementById(tab + 'Tab');
    if (tabElement) tabElement.classList.add('active');
    event.currentTarget.classList.add('active');

    // Load specific content for each tab
    if (tab === 'stats') updateStats();
    else if (tab === 'tags') renderTags();
    else if (tab === 'health') renderHealthTab();   // NEW
}

// Detect tab switch from nav
document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) {
        switchTab(e.target.closest('.nav-item').dataset.tab);
    }
});

/* Keyboard shortcuts for power users */
window.addEventListener('keydown', (e) => {
    if (e.key === 'c' && !e.target?.matches('.input-field')) {
        switchTab('calendar');
    }
    if (e.key === 't' && !e.target?.matches('.input-field')) {
        switchTab('tags');
    }
    if (e.key === 's' && !e.target?.matches('.input-field')) {
        switchTab('stats');
    }
    if (e.key === 'p' && !e.target?.matches('.input-field')) {
        switchTab('profile');
    }
    if (e.key === 'n' && !e.target?.matches('.input-field')) {
        openAddTagModal();
    }
});

/* Initialize on page load */
init();
