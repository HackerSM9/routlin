// health.js

// ========================================
// HEALTH / PERIOD TRACKING
// ========================================

import { appData } from './config.js';
import { saveData } from './data.js';
import { renderCalendar } from './calendar.js';

// Initialize health data structure for user
export function initHealthData() {
    const userData = appData.users[appData.currentUser];
    if (!userData.health) {
        userData.health = {
            avgCycleLength: 28,
            avgPeriodDuration: 5,
            lastPeriodStart: null,
            entries: []
        };
    }
}

// Render health tab
export function renderHealthTab() {
    initHealthData();
    const userData = appData.users[appData.currentUser];
    const health = userData.health;
    const healthContent = document.getElementById('healthContent');

    // First-time setup
    if (!health.lastPeriodStart || health.entries.length === 0) {
        healthContent.innerHTML = `
            <div class="stats-card">
                <h3 class="font-semibold mb-4 text-center">🩷 Welcome to Health Tracking</h3>
                <p class="text-sm text-gray-600 mb-4 text-center">Track your menstrual cycle to get predictions and insights</p>
                <button onclick="openHealthSetup()" class="btn btn-primary w-full">Get Started</button>
            </div>
        `;
        return;
    }

    // Calculate current cycle info
    const cycleInfo = calculateCurrentCycle();
    const predictions = calculatePredictions();

    healthContent.innerHTML = `
        <div class="stats-card mb-4">
            <h3 class="font-semibold mb-3 text-center text-lg">Current Cycle</h3>
            <div class="text-center mb-4">
                <p class="text-3xl font-bold text-pink-600">Day ${cycleInfo.currentDay}/${health.avgCycleLength}</p>
            </div>
            
            ${cycleInfo.nextPeriod ? `
                <div class="text-center mb-4">
                    <p class="text-sm text-gray-600">Next Period in</p>
                    <p class="text-xl font-semibold">${cycleInfo.daysUntilNext} days</p>
                    <p class="text-sm text-gray-500">Expected: ${formatDate(cycleInfo.nextPeriod)}</p>
                </div>
            ` : ''}

            <button onclick="openLogPeriodModal()" class="btn btn-primary w-full">
                📅 Log Period Started
            </button>
        </div>

        <div class="stats-card mb-4">
            <h3 class="font-semibold mb-3">Recent History</h3>
            <div class="space-y-2">
                ${renderPeriodHistory()}
            </div>
        </div>

        <div class="stats-card">
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-semibold">Settings</h3>
                <button onclick="openEditHealthSettings()" class="btn btn-secondary" style="padding: 6px 16px; font-size: 14px;">Edit</button>
            </div>
            <div class="space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-sm">Average Cycle</span>
                    <span class="font-medium">${health.avgCycleLength} days</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm">Period Duration</span>
                    <span class="font-medium">${health.avgPeriodDuration} days</span>
                </div>
            </div>
        </div>
    `;
}

// Calculate current cycle day and next period
function calculateCurrentCycle() {
    const userData = appData.users[appData.currentUser];
    const health = userData.health;
    
    if (!health.lastPeriodStart) return { currentDay: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastPeriod = new Date(health.lastPeriodStart);
    lastPeriod.setHours(0, 0, 0, 0);

    const daysSinceLast = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
    const currentDay = (daysSinceLast % health.avgCycleLength) + 1;

    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setDate(lastPeriod.getDate() + health.avgCycleLength);
    
    // If we've passed the predicted date, add another cycle
    while (nextPeriod <= today) {
        nextPeriod.setDate(nextPeriod.getDate() + health.avgCycleLength);
    }

    const daysUntilNext = Math.floor((nextPeriod - today) / (1000 * 60 * 60 * 24));

    return {
        currentDay,
        nextPeriod: nextPeriod.toISOString().split('T')[0],
        daysUntilNext
    };
}

// Calculate next 3 months of predictions
export function calculatePredictions() {
    const userData = appData.users[appData.currentUser];
    const health = userData.health;
    
    if (!health || !health.lastPeriodStart) return [];

    const predictions = [];
    const lastPeriod = new Date(health.lastPeriodStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextPeriod = new Date(lastPeriod);
    
    // Find the next period after today
    while (nextPeriod <= today) {
        nextPeriod.setDate(nextPeriod.getDate() + health.avgCycleLength);
    }

    // Generate 3 months of predictions
    for (let i = 0; i < 3; i++) {
        const start = new Date(nextPeriod);
        const end = new Date(nextPeriod);
        end.setDate(end.getDate() + health.avgPeriodDuration - 1);

        predictions.push({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });

        nextPeriod.setDate(nextPeriod.getDate() + health.avgCycleLength);
    }

    return predictions;
}

// Get all period dates (confirmed + predicted)
export function getAllPeriodDates() {
    const userData = appData.users[appData.currentUser];
    const health = userData.health;
    
    if (!health) return { confirmed: [], predicted: [] };

    const confirmed = [];
    const predicted = [];

    // Confirmed periods
    health.entries.forEach(entry => {
        if (entry.startDate && entry.endDate) {
            const start = new Date(entry.startDate);
            const end = new Date(entry.endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                confirmed.push(d.toISOString().split('T')[0]);
            }
        }
    });

    // Predicted periods
    const predictions = calculatePredictions();
    predictions.forEach(pred => {
        const start = new Date(pred.start);
        const end = new Date(pred.end);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            predicted.push(d.toISOString().split('T')[0]);
        }
    });

    return { confirmed, predicted };
}

// Render period history
function renderPeriodHistory() {
    const userData = appData.users[appData.currentUser];
    const health = userData.health;

    if (health.entries.length === 0) {
        return '<p class="text-sm text-gray-500">No history yet</p>';
    }

    return health.entries
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 6)
        .map(entry => {
            const start = formatDate(entry.startDate);
            const end = entry.endDate ? formatDate(entry.endDate) : 'Ongoing';
            const duration = entry.duration || '?';
            
            return `
                <div class="flex justify-between items-center text-sm border-b pb-2">
                    <span>${start} - ${end}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-gray-500">${duration} days</span>
                        <div class="flex gap-2">
                            <button onclick="openEditPeriodEntry('${entry.id}')" class="text-blue-500 text-xs font-semibold hover:underline">Edit</button>
                            <button onclick="deletePeriodEntry('${entry.id}')" class="text-red-500 text-xs font-semibold hover:underline" title="Delete Entry">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
}

// Format date helper
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Open health setup modal
export function openHealthSetup() {
    document.getElementById('healthSetupModal').classList.add('active');
    document.getElementById('setupLastPeriod').value = '';
    document.getElementById('setupCycleLength').value = 28;
    document.getElementById('setupPeriodDuration').value = 5;
}

// Close health setup modal
export function closeHealthSetup() {
    document.getElementById('healthSetupModal').classList.remove('active');
}

// Save health setup
export function saveHealthSetup() {
    const lastPeriod = document.getElementById('setupLastPeriod').value;
    const cycleLength = parseInt(document.getElementById('setupCycleLength').value);
    const periodDuration = parseInt(document.getElementById('setupPeriodDuration').value);

    if (!lastPeriod) {
        alert('Please enter your last period start date');
        return;
    }

    if (cycleLength < 21 || cycleLength > 45) {
        alert('Cycle length must be between 21 and 45 days');
        return;
    }

    if (periodDuration < 3 || periodDuration > 10) {
        alert('Period duration must be between 3 and 10 days');
        return;
    }

    const userData = appData.users[appData.currentUser];
    userData.health = {
        avgCycleLength: cycleLength,
        avgPeriodDuration: periodDuration,
        lastPeriodStart: lastPeriod,
        entries: []
    };

    // Add first entry
    const endDate = new Date(lastPeriod);
    endDate.setDate(endDate.getDate() + periodDuration - 1);

    userData.health.entries.push({
        id: Date.now().toString(),
        startDate: lastPeriod,
        endDate: endDate.toISOString().split('T')[0],
        duration: periodDuration,
        cycleLength: null
    });

    saveData();
    closeHealthSetup();
    renderHealthTab();
    renderCalendar();
}

// Open log period modal
export function openLogPeriodModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('logPeriodModal').classList.add('active');
    document.getElementById('logPeriodDate').value = today;
}

// Close log period modal
export function closeLogPeriodModal() {
    document.getElementById('logPeriodModal').classList.remove('active');
}

// Log new period
export function logPeriod() {
    const startDate = document.getElementById('logPeriodDate').value;

    if (!startDate) {
        alert('Please select a date');
        return;
    }

    const userData = appData.users[appData.currentUser];
    const health = userData.health;

    // Calculate cycle length from last period
    let cycleLength = null;
    if (health.lastPeriodStart) {
        const last = new Date(health.lastPeriodStart);
        const current = new Date(startDate);
        cycleLength = Math.floor((current - last) / (1000 * 60 * 60 * 24));
    }

    // Create new entry
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + health.avgPeriodDuration - 1);

    health.entries.push({
        id: Date.now().toString(),
        startDate: startDate,
        endDate: endDate.toISOString().split('T')[0],
        duration: health.avgPeriodDuration,
        cycleLength: cycleLength
    });

    health.lastPeriodStart = startDate;

    // Recalculate average if we have 3+ entries
    if (health.entries.length >= 3) {
        const cycleLengths = health.entries
            .filter(e => e.cycleLength)
            .map(e => e.cycleLength);
        
        if (cycleLengths.length >= 2) {
            health.avgCycleLength = Math.round(
                cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
            );
        }
    }

    saveData();
    closeLogPeriodModal();
    renderHealthTab();
    renderCalendar();
}

// Open edit period entry modal
export function openEditPeriodEntry(entryId) {
    const userData = appData.users[appData.currentUser];
    const health = userData.health;
    const entry = health.entries.find(e => e.id === entryId);

    if (!entry) return;

    // IMPORTANT: Make sure index.html has a modal with id="editPeriodModal"
    // If not, this part will fail silently or throw error in console.
    // Assuming you will fix HTML or already have it locally.
    const modal = document.getElementById('editPeriodModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('editPeriodEntryId').value = entryId;
        document.getElementById('editPeriodStartDate').value = entry.startDate;
        document.getElementById('editPeriodEndDate').value = entry.endDate;
    } else {
        alert("Edit Modal not found in HTML. Please ensure index.html includes the editPeriodModal structure.");
    }
}

// Close edit period entry modal
export function closeEditPeriodEntry() {
    const modal = document.getElementById('editPeriodModal');
    if (modal) modal.classList.remove('active');
}

// Save edited period entry
export function saveEditPeriodEntry() {
    const entryId = document.getElementById('editPeriodEntryId').value;
    const startDate = document.getElementById('editPeriodStartDate').value;
    const endDate = document.getElementById('editPeriodEndDate').value;

    if (!startDate || !endDate) {
        alert('Please fill in both dates');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
        alert('End date cannot be before start date');
        return;
    }

    const duration = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const userData = appData.users[appData.currentUser];
    const health = userData.health;
    const entry = health.entries.find(e => e.id === entryId);

    if (!entry) return;

    entry.startDate = startDate;
    entry.endDate = endDate;
    entry.duration = duration;

    // Update lastPeriodStart if this is the most recent entry
    const sortedEntries = health.entries.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    if (sortedEntries[0].id === entryId) {
        health.lastPeriodStart = startDate;
    }

    saveData();
    closeEditPeriodEntry();
    renderHealthTab();
    renderCalendar();
}

// Delete period entry
export function deletePeriodEntry(entryId) {
    if (!confirm('Are you sure you want to delete this period entry?')) {
        return;
    }

    const userData = appData.users[appData.currentUser];
    const health = userData.health;

    // Filter out the entry
    health.entries = health.entries.filter(e => e.id !== entryId);

    // Update lastPeriodStart to the most recent entry
    if (health.entries.length > 0) {
        const sortedEntries = health.entries.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        health.lastPeriodStart = sortedEntries[0].startDate;
    } else {
        health.lastPeriodStart = null;
    }

    saveData();
    // Use the existing modal closer just in case this was called from inside a modal, 
    // though usually it is called from the list.
    const modal = document.getElementById('editPeriodModal');
    if (modal && modal.classList.contains('active')) {
        closeEditPeriodEntry();
    }
    
    renderHealthTab();
    renderCalendar();
}

// Open edit health settings
export function openEditHealthSettings() {
    const userData = appData.users[appData.currentUser];
    const health = userData.health;

    document.getElementById('editHealthModal').classList.add('active');
    document.getElementById('editCycleLength').value = health.avgCycleLength;
    document.getElementById('editPeriodDuration').value = health.avgPeriodDuration;
}

// Close edit health settings
export function closeEditHealthSettings() {
    document.getElementById('editHealthModal').classList.remove('active');
}

// Save health settings
export function saveHealthSettings() {
    const cycleLength = parseInt(document.getElementById('editCycleLength').value);
    const periodDuration = parseInt(document.getElementById('editPeriodDuration').value);

    if (cycleLength < 21 || cycleLength > 45) {
        alert('Cycle length must be between 21 and 45 days');
        return;
    }

    if (periodDuration < 3 || periodDuration > 10) {
        alert('Period duration must be between 3 and 10 days');
        return;
    }

    const userData = appData.users[appData.currentUser];
    userData.health.avgCycleLength = cycleLength;
    userData.health.avgPeriodDuration = periodDuration;

    saveData();
    closeEditHealthSettings();
    renderHealthTab();
    renderCalendar();
}
