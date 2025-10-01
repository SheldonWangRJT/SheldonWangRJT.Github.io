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
            errorCanvas.parentNode.innerHTML = '<p style="color: orange; font-weight: bold;">Loading Chart.js... Please wait.</p>';
        }

        // Retry after a short delay
        setTimeout(initCharts, 500);
        return;
    }

    console.log('Chart.js is available, creating charts...');

    // Utility functions
    const sum = arr => arr.reduce((a, b) => a + b, 0);

    // Raw data (available to both charts)
    const dec2024Data = [91.5, 530.7, 230, 36, 12.9, 851, 0];
    const aug2025Data = [65, 709.2, 285.5, 41.4, 18.6, 731.0, 0];
    const sep2025Data = [73.5, 686.4, 297.6, 43.9, 17.6, 751, 5.7];

    const totalDec = sum(dec2024Data);
    const totalAug = sum(aug2025Data);
    const totalSep = sum(sep2025Data);
    const normalizedAug = (totalAug / totalDec) * 100;
    const normalizedSep = (totalSep / totalDec) * 100;

    console.log('Data calculated:', { totalDec, totalAug, totalSep, normalizedAug, normalizedSep });

    // BAR CHART
    const barCanvas = document.getElementById('barChart');
    if (barCanvas) {
        console.log('Bar canvas found, creating bar chart...');

        try {
            const barCtx = barCanvas.getContext('2d');
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['December 2024', 'August 2025', 'September 2025'],
                    datasets: [{
                        label: 'Net Worth Index (Dec 2024 = 100%)',
                        data: [100, normalizedAug.toFixed(1), normalizedSep.toFixed(1)],
                        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
                        borderColor: ['#388E3C', '#1565C0', '#F57C00'],
                        borderWidth: 1,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Index (Dec 2024 = 100%)'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y}%`;
                                }
                            }
                        }
                    }
                }
            });
            console.log('Bar chart created successfully!');
        } catch (error) {
            console.error('Error creating bar chart:', error);
            barCanvas.parentNode.innerHTML = '<p style="color: red; font-weight: bold;">Error creating bar chart: ' + error.message + '</p>';
        }
    } else {
        console.error('Bar chart canvas not found!');
    }

    // LINE CHART
    const lineCanvas = document.getElementById('lineChart');
    if (lineCanvas) {
        console.log('Line canvas found, creating line chart...');

        try {
            // Calculate percentages for each month
            const categories = ['Cash', 'Stocks', '401k', 'HSA', 'Crypto', 'Real Estate', '529'];

            const calcPercentages = (data) => {
                const total = sum(data);
                return data.map(val => ((val / total) * 100).toFixed(2));
            };

            const dec2024Pct = calcPercentages(dec2024Data);
            const aug2025Pct = calcPercentages(aug2025Data);
            const sep2025Pct = calcPercentages(sep2025Data);

            console.log('Percentage data calculated:', { dec2024Pct, aug2025Pct, sep2025Pct });

            const lineCtx = lineCanvas.getContext('2d');
            new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: ['December 2024', 'August 2025', 'September 2025'],
                    datasets: categories.map((category, index) => ({
                        label: category,
                        data: [dec2024Pct[index], aug2025Pct[index], sep2025Pct[index]],
                        borderColor: ['#FFC107', '#2196F3', '#8BC34A', '#FF5722', '#9C27B0', '#3F51B5', '#FF9800'][index],
                        backgroundColor: ['#FFC107', '#2196F3', '#8BC34A', '#FF5722', '#9C27B0', '#3F51B5', '#FF9800'][index] + '20',
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        tension: 0.1
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 60,
                            title: {
                                display: true,
                                text: 'Percentage (%)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y}%`;
                                }
                            }
                        }
                    }
                }
            });
            console.log('Line chart created successfully!');
        } catch (error) {
            console.error('Error creating line chart:', error);
            lineCanvas.parentNode.innerHTML = '<p style="color: red; font-weight: bold;">Error creating line chart: ' + error.message + '</p>';
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
