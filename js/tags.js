// ========================================
// TAG MANAGEMENT
// ========================================

import { appData, COLORS, selectedColor, setSelectedColor, editingTagId, setEditingTagId } from './config.js';
import { saveData } from './data.js';
import { renderCalendar } from './calendar.js';

// Render tags list
export function renderTags() {
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
                <button class="btn btn-secondary mr-2 edit-tag-btn" data-tag-id="${tag.id}">Edit</button>
                <button class="btn btn-danger delete-tag-btn" data-tag-id="${tag.id}">Delete</button>
            </div>
        `;

        tagsList.appendChild(tagCard);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-tag-btn').forEach(btn => {
        btn.onclick = () => openEditTagModal(btn.dataset.tagId);
    });
    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.onclick = () => deleteTag(btn.dataset.tagId);
    });
}

// Open add tag modal
export function openAddTagModal() {
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
    
    setSelectedColor(firstAvailableColor || COLORS[0]);

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
                setSelectedColor(color);
            };
        }

        colorPicker.appendChild(colorDiv);
    });
}

// Try custom color (premium feature)
export function tryCustomColor() {
    alert('🎨 Custom Color Picker is a Premium Feature!\n\nUpgrade to Premium to:\n• Create unlimited custom colors\n• Use any color for your tags\n• Support app development\n\nPremium coming soon!');
}

// Close add tag modal
export function closeAddTagModal() {
    document.getElementById('addTagModal').classList.remove('active');
}

// Save new tag
export function saveNewTag() {
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

// Open edit tag modal
export function openEditTagModal(tagId) {
    const userData = appData.users[appData.currentUser];
    const tag = userData.tags.find(t => t.id === tagId);

    if (!tag) return;

    setEditingTagId(tagId);
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

// Close edit tag modal
export function closeEditTagModal() {
    document.getElementById('editTagModal').classList.remove('active');
    setEditingTagId(null);
}

// Save edited tag
export function saveEditTag() {
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

// Delete tag
export function deleteTag(tagId) {
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
