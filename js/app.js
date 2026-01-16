// ========================================
// MAIN APP - CONNECTS ALL MODULES
// ========================================

// Import all modules
import { appData, setAppData } from './config.js';
import { togglePassword } from './utils.js';
import { loadData, saveData } from './data.js';
import { toggleAuthForm, signup, login, logout, deleteAccount, initAuthListeners } from './auth.js';
import { renderCalendar, changeMonth, openTagSelectionModal, closeTagSelectionModal, saveTagSelection } from './calendar.js';
import { renderTags, openAddTagModal, closeAddTagModal, saveNewTag, openEditTagModal, closeEditTagModal, saveEditTag, deleteTag, tryCustomColor } from './tags.js';
import { updateStats, setTrendPeriod, tryPremiumFeature } from './stats.js';
import { openAddGoalModal, closeAddGoalModal, saveGoal, updateGoals, deleteGoal } from './goals.js';
import { changePassword, toggleDarkMode, exportData } from './profile.js';

// Initialize the app
function init() {
    loadData();
    
    // Initialize auth keyboard listeners
    initAuthListeners();
    
    // Default to Dark Mode if not set
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === null || savedDarkMode === 'true') {
        document.body.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark');
    }
    
    // Update toggle checkbox based on current state
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = document.body.classList.contains('dark');
    }

    // Check if user session exists
    if (appData.currentUser && appData.sessionToken) {
        console.log('✅ Session found for user:', appData.currentUser);
        showMainApp();
    } else {
        console.log('❌ No active session found');
        setAppData({
            users: {},
            currentUser: null,
            sessionToken: null
        });
        localStorage.removeItem('activityTrackerData');
    }
}

// Show main app after login
export function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('profileUsername').textContent = appData.currentUser;
    
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('darkModeToggle').checked = savedDarkMode;
    if (savedDarkMode) {
        document.body.classList.add('dark');
    }
    
    renderCalendar();
    renderTags();
    updateStats();
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tab + 'Tab').classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tab === 'stats') {
        updateStats();
    } else if (tab === 'tags') {
        renderTags();
    }
}

// Make all functions globally available for HTML onclick handlers
window.togglePassword = togglePassword;
window.toggleAuthForm = toggleAuthForm;
window.signup = signup;
window.login = login;
window.logout = logout;
window.deleteAccount = deleteAccount;
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
window.switchTab = switchTab;
window.showMainApp = showMainApp;

// Initialize on page load
init();
