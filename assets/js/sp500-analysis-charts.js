console.log('SP500 Analysis Charts script loaded');

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('chartLoadingIndicator');
    const canvas = document.getElementById('performanceChart');
    const sectorLoadingIndicator = document.getElementById('sectorChartLoadingIndicator');
    const sectorCanvas = document.getElementById('sectorChart');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    if (canvas) {
        canvas.style.display = 'block';
    }
    if (sectorLoadingIndicator) {
        sectorLoadingIndicator.style.display = 'none';
    }
    if (sectorCanvas) {
        sectorCanvas.style.display = 'block';
    }
}

// Initialize charts function
function initCharts() {
    console.log('Starting chart initialization...');
    console.log('Chart object status:', typeof Chart);
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Retrying in 500ms...');
        const errorCanvas = document.getElementById('performanceChart');
        if (errorCanvas) {
            errorCanvas.parentNode.innerHTML = '<p style="color: orange; font-weight: bold;">Loading Chart.js... Please wait.</p>';
        }
        // Retry after a short delay
        setTimeout(initCharts, 500);
        return;
    }

    console.log('Chart.js is available, creating charts...');
    
    // Hide loading indicator and show canvas
    hideLoadingIndicator();

    // Performance data
    const dates = ['8/15', '8/18', '8/19', '8/20', '8/21', '8/22', '8/24', '8/25', '8/27', '8/28', '8/29'];
    const myPortfolio = [-0.48, 0.19, -2.11, -0.26, -0.42, 1.36, 0.02, 0.52, 0.20, 0.15, -1.84];
    const sp500 = [-0.19, 0.00, -0.60, -0.28, -0.37, 1.54, -0.42, 0.40, 0.23, 0.36, -0.58];

    // Calculate cumulative returns
    const cumulativeMyPortfolio = myPortfolio.reduce((acc, val, i) => {
        if (i === 0) return [val];
        acc.push(acc[i-1] + val);
        return acc;
    }, []);

    const cumulativeSP500 = sp500.reduce((acc, val, i) => {
        if (i === 0) return [val];
        acc.push(acc[i-1] + val);
        return acc;
    }, []);

    // Performance Chart
    const ctx = document.getElementById('performanceChart');
    if (!ctx) {
        console.error('Performance chart canvas not found!');
        return;
    }

    try {
        const chartCtx = ctx.getContext('2d');
        new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'My Portfolio (Cumulative %)',
                    data: cumulativeMyPortfolio,
                    borderColor: '#2196F3',
                    backgroundColor: '#2196F320',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.1
                }, {
                    label: 'S&P 500 (Cumulative %)',
                    data: cumulativeSP500,
                    borderColor: '#4CAF50',
                    backgroundColor: '#4CAF5020',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.1
                }]
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
                        title: {
                            display: true,
                            text: 'Cumulative Return (%)'
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
                        position: 'top',
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
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                }
            }
        });
        console.log('Performance chart created successfully!');
    } catch (error) {
        console.error('Error creating performance chart:', error);
        ctx.parentNode.innerHTML = '<p style="color: red; font-weight: bold;">Error creating performance chart: ' + error.message + '</p>';
    }

    // Sector Chart
    const sectorCtx = document.getElementById('sectorChart');
    if (sectorCtx) {
        // Sector performance data (approximate)
        const sectorLabels = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Energy', 'Utilities', 'Consumer Staples'];
        const sp500Allocation = [30, 13, 12, 11, 4, 3, 6];
        const sectorPerformance = [-4.5, -1.2, -0.8, -2.1, 3.2, 2.8, 1.5]; // Recent performance

        try {
            new Chart(sectorCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sectorLabels,
                    datasets: [{
                        label: 'S&P 500 Allocation (%)',
                        data: sp500Allocation,
                        backgroundColor: '#4CAF50',
                        borderColor: '#388E3C',
                        borderWidth: 1,
                        yAxisID: 'y'
                    }, {
                        label: 'Sector Performance (%)',
                        data: sectorPerformance,
                        backgroundColor: '#FF9800',
                        borderColor: '#F57C00',
                        borderWidth: 1,
                        yAxisID: 'y1',
                        type: 'line'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'S&P 500 Allocation (%)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Sector Performance (%)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (context.datasetIndex === 1) {
                                        return `${context.dataset.label}: ${context.parsed.y}%`;
                                    }
                                    return `${context.dataset.label}: ${context.parsed.y}%`;
                                }
                            }
                        }
                    }
                }
            });
            console.log('Sector chart created successfully!');
        } catch (error) {
            console.error('Error creating sector chart:', error);
            sectorCtx.parentNode.innerHTML = '<p style="color: red; font-weight: bold;">Error creating sector chart: ' + error.message + '</p>';
        }
    } else {
        console.log('Sector chart canvas not found, skipping...');
    }

    console.log('All charts initialization complete!');
}

// Wait for DOM to be ready before initializing charts
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired');
    console.log('Chart object status at DOMContentLoaded:', typeof Chart);
    initCharts();
});
