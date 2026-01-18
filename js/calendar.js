// ========================================
// CALENDAR FUNCTIONS
// ========================================

import { appData, currentDate, setCurrentDate, selectedDateForModal, setSelectedDateForModal } from './config.js';
import { saveData } from './data.js';
import { updateStats } from './stats.js';
import { calculatePredictions } from './health.js';

// Render calendar grid
export function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonthYear').textContent = 
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // Get predicted period dates
    const predictions = calculatePredictions();
    const predictedDates = new Set();
    
    predictions.forEach(pred => {
        const start = new Date(pred.start);
        const end = new Date(pred.end);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            predictedDates.add(d.toISOString().split('T')[0]);
        }
    });
    
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        calendarDays.appendChild(emptyDay);
    }
    
    const today = new Date();
    const userData = appData.users[appData.currentUser];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day bg-gray-100';
        if (document.body.classList.contains('dark')) {
            dayDiv.className = 'calendar-day bg-gray-700';
        }
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellDate = new Date(year, month, day);
        
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const isFuture = cellDate > todayMidnight;
        
        // Check if this date is a predicted period date
        const isPredictedPeriod = predictedDates.has(dateStr);
        
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
        }
        
        // Add magenta border for predicted period dates (even if future)
        if (isPredictedPeriod) {
            dayDiv.style.border = '2px solid #ec4899'; // Magenta color
            dayDiv.style.boxShadow = '0 0 4px rgba(236, 72, 153, 0.3)';
        }
        
        if (isFuture) {
            dayDiv.style.opacity = '0.3';
            dayDiv.style.cursor = 'not-allowed';
            dayDiv.style.pointerEvents = 'none';
        }
        
        const dayTags = userData.entries[dateStr] || [];
        if (dayTags.length > 0) {
            dayDiv.classList.add('has-tags');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);
        
        if (dayTags.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'tag-dots';
            dayTags.slice(0, 4).forEach(tagId => {
                const tag = userData.tags.find(t => t.id === tagId);
                if (tag) {
                    const dot = document.createElement('div');
                    dot.className = 'tag-dot';
                    dot.style.backgroundColor = tag.color;
                    dotsContainer.appendChild(dot);
                }
            });
            if (dayTags.length > 4) {
                const moreDot = document.createElement('div');
                moreDot.textContent = '+';
                moreDot.className = 'text-xs';
                dotsContainer.appendChild(moreDot);
            }
            dayDiv.appendChild(dotsContainer);
        }
        
        if (!isFuture) {
            dayDiv.onclick = () => openTagSelectionModal(dateStr);
        }
        calendarDays.appendChild(dayDiv);
    }
}

// Change month (navigation)
export function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// Open tag selection modal for a date
export function openTagSelectionModal(dateStr) {
    setSelectedDateForModal(dateStr);
    const modal = document.getElementById('tagSelectionModal');
    const userData = appData.users[appData.currentUser];
    const selectedTags = userData.entries[dateStr] || [];
    
    document.getElementById('selectedDate').textContent = 
        new Date(dateStr).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    
    const tagCheckboxList = document.getElementById('tagCheckboxList');
    tagCheckboxList.innerHTML = '';
    
    if (userData.tags.length === 0) {
        tagCheckboxList.innerHTML = '<p class="text-gray-500">No tags yet. Create tags in the Tags tab.</p>';
    } else {
        userData.tags.forEach(tag => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'tag-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `tag-${tag.id}`;
            checkbox.checked = selectedTags.includes(tag.id);
            checkbox.className = 'w-5 h-5';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'w-6 h-6 rounded';
            colorBox.style.backgroundColor = tag.color;
            
            const label = document.createElement('label');
            label.textContent = tag.name;
            label.className = 'flex-1 cursor-pointer';
            label.htmlFor = `tag-${tag.id}`;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(colorBox);
            checkboxDiv.appendChild(label);
            
            checkboxDiv.onclick = (e) => {
                if (e.target.tagName !== 'INPUT') {
                    checkbox.checked = !checkbox.checked;
                }
            };
            
            tagCheckboxList.appendChild(checkboxDiv);
        });
    }
    
    modal.classList.add('active');
}

// Close tag selection modal
export function closeTagSelectionModal() {
    document.getElementById('tagSelectionModal').classList.remove('active');
}

// Save tag selection for a date
export function saveTagSelection() {
    const userData = appData.users[appData.currentUser];
    const selectedTags = [];
    
    userData.tags.forEach(tag => {
        const checkbox = document.getElementById(`tag-${tag.id}`);
        if (checkbox && checkbox.checked) {
            selectedTags.push(tag.id);
        }
    });
    
    if (selectedTags.length > 0) {
        userData.entries[selectedDateForModal] = selectedTags;
    } else {
        delete userData.entries[selectedDateForModal];
    }
    
    saveData();
    closeTagSelectionModal();
    renderCalendar();
    updateStats();
}
