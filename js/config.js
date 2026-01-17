// ========================================
// GLOBAL CONFIGURATION & STATE
// ========================================

export const API_URL = 'https://routlin.sm9developer.workers.dev';

// Global app data
export let appData = {
    users: {},
    currentUser: null,
    sessionToken: null
};

// Function to update appData (needed for module scope)
export function setAppData(newData) {
    appData = newData;
}

export function updateAppData(updates) {
    Object.assign(appData, updates);
}

// Predefined colors (10 distinct colors)
export const COLORS = [
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

// Global state variables
export let currentDate = new Date();
export let selectedDateForModal = null;
export let selectedColor = COLORS[0];
export let statsChart = null;
export let trendChart = null;
export let currentTrendPeriod = '7days';
export let editingTagId = null;
export let trendObserver = null;
export let healthInitialized = false;

// Setters for global state
export function setCurrentDate(date) {
    currentDate = date;
}

export function setSelectedDateForModal(date) {
    selectedDateForModal = date;
}

export function setSelectedColor(color) {
    selectedColor = color;
}

export function setStatsChart(chart) {
    statsChart = chart;
}

export function setTrendChart(chart) {
    trendChart = chart;
}

export function setCurrentTrendPeriod(period) {
    currentTrendPeriod = period;
}

export function setEditingTagId(id) {
    editingTagId = id;
}

export function setTrendObserver(observer) {
    trendObserver = observer;
}

export function setHealthInitialized(value) {
    healthInitialized = value;
}
