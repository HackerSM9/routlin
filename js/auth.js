// ========================================
// AUTHENTICATION
// ========================================

import { API_URL, appData, setAppData } from './config.js';
import { saveData } from './data.js';
import { showMainApp } from './app.js';
import { vibrateLogin, vibrateDeleteAccount } from './haptics.js';

// Initialize auth event listeners (call this on page load)
export function initAuthListeners() {
    // Login form - Enter key handling
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    
    if (loginUsername) {
        loginUsername.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginPassword.focus();
            }
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
    
    // Signup form - Enter key handling
    const signupUsername = document.getElementById('signupUsername');
    const signupPassword = document.getElementById('signupPassword');
    const signupConfirmPassword = document.getElementById('signupConfirmPassword');
    
    if (signupUsername) {
        signupUsername.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                signupPassword.focus();
            }
        });
    }
    
    if (signupPassword) {
        signupPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                signupConfirmPassword.focus();
            }
        });
    }
    
    if (signupConfirmPassword) {
        signupConfirmPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                signup();
            }
        });
    }
}

// Toggle between login and signup forms
export function toggleAuthForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authError = document.getElementById('authError');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
    authError.style.display = 'none';
}

// Signup function
export async function signup() {
    const username = document.getElementById('signupUsername').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const authError = document.getElementById('authError');
    
    if (!username || !password || !confirmPassword) {
        authError.textContent = 'Please fill in all fields';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
        return;
    }
    
    if (password !== confirmPassword) {
        authError.textContent = 'Passwords do not match';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
        return;
    }
    
    if (username.length < 3) {
        authError.textContent = 'Username must be at least 3 characters';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
        return;
    }
    
    if (password.length < 4) {
        authError.textContent = 'Password must be at least 4 characters';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
        return;
    }
    
    try {
        authError.textContent = 'Creating account...';
        authError.className = 'mt-4 p-3 bg-blue-100 text-blue-700 rounded-lg text-sm';
        authError.style.display = 'block';
        
        const response = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Signup failed');
        }
        
        vibrateDeleteAccount(); // Strong vibration for account creation

        // Auto-login after signup
        appData.currentUser = data.username;
        appData.sessionToken = data.sessionToken;
        appData.users[data.username] = {
            tags: data.userData.tags || [],
            entries: data.userData.entries || {},
            goals: data.userData.goals || [],
            health: data.userData.health || null
        };
        
        saveData();
        
        const verification = localStorage.getItem('activityTrackerData');
        if (!verification) {
            console.error('⚠️ Failed to save to localStorage!');
            alert('Warning: Session may not persist after refresh. Please check browser settings.');
        } else {
            console.log('✅ Account created and session saved');
        }
        
        authError.style.display = 'none';
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupConfirmPassword').value = '';
        
        showMainApp();
        
    } catch (error) {
        authError.textContent = error.message || 'Failed to create account. Please try again.';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
    }
}

// Login function
export async function login() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const authError = document.getElementById('authError');
    
    if (!username || !password) {
        authError.textContent = 'Please fill in all fields';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
        return;
    }
    
    try {
        authError.textContent = 'Logging in...';
        authError.className = 'mt-4 p-3 bg-blue-100 text-blue-700 rounded-lg text-sm';
        authError.style.display = 'block';
        
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Login failed');
        }
        
        appData.currentUser = data.username;
        appData.sessionToken = data.sessionToken;
        appData.users[data.username] = {
            tags: data.userData.tags || [],
            entries: data.userData.entries || {},
            goals: data.userData.goals || [],
            health: data.userData.health || null
        };
        
        saveData();
        
        const verification = localStorage.getItem('activityTrackerData');
        if (!verification) {
            console.error('⚠️ Failed to save to localStorage!');
            alert('Warning: Session may not persist after refresh. Please check browser settings.');
        } else {
            console.log('✅ Session saved successfully');
        }
        
        authError.style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        showMainApp();
        
    } catch (error) {
        authError.textContent = error.message || 'Failed to login. Please check your credentials.';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
    }
}

// Logout function
export function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    vibrateLogin(); // Vibration for logout
    appData.currentUser = null;
    appData.sessionToken = null;
    localStorage.removeItem('activityTrackerData');
    
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    console.log('✅ Logged out successfully');
}

// Delete account function
export async function deleteAccount() {
    const confirmation1 = confirm('⚠️ WARNING: Are you absolutely sure you want to DELETE your account?\n\nThis will permanently remove:\n• Your username\n• All your tags\n• All your activity data\n• All your goals\n• All your health data\n• Everything associated with your account\n\nThis action CANNOT be undone!');
    
    if (!confirmation1) {
        return;
    }
    
    const confirmation2 = confirm('FINAL WARNING: This is your last chance!\n\nType your username mentally and confirm deletion.\n\nClick OK to PERMANENTLY DELETE your account.');
    
    if (!confirmation2) {
        return;
    }
    
    vibrateDeleteAccount(); // Strong vibration for deletion

    try {
        const response = await fetch(`${API_URL}/api/delete-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: appData.currentUser,
                sessionToken: appData.sessionToken
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to delete account');
        }
        
        alert('✅ Your account has been permanently deleted.\n\nAll your data has been removed from our servers.\n\nGoodbye!');
        
        appData.currentUser = null;
        appData.sessionToken = null;
        localStorage.removeItem('activityTrackerData');
        
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        
    } catch (error) {
        alert('❌ Failed to delete account: ' + (error.message || 'Please try again later.'));
    }
}
