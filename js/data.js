// ========================================
// DATA PERSISTENCE
// ========================================

import { API_URL, appData, setAppData } from './config.js';

// Save data to localStorage and sync to cloud
export async function saveData() {
    localStorage.setItem('activityTrackerData', JSON.stringify(appData));
    
    if (appData.currentUser && appData.sessionToken) {
        try {
            const userData = appData.users[appData.currentUser];
            
            await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: appData.currentUser,
                    sessionToken: appData.sessionToken,
                    userData: {
                        tags: userData.tags,
                        entries: userData.entries,
                        goals: userData.goals,
                        health: userData.health || null
                    }
                })
            });
            
            console.log('✅ Data synced to cloud (including health data)');
        } catch (error) {
            console.warn('⚠️ Cloud sync failed, data saved locally:', error);
        }
    }
}

// Load data from localStorage
export function loadData() {
    const savedData = localStorage.getItem('activityTrackerData');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            setAppData(parsed);
            console.log('📦 Loaded data from localStorage');
        } catch (error) {
            console.error('❌ Failed to parse saved data:', error);
            localStorage.removeItem('activityTrackerData');
        }
    }
}
