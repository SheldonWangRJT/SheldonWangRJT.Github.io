console.log('Net Worth Charts script loaded');

// PRIVACY NOTE: this file is public. It contains ONLY normalized data —
// allocation percentages (each month sums to 100) and the net-worth index.
// It must NEVER contain dollar amounts, raw category amounts, or any anchor
// that would let someone reverse-engineer absolute values. Category amounts
// are computed privately from the NW Tracking sheet and only the resulting
// percentages are published here.

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

// Allocation percentages by month. Format per month: [Cash, Stocks, 401k, HSA, Crypto, Real Estate, 529].
// Cash = non-HSA cash; Stocks = brokerage; 401k = employer plans; HSA = all HSA accounts;
// Crypto = all crypto; Real Estate = home equity + vehicles; 529 = education savings.
// Dec 2024 - Dec 2025: as originally published. From Jan 2026: sourced from the NW Tracking
// sheet (last snapshot of each month; no snapshot exists for Mar 2026).
// September 2026 reflects the 9/25/2026 snapshot (latest in-month).
const monthLabels = ['December 2024', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025', 'January 2026', 'February 2026', 'April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026'];

const pctSeries = [
[5.22, 30.29, 13.13, 2.05, 0.74, 48.57, 0.00],
[3.51, 38.32, 15.43, 2.24, 1.01, 39.50, 0.00],
[3.92, 36.59, 15.87, 2.34, 0.94, 40.04, 0.30],
[3.95, 36.23, 16.32, 2.21, 2.88, 38.10, 0.30],
[2.95, 32.64, 15.89, 2.12, 2.33, 43.77, 0.31],
[2.90, 32.82, 15.96, 2.14, 2.22, 43.66, 0.31],
[2.79, 34.63, 17.27, 2.49, 0.85, 41.65, 0.32],
[2.27, 35.22, 17.99, 2.52, 0.70, 40.97, 0.33],
[2.17, 35.68, 18.87, 2.56, 1.50, 38.91, 0.32],
[2.00, 36.45, 18.60, 2.66, 1.31, 38.67, 0.31],
[2.02, 36.19, 18.75, 2.54, 1.32, 38.87, 0.31],
[1.88, 36.84, 19.29, 2.65, 1.15, 37.87, 0.32],
[3.22, 37.33, 19.26, 2.67, 1.18, 35.80, 0.52],
[2.46, 38.49, 18.68, 2.63, 1.37, 35.87, 0.50],
];

// Net Worth Index (Dec 2024 = 100).
// 2026+ values are the true net-worth index anchored at Dec 2025 = 110.8.
const nwIndex = [100.0, 105.6, 107.1, 110.5, 110.0, 110.8, 112.0, 111.2, 117.4, 125.9, 126.3, 122.4, 126.6, 129.7];

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
console.log('Percentage data loaded:', pctSeries);
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
