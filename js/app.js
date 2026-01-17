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
import { initHealthData, renderHealthTab, openHealthSetup, closeHealthSetup, saveHealthSetup, openLogPeriodModal, closeLogPeriodModal, logPeriod, openEditHealthSettings, closeEditHealthSettings, saveHealthSettings } from './health.js';

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

    // ✅ FIX: Only show main app if session exists
    // DO NOT call initHealthData() here - it needs a logged-in user!
    if (appData.currentUser && appData.sessionToken) {
        console.log('✅ Session found for user:', appData.currentUser);
        showMainApp();
    } else {
        console.log('❌ No active session found');
        // Clear any stale data
        setAppData({
            users: appData.users || {},
            currentUser: null,
            sessionToken: null
        });
    }
}

// Show main UI after authentication
export function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('profileUsername').textContent = appData.currentUser;

    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('darkModeToggle').checked = savedDarkMode;
    if (savedDarkMode) document.body.classList.add('dark');

    // ✅ FIX: Initialize health data AFTER user is logged in
    initHealthData();

    renderCalendar();
    renderTags();
    renderHealthTab();
    updateStats();
}

// Switch visible tab
export function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const tabElement = document.getElementById(tab + 'Tab');
    if (tabElement) tabElement.classList.add('active');
    
    // Get the clicked nav item and mark it active
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        const tabName = ['calendar', 'tags', 'stats', 'health', 'profile'][index];
        if (tabName === tab) {
            item.classList.add('active');
        }
    });

    // Load specific content for each tab
    if (tab === 'stats') updateStats();
    else if (tab === 'tags') renderTags();
    else if (tab === 'health') renderHealthTab();
}

// Make switchTab globally available
window.switchTab = switchTab;
window.showMainApp = showMainApp;

/* Keyboard shortcuts for power users */
window.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.matches('input, textarea, select')) return;
    
    if (e.key === 'c') switchTab('calendar');
    if (e.key === 't') switchTab('tags');
    if (e.key === 's') switchTab('stats');
    if (e.key === 'h') switchTab('health');
    if (e.key === 'p') switchTab('profile');
    if (e.key === 'n') openAddTagModal();
});

/* Initialize on page load */
init();
