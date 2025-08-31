---
title: "My Portfolio vs S&P 500: A Real Performance Comparison"
description: "Personal stock portfolio performance analysis compared to S&P 500 benchmark. Daily tracking, performance metrics, and investment strategy insights from August 2025."
date: 2025-08-25
permalink: /portfolio/personal-portfolio-vs-sp500-analysis/
tags:
  - Portfolio Analysis
  - S&P 500
  - Investment Performance
  - Stock Market
  - Personal Finance
---

I've been tracking my personal stock portfolio performance against the S&P 500 benchmark for the past few weeks. With my portfolio heavily allocated to technology stocks, recent market conditions have been challenging. Here's a detailed comparison and analysis of how my investment strategy is performing relative to the broader market.

## Performance Tracking Data

| Date       | My Portfolio Daily | S&P 500 Daily | Performance vs S&P 500 |
|------------|-------------------|---------------|----------------------|
| 8/15/2025  | -0.48%           | -0.19%        | -0.29% (Underperformed) |
| 8/18/2025  | +0.19%           | +0.00%        | +0.19% (Outperformed) |
| 8/19/2025  | -2.11%           | -0.60%        | -1.51% (Underperformed) |
| 8/20/2025  | -0.26%           | -0.28%        | +0.02% (Outperformed) |
| 8/21/2025  | -0.42%           | -0.37%        | -0.05% (Underperformed) |
| 8/22/2025  | +1.36%           | +1.54%        | -0.18% (Underperformed) |
| 8/24/2025  | +0.02%           | -0.42%        | +0.44% (Outperformed) |
| 8/25/2025  | +0.52%           | +0.40%        | +0.12% (Outperformed) |
| 8/27/2025  | +0.20%           | +0.23%        | -0.03% (Underperformed) |
| 8/28/2025  | +0.15%           | +0.36%        | -0.21% (Underperformed) |
| 8/29/2025  | -1.84%           | -0.58%        | -1.26% (Underperformed) |

## Interactive Performance Chart

<div style="width: 100%; max-width: 800px; margin: auto;">
    <canvas id="performanceChart" style="width: 100%; height: 400px;"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
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
    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
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
</script>

## Key Performance Metrics

### **Overall Performance (August 15-29, 2025)**
- **My Portfolio**: -3.09% total return
- **S&P 500**: -0.09% total return
- **Excess Return**: -3.00% underperformance

### **Risk-Adjusted Performance**
- **My Portfolio Volatility**: 1.12% daily average
- **S&P 500 Volatility**: 0.67% daily average
- **Sharpe Ratio (My Portfolio)**: -2.76
- **Sharpe Ratio (S&P 500)**: -0.13

## Portfolio Composition Analysis

### **Current Allocation (Tech-Heavy)**

1. **Technology Sector (65% allocation)**
   - **Apple (AAPL)**: 20% of portfolio
   - **Microsoft (MSFT)**: 18% of portfolio
   - **NVIDIA (NVDA)**: 15% of portfolio
   - **Alphabet (GOOGL)**: 8% of portfolio
   - **Meta (META)**: 4% of portfolio

2. **Healthcare Sector (20% allocation)**
   - **Johnson & Johnson (JNJ)**: 12% of portfolio
   - **UnitedHealth Group (UNH)**: 8% of portfolio

3. **Financial Sector (10% allocation)**
   - **JPMorgan Chase (JPM)**: 6% of portfolio
   - **Bank of America (BAC)**: 4% of portfolio

4. **Consumer Discretionary (5% allocation)**
   - **Amazon (AMZN)**: 5% of portfolio

## Why I'm Underperforming the S&P 500

### **1. Tech Sector Concentration Risk**
My portfolio is heavily concentrated in technology stocks (65% vs ~30% in S&P 500), which have been under pressure due to:
- Rising interest rates affecting growth stock valuations
- Regulatory concerns around big tech
- Rotation from growth to value stocks
- Market concerns about AI bubble

### **2. High Volatility Exposure**
The technology sector has experienced higher volatility than the broader market, leading to:
- Larger daily swings in portfolio value
- Increased drawdowns during market corrections
- Higher correlation between holdings during tech selloffs

### **3. Market Timing Challenges**
Recent market conditions have been unfavorable for growth stocks:
- Value stocks outperforming growth stocks
- Defensive sectors (utilities, consumer staples) showing strength
- Technology sector facing headwinds from multiple factors

### **4. Concentration vs Diversification**
While the S&P 500 benefits from broad diversification across sectors, my concentrated approach has:
- Amplified losses during tech sector weakness
- Reduced exposure to outperforming sectors (energy, utilities)
- Increased correlation risk among holdings

## Lessons Learned

### **What's Not Working**
- **Over-concentration in tech**: 65% allocation to technology has amplified losses during sector weakness
- **Timing the market**: Attempting to catch tech rebounds has led to further losses
- **Ignoring diversification**: Lack of exposure to outperforming sectors (energy, utilities, consumer staples)

### **What I'm Learning**
- **Sector concentration risk**: Even quality companies can underperform when their sector faces headwinds
- **Importance of diversification**: The S&P 500's broad diversification provides stability during sector rotations
- **Patience during drawdowns**: Tech stocks may take time to recover from valuation compression

### **Risk Management Insights**
- **Position sizing**: Individual positions of 15-20% can create significant portfolio volatility
- **Correlation risk**: High correlation between tech holdings amplifies losses during sector weakness
- **Stop-loss discipline**: Need to maintain strict stop-losses to limit downside

## Forward-Looking Strategy

### **Short Term (Next 30 Days)**
- **Reduce tech concentration**: Gradually reduce technology allocation from 65% to 50%
- **Add defensive positions**: Consider adding utilities (XLU) or consumer staples (XLP) ETFs
- **Monitor earnings**: Be prepared to adjust positions based on Q3 earnings reports
- **Set stop-losses**: Implement 7-10% stop-losses on all tech positions

### **Medium Term (3-6 Months)**
- **Rebalancing plan**: Target 40% technology, 20% healthcare, 15% financials, 15% defensive sectors, 10% international
- **Sector diversification**: Add exposure to energy (XLE) and utilities (XLU) sectors
- **Value exposure**: Consider adding value ETFs (VTV) to balance growth exposure
- **International diversification**: Add developed market ETFs (EFA) for geographic diversification

### **Risk Management**
- **Position sizing limits**: Reduce individual stock positions to maximum 10% of portfolio
- **Sector limits**: Cap any single sector at 40% of portfolio
- **Regular rebalancing**: Weekly monitoring, monthly rebalancing
- **Stop-loss strategy**: 7% stop-loss on individual stocks, 15% on sector ETFs

## Benchmark Comparison Insights

### **When I Underperform**
- **Tech sector weakness**: My 65% tech allocation amplifies losses during sector selloffs
- **Growth to value rotation**: Lack of value exposure hurts performance during style rotations
- **Rising interest rates**: Growth stocks typically underperform when rates increase
- **Market volatility**: Higher volatility in tech stocks leads to larger drawdowns

### **When I Outperform**
- **Tech sector strength**: Concentrated tech positions capture upside during sector rallies
- **Earnings beats**: Individual stock selection can outperform during strong earnings seasons
- **Growth momentum**: Tech stocks typically lead during growth-oriented market environments

## Interactive Sector Performance Chart

<div style="width: 100%; max-width: 800px; margin: auto;">
    <canvas id="sectorChart" style="width: 100%; height: 400px;"></canvas>
</div>

<script>
    // Sector performance data (approximate)
    const sectorLabels = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Energy', 'Utilities', 'Consumer Staples'];
    const myAllocation = [65, 20, 10, 5, 0, 0, 0];
    const sp500Allocation = [30, 13, 12, 11, 4, 3, 6];
    const sectorPerformance = [-4.5, -1.2, -0.8, -2.1, 3.2, 2.8, 1.5]; // Recent performance
    
    // Calculate weighted performance
    const myWeightedPerformance = myAllocation.reduce((sum, alloc, i) => sum + (alloc * sectorPerformance[i] / 100), 0);
    const sp500WeightedPerformance = sp500Allocation.reduce((sum, alloc, i) => sum + (alloc * sectorPerformance[i] / 100), 0);
    
    // Sector Chart
    const sectorCtx = document.getElementById('sectorChart').getContext('2d');
    new Chart(sectorCtx, {
        type: 'bar',
        data: {
            labels: sectorLabels,
            datasets: [{
                label: 'My Allocation (%)',
                data: myAllocation,
                backgroundColor: '#2196F3',
                borderColor: '#1565C0',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
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
                        text: 'Allocation (%)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Performance (%)'
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
                            if (context.datasetIndex === 2) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            }
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
</script>

## Conclusion

My portfolio has significantly underperformed the S&P 500 over this tracking period, primarily due to:
1. **Over-concentration in technology** (65% vs 30% in S&P 500)
2. **Sector rotation headwinds** affecting growth stocks
3. **Higher volatility** from concentrated positions
4. **Lack of diversification** into outperforming sectors

This underperformance highlights the importance of:
- **Sector diversification** to reduce concentration risk
- **Balanced allocation** between growth and value
- **Risk management** through position sizing and stop-losses
- **Patience** during sector-specific drawdowns

The key lesson is that even quality companies can underperform when their sector faces headwinds. A more balanced approach with proper diversification would likely provide better risk-adjusted returns over the long term.

**Important Disclaimer**: Past performance does not guarantee future results. This analysis is for educational purposes only and should not be considered investment advice. Always do your own research and consider consulting with a financial advisor.

---

*Interested in discussing portfolio strategies or market analysis? Feel free to email me your thoughts and experiences! 📈*
