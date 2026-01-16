// ========================================
// PROFILE FUNCTIONS
// ========================================

import { API_URL, appData, statsChart } from './config.js';
import { renderCalendar } from './calendar.js';
import { updateStats } from './stats.js';

// Change password
export async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    
    if (!currentPassword || !newPassword) {
        alert('Please fill in both fields');
        return;
    }
    
    if (newPassword.length < 4) {
        alert('New password must be at least 4 characters');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: appData.currentUser,
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        
        alert('✅ Password changed successfully!');
        
    } catch (error) {
        alert('❌ ' + (error.message || 'Failed to change password. Please try again.'));
    }
}

// Toggle dark mode
export function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark);
    renderCalendar();
    
    if (statsChart) {
        updateStats();
    }
}

// Export data
export function exportData() {
    const userData = appData.users[appData.currentUser];
    const exportDataObj = {
        username: appData.currentUser,
        tags: userData.tags,
        entries: userData.entries,
        goals: userData.goals,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportDataObj, null, 2);
    
    if (confirm('Do you want to copy the data code to clipboard? (Useful for pasting on another device)')) {
        navigator.clipboard.writeText(dataStr).then(() => {
            alert('Data copied to clipboard! Open the app on your other device, go to Login > Transfer Data, and paste it there.');
        });
    } else {
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-tracker-${appData.currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}
