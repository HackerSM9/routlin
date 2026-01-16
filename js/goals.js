// ========================================
// GOALS MANAGEMENT
// ========================================

import { appData } from './config.js';
import { saveData } from './data.js';
import { getDateRangeForGoal } from './utils.js';

// Open add goal modal
export function openAddGoalModal() {
    const userData = appData.users[appData.currentUser];
    
    if (userData.tags.length === 0) {
        alert('Please create some tags first');
        return;
    }
    
    const goalTagSelect = document.getElementById('goalTagSelect');
    goalTagSelect.innerHTML = '';
    
    userData.tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
        option.textContent = tag.name;
        goalTagSelect.appendChild(option);
    });
    
    document.getElementById('addGoalModal').classList.add('active');
}

// Close add goal modal
export function closeAddGoalModal() {
    document.getElementById('addGoalModal').classList.remove('active');
}

// Save goal
export function saveGoal() {
    const tagId = document.getElementById('goalTagSelect').value;
    const targetCount = parseInt(document.getElementById('goalTargetCount').value);
    const period = document.getElementById('goalPeriod').value;
    
    if (!tagId || !targetCount || targetCount < 1) {
        alert('Please fill in all fields');
        return;
    }
    
    const userData = appData.users[appData.currentUser];
    
    const existingGoalIndex = userData.goals.findIndex(g => g.tagId === tagId && g.period === period);
    if (existingGoalIndex !== -1) {
        userData.goals[existingGoalIndex].targetCount = targetCount;
    } else {
        userData.goals.push({
            id: Date.now().toString(),
            tagId: tagId,
            targetCount: targetCount,
            period: period
        });
    }
    
    saveData();
    closeAddGoalModal();
    updateGoals();
}

// Update goals display
export function updateGoals() {
    const userData = appData.users[appData.currentUser];
    const goalsList = document.getElementById('goalsList');
    
    if (userData.goals.length === 0) {
        goalsList.innerHTML = '<p class="text-gray-500">No goals set</p>';
        return;
    }
    
    goalsList.innerHTML = '';
    
    userData.goals.forEach(goal => {
        const tag = userData.tags.find(t => t.id === goal.tagId);
        if (!tag) return;
        
        const dateRange = getDateRangeForGoal(goal.period);
        let currentCount = 0;
        
        Object.entries(userData.entries).forEach(([date, tagIds]) => {
            const [y, m, d] = date.split('-').map(Number);
            const entryDate = new Date(y, m - 1, d);
            
            if (entryDate >= dateRange.start && entryDate <= dateRange.end && tagIds.includes(goal.tagId)) {
                currentCount++;
            }
        });
        
        const progress = Math.min((currentCount / goal.targetCount) * 100, 100);
        
        const goalDiv = document.createElement('div');
        goalDiv.className = 'mb-4 p-4 border rounded-lg';
        
        goalDiv.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded" style="background-color: ${tag.color}"></div>
                    <span class="font-medium">${tag.name}</span>
                </div>
                <button class="text-red-500 text-sm delete-goal-btn" data-goal-id="${goal.id}">Delete</button>
            </div>
            <div class="mb-2">
                <div class="text-sm text-gray-600 mb-1">
                    ${currentCount} / ${goal.targetCount} 
                    (${goal.period === 'week' ? 'This Week' : goal.period === 'month' ? 'This Month' : 'This Year'})
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="text-xs ${currentCount >= goal.targetCount ? 'text-green-500 font-semibold' : 'text-gray-500'}">
                ${currentCount >= goal.targetCount ? '✓ Goal achieved!' : `${goal.targetCount - currentCount} more to go`}
            </div>
        `;
        
        goalsList.appendChild(goalDiv);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.onclick = () => deleteGoal(btn.dataset.goalId);
    });
}

// Delete goal
export function deleteGoal(goalId) {
    const userData = appData.users[appData.currentUser];
    userData.goals = userData.goals.filter(g => g.id !== goalId);
    saveData();
    updateGoals();
}
