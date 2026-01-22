// ========================================
// PROFILE FUNCTIONS
// ========================================

import { API_URL, appData, statsChart } from './config.js';
import { renderCalendar } from './calendar.js';
import { updateStats } from './stats.js';
import { customAlert, customConfirm } from './modals.js';

// Change password
export async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    
    if (!currentPassword || !newPassword) {
        customAlert('Please fill in both current and new password fields.', 'Missing Information');
        return;
    }
    
    if (newPassword.length < 4) {
        customAlert('New password must be at least 4 characters long for security.', 'Password Too Short');
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
        
        customAlert('Your password has been changed successfully!', '✅ Success');
        
    } catch (error) {
        customAlert(error.message || 'An unknown error occurred. Please try again.', '❌ Password Change Failed');
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
export async function exportData() {
    const userData = appData.users[appData.currentUser];
    const exportDataObj = {
        username: appData.currentUser,
        tags: userData.tags,
        entries: userData.entries,
        goals: userData.goals,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportDataObj, null, 2);
    
    const confirmation = await customConfirm(
        'Do you want to copy your data to the clipboard? This is useful for transferring it to another device.', 
        'Export Data'
    );

    if (confirmation) {
        try {
            await navigator.clipboard.writeText(dataStr);
            customAlert('Your data has been copied to the clipboard. You can now paste it on another device.', '✅ Copied!');
        } catch (err) {
            customAlert('Failed to copy data to clipboard. Your browser might not support this feature or permission was denied.', 'Copy Failed');
        }
    } else {
        try {
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `routlin-data-${appData.currentUser}-${new Date().toISOString().split('T')[0]}.json`;
            
            // Append to body, click, and then remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        } catch (err) {
            customAlert('Failed to download your data file.', 'Download Failed');
        }
    }
}
