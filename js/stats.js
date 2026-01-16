// ========================================
// STATISTICS & CHARTS
// ========================================

import { appData, statsChart, setStatsChart, trendChart, setTrendChart, currentTrendPeriod, setCurrentTrendPeriod, trendObserver, setTrendObserver } from './config.js';
import { getDateRange } from './utils.js';
import { updateGoals } from './goals.js';

// Update all statistics
export function updateStats() {
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
        setStatsChart(null);
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
    
    const newChart = new Chart(chartCanvas, {
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
    
    setStatsChart(newChart);
    
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

// Set trend period
export function setTrendPeriod(period) {
    setCurrentTrendPeriod(period);
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateTrendChart();
}

// Try premium feature
export function tryPremiumFeature(feature) {
    alert('🌟 Premium Feature Locked!\n\nUnlock advanced analytics:\n• Weekly trends\n• Monthly patterns\n• Yearly overview\n• Advanced insights\n\nUpgrade to Premium to access these features!\n\nPremium coming soon!');
}

// Update trend chart
export function updateTrendChart() {
    const chartCanvas = document.getElementById('trendChart');
    
    if (trendObserver) {
        trendObserver.disconnect();
    }

    const newObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderTrendChart();
                newObserver.disconnect();
            }
        });
    }, { threshold: 0.1 });

    setTrendObserver(newObserver);
    newObserver.observe(chartCanvas);
}

// Render trend chart
export function renderTrendChart() {
    const userData = appData.users[appData.currentUser];
    const chartCanvas = document.getElementById('trendChart');
    const noDataMsg = document.getElementById('trendNoData');
    
    if (trendChart) {
        trendChart.destroy();
        setTrendChart(null);
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

    const newTrendChart = new Chart(chartCanvas, {
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

    setTrendChart(newTrendChart);
}

// Update streaks
export function updateStreaks() {
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

// Calculate streaks
export function calculateStreaks() {
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
