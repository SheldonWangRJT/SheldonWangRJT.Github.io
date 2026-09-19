console.log('Net Worth Charts script loaded');

// Wait for DOM to be ready before initializing charts
function initCharts() {
console.log('Starting chart script...');
console.log('Chart object status:', typeof Chart);
console.log('Chart object value:', Chart);
// Check if Chart.js is loaded
if (typeof Chart === 'undefined') {
console.error('Chart.js is not loaded! Retrying in 500ms...');
const errorCanvas = document.getElementById('barChart');
if (errorCanvas) {
errorCanvas.parentNode.innerHTML = '<div style="text-align:center; padding:40px;">Loading Chart.js... Please wait.</div>';
}
// Retry after a short delay
setTimeout(initCharts, 500);
return;
}
console.log('Chart.js is available, creating charts...');

// Raw data (in $ thousands; Dec 2024 = 100 baseline anchor, no dollar amounts shown on page)
// Format: [Cash, Stocks, 401k, HSA, Crypto, Real Estate, 529]
// Cash = non-HSA cash; Stocks = brokerage; 401k = employer plans; HSA = all HSA accounts;
// Crypto = all crypto; Real Estate = home equity + vehicles; 529 = education savings.
// Dec 2024 - Dec 2025: as originally published. From Jan 2026: sourced from the NW Tracking
// sheet (last snapshot of each month; no snapshot exists for Mar 2026).
const dec2024Data = [91.500, 530.700, 230.000, 36.000, 12.900, 851.000, 0.000];
const aug2025Data = [65.000, 709.200, 285.500, 41.400, 18.600, 731.000, 0.000];
const sep2025Data = [73.500, 686.400, 297.600, 43.900, 17.600, 751.000, 5.700];
const oct2025Data = [76.500, 701.700, 316.100, 42.900, 55.800, 737.900, 5.900];
const nov2025Data = [56.804, 629.030, 306.191, 40.820, 44.833, 843.640, 5.991];
const dec2025Data = [56.310, 637.062, 309.744, 41.526, 43.153, 847.565, 5.967];
const jan2026Data = [58.063, 720.075, 359.095, 51.685, 17.648, 865.878, 6.681];
const feb2026Data = [47.033, 729.732, 372.762, 52.147, 14.541, 848.728, 6.758];
const apr2026Data = [47.039, 774.190, 409.388, 55.479, 32.514, 844.121, 6.934];
const may2026Data = [46.496, 847.707, 432.595, 61.924, 30.491, 899.441, 7.204];
const jun2026Data = [47.129, 842.555, 436.530, 59.168, 30.642, 904.903, 7.314];
const jul2026Data = [42.684, 834.735, 437.013, 60.019, 26.105, 858.099, 7.293];
const aug2026Data = [75.127, 870.278, 449.054, 62.264, 27.568, 834.551, 12.186];
const sep2026Data = [52.856, 900.662, 443.783, 61.797, 31.000, 865.358, 12.062];

const monthLabels = ['December 2024', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025', 'January 2026', 'February 2026', 'April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026'];

// Net Worth Index (Dec 2024 = 100). 2024-2025 values from the chart data above;
// 2026+ values are the true net-worth index anchored at Dec 2025 = 110.8.
const nwIndex = [100.0, 105.6, 107.1, 110.5, 110.0, 110.8, 112.0, 111.2, 117.4, 125.9, 126.3, 122.4, 126.6, 128.5];

// BAR CHART
const barCanvas = document.getElementById('barChart');
if (barCanvas) {
console.log('Bar canvas found, creating bar chart...');
try {
const barCtx = barCanvas.getContext('2d');
new Chart(barCtx, {
type: 'bar',
data: {
labels: monthLabels,
datasets: [{
label: 'Net Worth Index (Dec 2024 = 100%)',
data: nwIndex,
backgroundColor: '#4CAF50',
borderColor: '#388E3C',
borderWidth: 1,
}],
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: { y: { beginAtZero: true, title: { display: true, text: 'Index (Dec 2024 = 100%)' } } },
plugins: { tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${context.parsed.y}%`; } } } },
},
});
console.log('Bar chart created successfully!');
} catch (error) {
console.error('Error creating bar chart:', error);
barCanvas.parentNode.innerHTML = '<div style="text-align:center; padding:40px;">Error creating bar chart: ' + error.message + '</div>';
}
} else {
console.error('Bar chart canvas not found!');
}

// LINE CHART
const lineCanvas = document.getElementById('lineChart');
if (lineCanvas) {
console.log('Line canvas found, creating line chart...');
try {
const categories = ['Cash', 'Stocks', '401k', 'HSA', 'Crypto', 'Real Estate', '529'];
const allData = [dec2024Data, aug2025Data, sep2025Data, oct2025Data, nov2025Data, dec2025Data, jan2026Data, feb2026Data, apr2026Data, may2026Data, jun2026Data, jul2026Data, aug2026Data, sep2026Data];
const calcPercentages = (data) => {
const total = data.reduce((a, b) => a + b, 0);
return data.map(val => ((val / total) * 100).toFixed(2));
};
const pctSeries = allData.map(calcPercentages);
console.log('Percentage data calculated:', pctSeries);
const lineCtx = lineCanvas.getContext('2d');
new Chart(lineCtx, {
type: 'line',
data: {
labels: monthLabels,
datasets: categories.map((category, index) => ({
label: category,
data: pctSeries.map(s => s[index]),
borderColor: ['#FFC107', '#2196F3', '#8BC34A', '#FF5722', '#9C27B0', '#3F51B5', '#FF9800'][index],
backgroundColor: ['#FFC107', '#2196F3', '#8BC34A', '#FF5722', '#9C27B0', '#3F51B5', '#FF9800'][index] + '20',
borderWidth: 3,
pointRadius: 4,
pointHoverRadius: 8,
tension: 0.1,
})),
},
options: {
responsive: true,
maintainAspectRatio: false,
interaction: { intersect: false, mode: 'index' },
scales: {
y: { beginAtZero: true, max: 60, title: { display: true, text: 'Percentage (%)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } },
},
plugins: {
legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, font: { size: 12 } } },
tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${context.parsed.y}%`; } } },
},
},
});
console.log('Line chart created successfully!');
} catch (error) {
console.error('Error creating line chart:', error);
lineCanvas.parentNode.innerHTML = '<div style="text-align:center; padding:40px;">Error creating line chart: ' + error.message + '</div>';
}
} else {
console.error('Line chart canvas not found!');
}
console.log('All charts initialization complete!');
}

// Wait for DOM to be ready before initializing charts
document.addEventListener('DOMContentLoaded', function() {
initCharts();
});
