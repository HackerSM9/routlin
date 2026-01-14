// ========================================
// CLOUDFLARE WORKER API CONFIGURATION
// ========================================
const API_URL = 'https://routlin.sm9developer.workers.dev';

// Data structure
let appData = {
    users: {},
    currentUser: null,
    sessionToken: null
};

// Predefined colors (10 distinct colors)
const COLORS = [
    '#FF5252', // Red
    '#2196F3', // Blue
    '#FFD740', // Amber/Gold
    '#00BCD4', // Cyan
    '#7C4DFF', // Deep Purple
    '#FFAB40', // Orange
    '#69F0AE', // Green
    '#8D6E63', // Brown
    '#78909C', // Blue Grey
    '#F50057'  // Pink/Magenta
];

let currentDate = new Date();
let selectedDateForModal = null;
let selectedColor = COLORS[0];
let statsChart = null;
let trendChart = null;
let currentTrendPeriod = '7days';

// Initialize app
function init() {
    loadData();
    
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

    if (appData.currentUser) {
        showMainApp();
    }
}

// Password hashing using Web Crypto API
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Auth functions
function toggleAuthForm() {
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

async function signup() {
    const username = document.getElementById('signupUsername').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const authError = document.getElementById('authError');
    
    if (!username || !password || !confirmPassword) {
        authError.textContent = 'Please fill in all fields';
        authError.style.display = 'block';
        return;
    }
    
    if (password !== confirmPassword) {
        authError.textContent = 'Passwords do not match';
        authError.style.display = 'block';
        return;
    }
    
    if (username.length < 3) {
        authError.textContent = 'Username must be at least 3 characters';
        authError.style.display = 'block';
        return;
    }
    
    if (password.length < 4) {
        authError.textContent = 'Password must be at least 4 characters';
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
        
        authError.style.display = 'none';
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupConfirmPassword').value = '';
        
        alert('✅ Account created successfully! Please login.');
        toggleAuthForm();
        
    } catch (error) {
        authError.textContent = error.message || 'Failed to create account. Please try again.';
        authError.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm';
        authError.style.display = 'block';
    }
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    
    if (isPassword) {
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>`;
    } else {
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const authError = document.getElementById('authError');
    
    if (!username || !password) {
        authError.textContent = 'Please fill in all fields';
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
            goals: data.userData.goals || []
        };
        
        saveData();
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

function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    appData.currentUser = null;
    saveData();
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

async function deleteAccount() {
    const confirmation1 = confirm('⚠️ WARNING: Are you absolutely sure you want to DELETE your account?\n\nThis will permanently remove:\n• Your username\n• All your tags\n• All your activity data\n• All your goals\n• Everything associated with your account\n\nThis action CANNOT be undone!');
    
    if (!confirmation1) {
        return;
    }
    
    const confirmation2 = confirm('FINAL WARNING: This is your last chance!\n\nType your username mentally and confirm deletion.\n\nClick OK to PERMANENTLY DELETE your account.');
    
    if (!confirmation2) {
        return;
    }
    
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

function showMainApp() {
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

// Calendar functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonthYear').textContent = 
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
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
        
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
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

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// Tag selection modal
function openTagSelectionModal(dateStr) {
    selectedDateForModal = dateStr;
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

function closeTagSelectionModal() {
    document.getElementById('tagSelectionModal').classList.remove('active');
}

function saveTagSelection() {
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

// Tag management
function renderTags() {
    const userData = appData.users[appData.currentUser];
    const tagsList = document.getElementById('tagsList');
    const addTagBtn = document.getElementById('addTagBtn');

    if (userData.tags.length >= 10) {
        addTagBtn.className = 'btn btn-premium-locked';
        addTagBtn.innerHTML = '🔒 Add Tag <span class="premium-badge" style="margin-left: 4px;">PRO</span>';
        addTagBtn.onclick = function() {
            alert('🌟 Tag Limit Reached!\n\nYou have created 10 tags (maximum for free users).\n\nUpgrade to Premium to:\n• Create unlimited tags\n• Access advanced analytics\n• Unlock premium features\n\nPremium coming soon!');
        };
    } else {
        addTagBtn.className = 'btn btn-primary';
        addTagBtn.innerHTML = '+ Add Tag';
        addTagBtn.onclick = openAddTagModal;
    }

    if (userData.tags.length === 0) {
        tagsList.innerHTML = '<p class="text-gray-500">No tags yet. Click "Add Tag" to create your first tag.</p>';
        return;
    }

    tagsList.innerHTML = '';

    userData.tags.forEach(tag => {
        const tagCard = document.createElement('div');
        tagCard.className = 'stats-card mb-4';

        const usageCount = Object.values(userData.entries).filter(tags => tags.includes(tag.id)).length;

        tagCard.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-lg" style="background-color: ${tag.color}"></div>
                <div class="flex-1">
                    <h3 class="font-semibold text-lg">${tag.name}</h3>
                    <p class="text-sm text-gray-500">Used ${usageCount} times</p>
                </div>
                <button onclick="openEditTagModal('${tag.id}')" class="btn btn-secondary mr-2">Edit</button>
                <button onclick="deleteTag('${tag.id}')" class="btn btn-danger">Delete</button>
            </div>
        `;

        tagsList.appendChild(tagCard);
    });
}

function openAddTagModal() {
    const userData = appData.users[appData.currentUser];
    
    if (userData.tags.length >= 10) {
        return;
    }
    
    document.getElementById('addTagModal').classList.add('active');
    document.getElementById('newTagName').value = '';

    const usedColors = userData.tags.map(t => {
        let colorHex = t.color;
        if (colorHex.startsWith('rgb')) {
            const rgbMatch = colorHex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                colorHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
        }
        return colorHex.toUpperCase();
    });

    const colorPicker = document.getElementById('colorPicker');
    colorPicker.innerHTML = '';
    
    let firstAvailableColor = null;
    for (let color of COLORS) {
        if (!usedColors.includes(color.toUpperCase())) {
            firstAvailableColor = color;
            break;
        }
    }
    
    selectedColor = firstAvailableColor || COLORS[0];

    COLORS.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-option';
        colorDiv.style.backgroundColor = color;

        const isUsed = usedColors.includes(color.toUpperCase());
        
        if (isUsed) {
            colorDiv.classList.add('disabled');
            colorDiv.title = 'This color is already in use';
        } else {
            if (color.toUpperCase() === selectedColor.toUpperCase()) {
                colorDiv.classList.add('selected');
            }
            
            colorDiv.onclick = () => {
                document.querySelectorAll('#colorPicker .color-option').forEach(el => el.classList.remove('selected'));
                colorDiv.classList.add('selected');
                selectedColor = color;
            };
        }

        colorPicker.appendChild(colorDiv);
    });
}

function tryCustomColor() {
    alert('🎨 Custom Color Picker is a Premium Feature!\n\nUpgrade to Premium to:\n• Create unlimited custom colors\n• Use any color for your tags\n• Support app development\n\nPremium coming soon!');
}

function closeAddTagModal() {
    document.getElementById('addTagModal').classList.remove('active');
}

function saveNewTag() {
    const tagName = document.getElementById('newTagName').value.trim();

    if (!tagName) {
        alert('Please enter a tag name');
        return;
    }

    const userData = appData.users[appData.currentUser];

    if (userData.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
        alert('Tag with this name already exists');
        return;
    }

    if (userData.tags.some(t => t.color.toUpperCase() === selectedColor.toUpperCase())) {
        alert('This color is already used by another tag. Please select a different color.');
        return;
    }

    const newTag = {
        id: Date.now().toString(),
        name: tagName,
        color: selectedColor
    };

    userData.tags.push(newTag);
    saveData();
    closeAddTagModal();
    renderTags();
}

let editingTagId = null;

function openEditTagModal(tagId) {
    const userData = appData.users[appData.currentUser];
    const tag = userData.tags.find(t => t.id === tagId);

    if (!tag) return;

    editingTagId = tagId;
    document.getElementById('editTagName').value = tag.name;
    document.getElementById('editTagModal').classList.add('active');

    const usedColors = userData.tags.filter(t => t.id !== tagId).map(t => t.color.toUpperCase());

    const colorPicker = document.getElementById('editColorPicker');
    colorPicker.innerHTML = '';

    COLORS.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-option';
        colorDiv.style.backgroundColor = color;

        const isUsed = usedColors.includes(color.toUpperCase());
        
        if (isUsed) {
            colorDiv.classList.add('disabled');
            colorDiv.title = 'This color is already in use by another tag';
            colorDiv.style.opacity = '0.3';
            colorDiv.style.cursor = 'not-allowed';
        } else {
            if (color.toUpperCase() === tag.color.toUpperCase()) {
                colorDiv.classList.add('selected');
            }
            
            colorDiv.onclick = () => {
                document.querySelectorAll('#editColorPicker .color-option').forEach(el => el.classList.remove('selected'));
                colorDiv.classList.add('selected');
            };
        }

        colorPicker.appendChild(colorDiv);
    });
}

function closeEditTagModal() {
    document.getElementById('editTagModal').classList.remove('active');
    editingTagId = null;
}

function saveEditTag() {
    const tagName = document.getElementById('editTagName').value.trim();

    if (!tagName) {
        alert('Please enter a tag name');
        return;
    }

    const userData = appData.users[appData.currentUser];
    const tag = userData.tags.find(t => t.id === editingTagId);

    if (!tag) return;

    if (tagName.toLowerCase() !== tag.name.toLowerCase()) {
        if (userData.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase() && t.id !== editingTagId)) {
            alert('Tag with this name already exists');
            return;
        }
    }

    const selectedColorEl = document.querySelector('#editColorPicker .color-option.selected');
    if (selectedColorEl) {
        const rgbColor = selectedColorEl.style.backgroundColor;
        const rgbMatch = rgbColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        let newColor = tag.color;
        
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            newColor = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        }

        if (newColor.toUpperCase() !== tag.color.toUpperCase()) {
            if (userData.tags.some(t => t.color.toUpperCase() === newColor.toUpperCase() && t.id !== editingTagId)) {
                alert('This color is already used by another tag. Please select a different color.');
                return;
            }
            tag.color = newColor;
        }
    }

    tag.name = tagName;
    saveData();
    closeEditTagModal();
    renderTags();
    renderCalendar();
}

function deleteTag(tagId) {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all entries.')) {
        return;
    }
    
    const userData = appData.users[appData.currentUser];
    userData.tags = userData.tags.filter(t => t.id !== tagId);
    
    Object.keys(userData.entries).forEach(date => {
        userData.entries[date] = userData.entries[date].filter(id => id !== tagId);
        if (userData.entries[date].length === 0) {
            delete userData.entries[date];
        }
    });
    
    userData.goals = userData.goals.filter(g => g.tagId !== tagId);
    
    saveData();
    renderTags();
    renderCalendar();
}

// Statistics
function updateStats() {
    const period = document.getElementById('statsPeriod').value;
    const userData = appData.users[appData.currentUser];
    
    const dateRange = getDateRange(period);
    
    const periodInfo = document.getElementById('periodInfo');
    const periodText = {
        'daily': `📅 Showing data for: Today (${dateRange.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })})`,
        'weekly': `📅 Showing data for: This Week (${dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`,
        'monthly': `📅 Showing data for: ${dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        'yearly': `📅 Showing data for: Year ${dateRange.start.getFullYear()}`
    };
    periodInfo.querySelector('.text-sm').textContent = periodText[period];
    
    if (document.body.classList.contains('dark')) {
        periodInfo.style.background = '#1e3a5f';
        periodInfo.querySelector('.text-sm').classList.remove('text-blue-900');
        periodInfo.querySelector('.text-sm').classList.add('text-blue-200');
    } else {
        periodInfo.style.background = '#e0f2fe';
        periodInfo.querySelector('.text-sm').classList.remove('text-blue-200');
        periodInfo.querySelector('.text-sm').classList.add('text-blue-900');
    }
    
    const tagUsageCounts = {};
    
    Object.entries(userData.entries).forEach(([dateStr, tagIdsForDay]) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const entryDate = new Date(year, month - 1, day);
        entryDate.setHours(0, 0, 0, 0);
        
        if (entryDate >= dateRange.start && entryDate <= dateRange.end) {
            tagIdsForDay.forEach(tagId => {
                if (!tagUsageCounts[tagId]) {
                    tagUsageCounts[tagId] = 0;
                }
                tagUsageCounts[tagId] += 1;
            });
        }
    });
    
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];
    
    let mostUsedTagName = null;
    let mostUsedCount = 0;
    let leastUsedTagName = null;
    let leastUsedCount = Infinity;
    const usedTagIds = [];
    
    Object.entries(tagUsageCounts).forEach(([tagId, count]) => {
        if (count > 0) {
            const tag = userData.tags.find(t => t.id === tagId);
            if (tag) {
                chartLabels.push(`${tag.name} (${count})`);
                chartData.push(count);
                chartColors.push(tag.color);
                usedTagIds.push(tagId);
                
                if (count > mostUsedCount) {
                    mostUsedCount = count;
                    mostUsedTagName = tag.name;
                }
                
                if (count < leastUsedCount) {
                    leastUsedCount = count;
                    leastUsedTagName = tag.name;
                }
            }
        }
    });
    
    const unusedTagNames = [];
    userData.tags.forEach(tag => {
        if (!usedTagIds.includes(tag.id)) {
            unusedTagNames.push(tag.name);
        }
    });
    
    const chartCanvas = document.getElementById('statsChart');
    const noDataMsg = document.getElementById('statsNoData');
    const statsDetails = document.getElementById('statsDetails');
    
    if (statsChart) {
        statsChart.destroy();
        statsChart = null;
    }
    
    if (chartData.length === 0) {
        chartCanvas.style.display = 'none';
        noDataMsg.style.display = 'block';
        
        if (unusedTagNames.length > 0) {
            statsDetails.innerHTML = `
                <div class="stats-card">
                    <div class="text-gray-500 mb-3">No activities recorded in this period</div>
                    <div><strong>Not Used:</strong> ${unusedTagNames.join(', ')}</div>
                </div>
            `;
        } else {
            statsDetails.innerHTML = `
                <div class="stats-card">
                    <div class="text-gray-500">No activities recorded in this period</div>
                </div>
            `;
        }
        
        updateTrendChart();
        updateStreaks();
        updateGoals();
        return;
    }
    
    chartCanvas.style.display = 'block';
    noDataMsg.style.display = 'none';
    
    statsChart = new Chart(chartCanvas, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: document.body.classList.contains('dark') ? '#1a1a1a' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.classList.contains('dark') ? '#e0e0e0' : '#1f2937',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${value} times (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    let detailsHTML = '<div class="stats-card">';
    
    if (mostUsedTagName) {
        detailsHTML += `
            <div class="mb-3 flex items-center gap-2">
                <span class="text-green-500 text-lg">▲</span>
                <strong>Most Used:</strong> 
                <span>${mostUsedTagName}</span>
                <span class="text-gray-500">(${mostUsedCount} ${mostUsedCount === 1 ? 'time' : 'times'})</span>
            </div>
        `;
    }
    
    if (leastUsedTagName && leastUsedTagName !== mostUsedTagName) {
        detailsHTML += `
            <div class="mb-3 flex items-center gap-2">
                <span class="text-red-500 text-lg">▼</span>
                <strong>Least Used:</strong> 
                <span>${leastUsedTagName}</span>
                <span class="text-gray-500">(${leastUsedCount} ${leastUsedCount === 1 ? 'time' : 'times'})</span>
            </div>
        `;
    }
    
    if (unusedTagNames.length > 0) {
        detailsHTML += `
            <div class="flex items-center gap-2">
                <span class="text-gray-400 text-lg">○</span>
                <strong>Not Used:</strong> 
                <span class="text-gray-500">${unusedTagNames.join(', ')}</span>
            </div>
        `;
    }
    
    detailsHTML += '</div>';
    statsDetails.innerHTML = detailsHTML;
    
    updateTrendChart();
    updateStreaks();
    updateGoals();
}

let trendObserver = null;

function setTrendPeriod(period) {
    currentTrendPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateTrendChart();
}

function tryPremiumFeature(feature) {
    alert('🌟 Premium Feature Locked!\n\nUnlock advanced analytics:\n• Weekly trends\n• Monthly patterns\n• Yearly overview\n• Advanced insights\n\nUpgrade to Premium to access these features!\n\nPremium coming soon!');
}

function updateTrendChart() {
    const chartCanvas = document.getElementById('trendChart');
    
    if (trendObserver) {
        trendObserver.disconnect();
    }

    trendObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderTrendChart();
                trendObserver.disconnect();
            }
        });
    }, { threshold: 0.1 });

    trendObserver.observe(chartCanvas);
}

function renderTrendChart() {
    const userData = appData.users[appData.currentUser];
    const chartCanvas = document.getElementById('trendChart');
    const noDataMsg = document.getElementById('trendNoData');
    
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const labels = [];
    const data = [];
    const dayTagsMap = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        
        if (i === 0) labels.push('Today');
        else labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const dayTags = userData.entries[dateStr] || [];
        data.push(dayTags.length);
        
        const dayTagInfo = dayTags.map(tagId => {
            const t = userData.tags.find(tag => tag.id === tagId);
            return t ? { color: t.color, name: t.name } : null;
        }).filter(t => t !== null);
        dayTagsMap.push(dayTagInfo);
    }

    const hasData = data.some(count => count > 0);
    if (!hasData) {
        chartCanvas.style.display = 'none';
        noDataMsg.style.display = 'block';
        return;
    }

    chartCanvas.style.display = 'block';
    noDataMsg.style.display = 'none';

    const dataset = {
        label: 'Activities',
        data: data,
        backgroundColor: 'transparent',
        borderWidth: 3,
        fill: false,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderWidth: 2,
        pointBorderColor: document.body.classList.contains('dark') ? '#1a1a1a' : '#ffffff',
        pointBackgroundColor: data.map((count, i) => {
            return dayTagsMap[i].length > 0 ? dayTagsMap[i][0].color : '#9ca3af';
        }),
        segment: {
            borderColor: (ctx) => {
                if (!ctx.p0.parsed || !ctx.p1.parsed) return 'transparent';
                
                const dayIdx = ctx.p0DataIndex;
                const dayTags = dayTagsMap[dayIdx];
                
                if (!dayTags || dayTags.length === 0) {
                    return document.body.classList.contains('dark') ? '#404040' : '#e5e7eb';
                }
                
                const gradient = ctx.chart.ctx.createLinearGradient(ctx.p0.x, ctx.p0.y, ctx.p1.x, ctx.p1.y);
                
                const step = 1 / dayTags.length;
                dayTags.forEach((tag, i) => {
                    gradient.addColorStop(i * step, tag.color);
                    gradient.addColorStop((i + 1) * step, tag.color);
                });
                
                return gradient;
            }
        }
    };

    trendChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [dataset]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500,
                easing: 'linear'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: document.body.classList.contains('dark') ? '#e0e0e0' : '#1f2937'
                    },
                    grid: {
                        color: document.body.classList.contains('dark') ? '#404040' : '#e5e7eb'
                    }
                },
                x: {
                    ticks: {
                        color: document.body.classList.contains('dark') ? '#e0e0e0' : '#1f2937'
                    },
                    grid: {
                        color: document.body.classList.contains('dark') ? '#404040' : '#e5e7eb'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dayIdx = context.dataIndex;
                            const dayTags = dayTagsMap[dayIdx];
                            if (dayTags.length > 0) {
                                return [
                                    `${dayTags.length} activities`,
                                    `Tags: ${dayTags.map(t => t.name).join(', ')}`
                                ];
                            }
                            return 'No activities';
                        }
                    }
                }
            }
        }
    });
}

function getDateRange(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date(today);
    let end = new Date(today);
    
    switch(period) {
        case 'daily':
            start = new Date(today);
            end = new Date(today);
            break;
        case 'weekly':
            start = new Date(today);
            start.setDate(today.getDate() - today.getDay());
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            break;
        case 'monthly':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'yearly':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;
    }
    
    return { start, end };
}

// Streaks
function updateStreaks() {
    const userData = appData.users[appData.currentUser];
    const streaksList = document.getElementById('streaksList');
    
    if (userData.tags.length === 0) {
        streaksList.innerHTML = '<p class="text-gray-500">No tags yet</p>';
        return;
    }
    
    const streaks = calculateStreaks();
    
    if (streaks.length === 0) {
        streaksList.innerHTML = '<p class="text-gray-500">No active streaks</p>';
        return;
    }
    
    streaksList.innerHTML = '';
    streaks.forEach(streak => {
        const streakDiv = document.createElement('div');
        streakDiv.className = 'mb-3 flex items-center justify-between';
        
        const tag = userData.tags.find(t => t.id === streak.tagId);
        
        streakDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded" style="background-color: ${tag.color}"></div>
                <span class="font-medium">${tag.name}</span>
            </div>
            <div class="streak-badge">
                🔥 ${streak.count} days
            </div>
        `;
        
        streaksList.appendChild(streakDiv);
    });
}

function calculateStreaks() {
    const userData = appData.users[appData.currentUser];
    const streaks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    userData.tags.forEach(tag => {
        let currentStreak = 0;
        let checkDate = new Date(today);
        
        while (true) {
            const y = checkDate.getFullYear();
            const m = String(checkDate.getMonth() + 1).padStart(2, '0');
            const d = String(checkDate.getDate()).padStart(2, '0');
            const localDateStr = `${y}-${m}-${d}`;
            
            const dayTags = userData.entries[localDateStr] || [];
            
            if (dayTags.includes(tag.id)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        if (currentStreak > 0) {
            streaks.push({
                tagId: tag.id,
                count: currentStreak
            });
        }
    });
    
    return streaks.sort((a, b) => b.count - a.count);
}

// Goals
function openAddGoalModal() {
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

function closeAddGoalModal() {
    document.getElementById('addGoalModal').classList.remove('active');
}

function saveGoal() {
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

function updateGoals() {
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
                <button onclick="deleteGoal('${goal.id}')" class="text-red-500 text-sm">Delete</button>
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
}

function getDateRangeForGoal(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date(today);
    let end = new Date(today);
    
    switch(period) {
        case 'week':
            start.setDate(today.getDate() - today.getDay());
            end.setDate(start.getDate() + 6);
            break;
        case 'month':
            start.setDate(1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;
    }
    
    return { start, end };
}

function deleteGoal(goalId) {
    const userData = appData.users[appData.currentUser];
    userData.goals = userData.goals.filter(g => g.id !== goalId);
    saveData();
    updateGoals();
}

// Profile functions
async function changePassword() {
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

function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark);
    renderCalendar();
    
    if (statsChart) {
        updateStats();
    }
}

function exportData() {
    const userData = appData.users[appData.currentUser];
    const exportData = {
        username: appData.currentUser,
        passwordHash: userData.passwordHash, 
        tags: userData.tags,
        entries: userData.entries,
        goals: userData.goals,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    
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

// Data persistence
async function saveData() {
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
                        goals: userData.goals
                    }
                })
            });
            
            console.log('✅ Data synced to cloud');
        } catch (error) {
            console.warn('⚠️ Cloud sync failed, data saved locally:', error);
        }
    }
}

function loadData() {
    const savedData = localStorage.getItem('activityTrackerData');
    if (savedData) {
        appData = JSON.parse(savedData);
    }
}

// Initialize on page load
init();
