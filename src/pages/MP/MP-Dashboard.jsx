// MP-Dashboard.jsx - UPDATED VERSION with clickable stat cards and history feature
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import MPLayout from './MPLayout';
import { useMPData } from './MPData';
import './MP_Styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const MPDashboard = () => {
    const { mpStats, alPerformance, apPerformance, refreshData, loading, error } = useMPData();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [appliedFilters, setAppliedFilters] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        search: ''
    });

    // State for modals
    const [showAPsModal, setShowAPsModal] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [showStatDetailsModal, setShowStatDetailsModal] = useState(false);
    const [selectedStat, setSelectedStat] = useState(null);
    const [selectedAL, setSelectedAL] = useState(null);
    const [selectedAP, setSelectedAP] = useState(null);

    // State for policy details data
    const [policyDetailsData, setPolicyDetailsData] = useState(null);
    const [loadingPolicyDetails, setLoadingPolicyDetails] = useState(false);

    // State for statistics history data
    const [statHistoryCache, setStatHistoryCache] = useState({});
    const [loadingStatHistory, setLoadingStatHistory] = useState(false);
    const [currentHistoryData, setCurrentHistoryData] = useState(null);

    // Fetch history data when selectedStat changes
    useEffect(() => {
        if (selectedStat && showStatDetailsModal) {
            fetchStatHistoryData(selectedStat).then(data => setCurrentHistoryData(data));
        }
    }, [selectedStat, appliedFilters.year, appliedFilters.month, showStatDetailsModal]);

    // Month names for filter
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Generate years for filter
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    // Apply filters
    const applyFilters = () => {
        setAppliedFilters({
            month: selectedMonth,
            year: selectedYear,
            search: searchTerm
        });

        // Update data based on filters
        updateFilteredData(selectedMonth, selectedYear, searchTerm);
    };

    // Clear filters
    const clearFilters = () => {
        setSelectedMonth(new Date().getMonth());
        setSelectedYear(currentYear);
        setSearchTerm('');
        setAppliedFilters({
            month: new Date().getMonth(),
            year: currentYear,
            search: ''
        });

        // Reset data to default
        updateFilteredData(new Date().getMonth(), currentYear, '');
    };

    // Function to update data based on filters
    const updateFilteredData = (month, year, search) => {
        setAppliedFilters({ month, year, search });
        // Fetch new stats based on month and year
        refreshData(month, year);
    };

    // Calculate summary statistics (updated with filter logic)
    const calculateStats = () => {
        const safeALPerformance = alPerformance || [];
        const safeAPPerformance = apPerformance || [];

        const totalALs = safeALPerformance.length;
        const performingALs = safeALPerformance.filter(al => al.status === 'PERFORMING').length;
        const totalALANP = safeALPerformance.reduce((sum, al) => sum + (al.monthlyANP || 0), 0);
        const totalALPolicies = safeALPerformance.reduce((sum, al) => sum + (al.monthlyCases || 0), 0);

        // Calculate Activity Ratio from filtered view or all data
        // For accurate activity ratio: Active APs / Total APs
        // Using data available in alPerformance
        const totalActivityRatioSum = safeALPerformance.reduce((sum, al) => sum + (al.activityRatio || 0), 0);
        const avgActivityRatio = totalALs > 0 ? totalActivityRatioSum / totalALs : 0;

        const totalAPs = safeAPPerformance.length;

        // Count active APs (those with at least 1 monthly case)
        const activeAPs = safeAPPerformance.filter(ap => (ap.monthlyCases || 0) > 0).length;

        const totalAPANP = safeAPPerformance.reduce((sum, ap) => sum + (ap.monthlyANP || 0), 0);
        const totalAPPolicies = safeAPPerformance.reduce((sum, ap) => sum + (ap.monthlyCases || 0), 0);
        const avgANPPerAP = activeAPs > 0 ? totalAPANP / activeAPs : 0; // Avg per ACTIVE AP

        // Calculate month specific stats from real data
        // Note: The backend currently returns 'monthlyANP' and 'monthlyCases' for the current month.
        // To support historical filtering properly, the backend endpoint would need to accept month/year params.
        const currentMonthlyANP = safeALPerformance.reduce((sum, al) => sum + (al.monthlyANP || 0), 0);
        const currentMonthlyPolicies = safeALPerformance.reduce((sum, al) => sum + (al.monthlyCases || 0), 0);

        const monthSpecificStats = {
            activityRatio: Math.round(avgActivityRatio),
            monthlyANP: currentMonthlyANP,
            totalPolicies: currentMonthlyPolicies
        };

        return {
            totalALs,
            performingALs,
            totalALANP,
            totalALPolicies,
            avgActivityRatio,
            totalAPs,
            activeAPs,
            totalAPANP,
            totalAPPolicies,
            avgANPPerAP,
            monthSpecificStats
        };
    };

    // Fetch historical data for stat cards from backend
    const fetchStatHistoryData = async (statType) => {
        // Check cache first
        const cacheKey = `${statType}_${appliedFilters.year}_${appliedFilters.month}`;
        if (statHistoryCache[cacheKey]) {
            return statHistoryCache[cacheKey];
        }

        setLoadingStatHistory(true);
        try {
            const response = await fetch(
                `http://localhost:3000/api/mp/monthly-history?year=${appliedFilters.year}&month=${appliedFilters.month}&statType=${statType}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                // Cache the result
                setStatHistoryCache(prev => ({
                    ...prev,
                    [cacheKey]: result.data
                }));
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to fetch history data');
            }
        } catch (error) {
            console.error('Error fetching stat history:', error);
            return null;
        } finally {
            setLoadingStatHistory(false);
        }
    };

    // Get top performers based on filters
    const getTopPerformers = () => {
        let filteredALs = [...alPerformance];

        // Apply search filter
        if (appliedFilters.search) {
            filteredALs = filteredALs.filter(al =>
                al.name.toLowerCase().includes(appliedFilters.search.toLowerCase())
            );
        }

        // Sort by monthly ANP (descending)
        return filteredALs
            .sort((a, b) => b.monthlyANP - a.monthlyANP)
            .slice(0, 5);
    };

    // Handle View APs Modal
    const handleViewAPsModal = (al) => {
        setSelectedAL(al);
        setShowAPsModal(true);
    };

    // Handle View Policy Details Modal
    const handleViewPolicyDetails = async (al) => {
        setSelectedAL(al);
        setShowPolicyModal(true);

        // Fetch policy details data
        setLoadingPolicyDetails(true);
        try {
            const response = await fetch(`http://localhost:3000/api/mp/policy-details/${al.id}?year=${appliedFilters.year}`);
            const result = await response.json();
            if (result.success) {
                setPolicyDetailsData(result.data);
            }
        } catch (error) {
            console.error('Error fetching policy details:', error);
        } finally {
            setLoadingPolicyDetails(false);
        }
    };

    // Handle Stat Card Click
    const handleStatCardClick = (statType) => {
        setSelectedStat(statType);
        setShowStatDetailsModal(true);
    };

    // Get AP performance status based on policies issued
    const getAPPerformanceStatus = (monthlyCases) => {
        if (monthlyCases >= 7) return 'PERFORMING';
        if (monthlyCases >= 4) return 'AVERAGE';
        return 'NEEDS IMPROVEMENT';
    };

    // Render stat details modal content
    const renderStatDetails = () => {
        if (!selectedStat) return null;

        const stats = calculateStats();
        const { monthSpecificStats } = stats;
        const currentMonth = months[appliedFilters.month];

        if (loadingStatHistory) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '16px', color: '#64748b' }}>Loading statistics history...</div>
                </div>
            );
        }

        if (!currentHistoryData) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '16px', color: '#dc3545' }}>Failed to load history data.</div>
                </div>
            );
        }

        return (
            <div>
                <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>{currentHistoryData.title}</h3>
                <p style={{ marginBottom: '24px', color: '#64748b', fontSize: '14px' }}>
                    {currentHistoryData.description} - {currentMonth} {appliedFilters.year}
                </p>

                <div style={{
                    background: '#f8fafc',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Current Value</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                                {selectedStat === 'activityRatio' && `${monthSpecificStats.activityRatio}%`}
                                {selectedStat === 'totalANP' && `₱ ${Math.round(mpStats.totalANP || 0).toLocaleString()}`}
                                {selectedStat === 'monthlyANP' && `₱ ${mpStats.monthlyANP.toLocaleString()}`}
                                {selectedStat === 'totalCases' && mpStats.monthlyCases.toLocaleString()}
                                {selectedStat === 'totalALs' && mpStats.totalALs}
                                {selectedStat === 'totalAPs' && mpStats.totalAPs}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Yearly Change</div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: currentHistoryData.trend === 'up' ? '#28a745' :
                                    currentHistoryData.trend === 'down' ? '#dc3545' : '#6c757d'
                            }}>
                                {currentHistoryData.trend === 'up' && '+'}{currentHistoryData.yearlyChange.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>

                <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Monthly History</h4>
                <div className="modal-table-responsive">
                    <table className="performance-table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Value</th>
                                <th>Trend</th>
                                <th>Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentHistoryData.monthlyData.map((item, index) => {
                                const prevValue = index > 0 ? currentHistoryData.monthlyData[index - 1].value : item.value;
                                const change = prevValue > 0 ? ((item.value - prevValue) / prevValue * 100).toFixed(1) : 0;

                                return (
                                    <tr key={item.month}>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{item.month}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>
                                                {currentHistoryData.prefix || ''}{item.value.toLocaleString()} {currentHistoryData.unit}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`stat-trend ${item.trend}`}>
                                                {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{
                                                fontWeight: '600',
                                                color: item.trend === 'up' ? '#28a745' :
                                                    item.trend === 'down' ? '#dc3545' : '#6c757d'
                                            }}>
                                                {item.trend === 'up' ? '+' : item.trend === 'down' ? '-' : ''}{index > 0 ? `${change}%` : 'N/A'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Trend Visualization</h4>
                    <div style={{ height: '200px' }}>
                        <Bar
                            data={{
                                labels: currentHistoryData.monthlyData.map(d => d.month),
                                datasets: [{
                                    label: currentHistoryData.title,
                                    data: currentHistoryData.monthlyData.map(d => d.value),
                                    backgroundColor: '#003781',
                                    borderRadius: 4
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function (value) {
                                                return currentHistoryData.prefix ? `${currentHistoryData.prefix}${value}${currentHistoryData.unit}` : `${value}${currentHistoryData.unit}`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <MPLayout title="Dashboard">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <div style={{ fontSize: '18px', color: '#64748b' }}>Loading dashboard data...</div>
                </div>
            </MPLayout>
        );
    }

    if (error) {
        return (
            <MPLayout title="Dashboard">
                <div style={{ padding: '24px', color: 'red' }}>Error loading data: {error}</div>
            </MPLayout>
        );
    }

    // Calculate current stats
    const stats = calculateStats();

    // Use real chart data from backend (mpStats)
    // Note: mpStats is already updated by refreshData(year)
    const mostAvailedPolicies = mpStats.policyDistribution || [];
    const monthlyIssuedPolicies = mpStats.monthlyTrend || [];

    const selectedMonthYear = `${months[appliedFilters.month]} ${appliedFilters.year}`;
    const monthSpecificStats = stats.monthSpecificStats;

    // Chart data for most availed policies
    const policyChartData = {
        labels: mostAvailedPolicies.map(p => p.policy_name),
        datasets: [{
            label: 'Number of Policies',
            data: mostAvailedPolicies.map(p => p.count),
            backgroundColor: ['#003781', '#0055b8', '#4d7cff', '#7ba0ff', '#a3c1ff', '#d1e0ff'],
            borderRadius: 6
        }]
    };

    // Monthly issued chart data
    const monthlyChartData = {
        labels: monthlyIssuedPolicies.map(m => m.month),
        datasets: [
            {
                label: 'Policies Issued',
                data: monthlyIssuedPolicies.map(m => m.issued),
                backgroundColor: '#003781',
                borderRadius: 6
            },
            {
                label: 'ANP (Millions)',
                data: monthlyIssuedPolicies.map(m => m.anp / 1000000),
                backgroundColor: '#28a745',
                borderRadius: 6,
                yAxisID: 'y1'
            }
        ]
    };

    // Get top performing ALs for the table
    const topALs = getTopPerformers();

    // Render the overview
    const renderOverview = () => (
        <>
            {/* Filters with Apply Button - Updated button styles */}
            <div className="mp-filters">
                <div className="filter-group">
                    <label>Select Month:</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="mp-filter-select"
                    >
                        {months.map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Select Year:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="mp-filter-select"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Search AL/AP:</label>
                    <input
                        type="text"
                        placeholder="Search AL or AP name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mp-search-input"
                    />
                </div>

                <div className="filter-group">
                    <label>&nbsp;</label>
                    <div className="filter-buttons">
                        <button onClick={applyFilters} className="apply-filter-btn">
                            Apply Filters
                        </button>
                        <button onClick={clearFilters} className="clear-filter-btn">
                            Clear
                        </button>
                    </div>
                </div>
            </div>



            {/* Top Stats Cards - Now clickable with hover effect */}
            <div className="dashboard-grid">
                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #003781', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('activityRatio')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">Activity Ratio</div>
                        <div className="stat-trend up">↑ 2.3%</div>
                    </div>
                    <div className="stat-value">{monthSpecificStats.activityRatio}%</div>
                    <div className="stat-subtext">{stats.activeAPs} of {mpStats.totalAPs} APs active</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #28a745', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalANP')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">Total ANP</div>
                        <div className="stat-trend up">↑ 12.5%</div>
                    </div>
                    <div className="stat-value">₱ {(mpStats.totalANP / 1000000).toFixed(1)}M</div>
                    <div className="stat-subtext">All-time Annual Premium</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #0055b8', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('monthlyANP')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">Monthly ANP</div>
                        <div className="stat-trend up">↑ 8.2%</div>
                    </div>
                    <div className="stat-value">₱ {mpStats.monthlyANP.toLocaleString()}</div>
                    <div className="stat-subtext">{selectedMonthYear} Performance</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #f39c12', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalCases')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">Total Cases</div>
                        <div className="stat-trend up">↑ 5.7%</div>
                    </div>
                    <div className="stat-value">{mpStats.monthlyCases.toLocaleString()}</div>
                    <div className="stat-subtext">Policies Issued</div>
                </div>
            </div>

            {/* Second Row - Network Stats - Now clickable with hover effect */}
            <div className="dashboard-grid">
                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #9b59b6', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalALs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">Agent Leaders</div>
                        <div className="stat-trend up">↑ 15.4%</div>
                    </div>
                    <div className="stat-value">{mpStats.totalALs}</div>
                    <div className="stat-subtext">{stats.performingALs} Performing ({mpStats.totalALs > 0 ? ((stats.performingALs / mpStats.totalALs) * 100).toFixed(0) : 0}%)</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #e74c3c', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalAPs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">Agent Partners</div>
                        <div className="stat-trend up">↑ 12.2%</div>
                    </div>
                    <div className="stat-value">{mpStats.totalAPs}</div>
                    <div className="stat-subtext">{stats.activeAPs} Active ({mpStats.totalAPs > 0 ? ((stats.activeAPs / mpStats.totalAPs) * 100).toFixed(0) : 0}%)</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #1abc9c', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('activityRatio')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">AL Avg Activity</div>
                        <div className="stat-trend up">↑ 3.1%</div>
                    </div>
                    <div className="stat-value">{stats.avgActivityRatio.toFixed(1)}%</div>
                    <div className="stat-subtext">Average across all ALs</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #2c3e50', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalANP')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-header">
                        <div className="stat-label">AP Avg. ANP</div>
                        <div className="stat-trend up">↑ 8.7%</div>
                    </div>
                    <div className="stat-value">₱ {stats.avgANPPerAP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="stat-subtext">Per Active Partner (Selected)</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-container">
                    <div className="chart-header">
                        <div className="chart-title">Most Availed Policies</div>
                        <div className="chart-subtitle">Popularity by policy type</div>
                    </div>
                    <div className="chart-wrapper">
                        <Bar
                            data={policyChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            stepSize: 5
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="chart-container">
                    <div className="chart-header">
                        <div className="chart-title">Monthly Issued Policies - {appliedFilters.year}</div>
                        <div className="chart-subtitle">Policies vs ANP by month</div>
                    </div>
                    <div className="chart-wrapper">
                        <Bar
                            data={monthlyChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' }
                                },
                                scales: {
                                    y: {
                                        type: 'linear',
                                        display: true,
                                        position: 'left',
                                        title: {
                                            display: true,
                                            text: 'Policies Issued'
                                        }
                                    },
                                    y1: {
                                        type: 'linear',
                                        display: true,
                                        position: 'right',
                                        title: {
                                            display: true,
                                            text: 'ANP (M ₱)'
                                        },
                                        grid: {
                                            drawOnChartArea: false
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Top Performers Table */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h2>🏆 Top Performing Agent Leaders - {selectedMonthYear}</h2>
                    <div className="card-header-actions">
                        <span className="stat-badge">Showing top 5 performers</span>
                    </div>
                </div>
                <div className="card-body">
                    <table className="mp-al-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>AL Name</th>
                                <th>Monthly ANP</th>
                                <th>Activity Ratio</th>
                                <th>Total Cases</th>
                                <th>AP Count</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topALs.map((al, index) => {
                                return (
                                    <tr key={al.id}>
                                        <td>
                                            <div className="rank-badge" style={{
                                                background: index === 0 ? '#FFD700' :
                                                    index === 1 ? '#C0C0C0' :
                                                        index === 2 ? '#CD7F32' : '#f8fafc',
                                                borderColor: index === 0 ? '#FFD700' :
                                                    index === 1 ? '#C0C0C0' :
                                                        index === 2 ? '#CD7F32' : '#e2e8f0',
                                                color: index < 3 ? '#000' : '#0f172a'
                                            }}>
                                                {index === 0 ? '🥇 ' :
                                                    index === 1 ? '🥈 ' :
                                                        index === 2 ? '🥉 ' : `#${index + 1}`}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="agent-info">
                                                <div className="agent-name">{al.name}</div>
                                                <div className="agent-detail">ID: AL-{al.id.toString().padStart(4, '0')}</div>
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                                ₱ {al.monthlyANP.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                Base ANP
                                            </div>
                                        </td>
                                        <td>
                                            <div className="activity-ratio">
                                                <div className="ratio-bar">
                                                    <div
                                                        className="ratio-fill"
                                                        style={{ width: `${al.activityRatio}%` }}
                                                    ></div>
                                                </div>
                                                <span className="ratio-value">{al.activityRatio}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{al.totalCases}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {al.monthlyCases} this month
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{al.totalAPs}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {al.activeAPs} active
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${al.status.toLowerCase().replace(' ', '-')}`}>
                                                {al.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleViewAPsModal(al)}
                                                    className="view-button"
                                                >
                                                    View APs
                                                </button>
                                                <button
                                                    onClick={() => handleViewPolicyDetails(al)}
                                                    className="details-button"
                                                >
                                                    Policy Details
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    return (
        <MPLayout>
            <div className="mp-dashboard-header">
                <h1>CAELUM</h1>
            </div>

            <div className="mp-dashboard-content">
                {viewMode === 'overview' && renderOverview()}
            </div>

            {/* Stat Details Modal */}
            {showStatDetailsModal && (
                <div className="mp-modal">
                    <div className="mp-modal-content" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                        <div className="mp-modal-header">
                            <div>
                                <h2>Statistic Details</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    Historical data and detailed information
                                </p>
                            </div>
                            <button
                                className="mp-modal-close"
                                onClick={() => setShowStatDetailsModal(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="mp-modal-body">
                            {renderStatDetails()}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setShowStatDetailsModal(false)}
                                    className="clear-filter-btn"
                                    style={{ padding: '10px 20px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* APs Modal */}
            {showAPsModal && selectedAL && (
                <div className="mp-modal">
                    <div className="mp-modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh' }}>
                        <div className="mp-modal-header">
                            <div>
                                <h2>{selectedAL.name} - Agent Partners</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    APs under this Agent Leader and their performance
                                </p>
                            </div>
                            <button
                                className="mp-modal-close"
                                onClick={() => setShowAPsModal(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="mp-modal-body">
                            <div style={{
                                background: '#f8fafc',
                                padding: '20px',
                                borderRadius: '12px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Total APs</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                                            {selectedAL.totalAPs}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Active APs</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                                            {selectedAL.activeAPs}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Monthly ANP</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0055b8' }}>
                                            PHP {selectedAL.monthlyANP.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Monthly Cases</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#f39c12' }}>
                                            {selectedAL.monthlyCases}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Agent Partners List</h4>
                            <table className="performance-table">
                                <thead>
                                    <tr>
                                        <th>AP Name</th>
                                        <th>Performance Status</th>
                                        <th>Monthly Cases</th>
                                        <th>Total ANP</th>
                                        <th>Performance Level</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apPerformance
                                        .filter(ap => ap.alName === selectedAL.name)
                                        .slice(0, 5)
                                        .map(ap => {
                                            const performanceStatus = getAPPerformanceStatus(ap.monthlyCases);

                                            return (
                                                <tr key={ap.id}>
                                                    <td>
                                                        <div className="agent-info">
                                                            <div className="agent-name">{ap.name}</div>
                                                            <div className="agent-detail">ID: AP-{ap.id.toString().padStart(4, '0')}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge status-${performanceStatus.toLowerCase().replace(' ', '-')}`}>
                                                            {performanceStatus}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{ap.monthlyCases}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            cases this month
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>
                                                            PHP {ap.totalANP.toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            {ap.monthlyCases >= 7 ? '🎯 Performing (7+ cases)' :
                                                                ap.monthlyCases >= 4 ? '📊 Average (4-6 cases)' :
                                                                    '⚠️ Needs Improvement (<4 cases)'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => navigate(`/mp/ap-performance?ap=${ap.id}`)}
                                                            className="view-button"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setShowAPsModal(false)}
                                    className="clear-filter-btn"
                                    style={{ padding: '10px 20px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Policy Details Modal */}
            {showPolicyModal && selectedAL && (
                <div className="mp-modal">
                    <div className="mp-modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh' }}>
                        <div className="mp-modal-header">
                            <div>
                                <h2>{selectedAL.name} - Policy Details</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    Policy distribution and monthly performance for {months[selectedMonth]} {selectedYear}
                                </p>
                            </div>
                            <button
                                className="mp-modal-close"
                                onClick={() => setShowPolicyModal(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="mp-modal-body">
                            {loadingPolicyDetails ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '16px', color: '#64748b' }}>Loading policy details...</div>
                                </div>
                            ) : policyDetailsData ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                        <div>
                                            <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Policy Distribution</h3>
                                            <div style={{ height: '300px' }}>
                                                <Bar
                                                    data={{
                                                        labels: policyDetailsData.policyDistribution.map(p => p.policy_name),
                                                        datasets: [{
                                                            label: 'Policy Count',
                                                            data: policyDetailsData.policyDistribution.map(p => p.count),
                                                            backgroundColor: ['#003781', '#0055b8', '#4d7cff', '#ffc107', '#e74c3c', '#2c3e50'],
                                                            borderRadius: 6
                                                        }]
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false }
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                ticks: {
                                                                    stepSize: 10
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h3 style={{ margin: 0, color: '#0f172a' }}>Monthly Trend - {appliedFilters.year}</h3>
                                                <div style={{
                                                    background: '#e3f2fd',
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <span style={{ fontSize: '12px', color: '#0055b8', fontWeight: '600' }}>Total Cases:</span>
                                                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#003781' }}>
                                                        {policyDetailsData.totalCases}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ height: '300px' }}>
                                                <Bar
                                                    data={{
                                                        labels: months.map(m => m.substring(0, 3)),
                                                        datasets: [{
                                                            label: 'Policies Issued',
                                                            data: policyDetailsData.monthlyTrend.map(m => m.policiesIssued),
                                                            backgroundColor: '#003781',
                                                            borderRadius: 6
                                                        }]
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false }
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                ticks: {
                                                                    stepSize: 5
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '16px', color: '#64748b' }}>No policy data available</div>
                                </div>
                            )}

                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Policy Statistics - {selectedMonthYear}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Total Policies</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                                            {selectedAL.totalCases}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Current Month</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                                            {selectedAL.monthlyCases}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Monthly ANP</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0055b8' }}>
                                            PHP {selectedAL.monthlyANP.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Most Availed</div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                            {policyDetailsData && policyDetailsData.policyDistribution && policyDetailsData.policyDistribution.length > 0
                                                ? policyDetailsData.policyDistribution[0].policy_name
                                                : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Policy Breakdown</h4>
                            <table className="policy-table">
                                <thead>
                                    <tr>
                                        <th>Policy Name</th>
                                        <th>Category</th>
                                        <th>Count</th>
                                        <th>Percentage</th>
                                        <th>ANP Generated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policyDetailsData && policyDetailsData.policyDistribution && policyDetailsData.policyDistribution.length > 0 ? (
                                        policyDetailsData.policyDistribution.map((policy, index) => {
                                            const estimatedANP = Math.floor(policy.count * 50000);

                                            return (
                                                <tr key={policy.policy_name}>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{policy.policy_name}</div>
                                                    </td>
                                                    <td>
                                                        <span className="category-badge system">
                                                            System
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: '600', textAlign: 'center' }}>{policy.count}</td>
                                                    <td>
                                                        <div className="percentage-bar">
                                                            <div
                                                                className="percentage-fill"
                                                                style={{ width: `${policy.percentage}%` }}
                                                            ></div>
                                                            <span className="percentage-value">{policy.percentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: '#28a745' }}>
                                                        PHP {estimatedANP.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                No policy data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setShowPolicyModal(false)}
                                    className="clear-filter-btn"
                                    style={{ padding: '10px 20px' }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPolicyModal(false);
                                        setShowAPsModal(true);
                                    }}
                                    className="apply-filter-btn"
                                    style={{ padding: '10px 20px' }}
                                >
                                    View APs Under This AL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MPLayout>
    );
};

export default MPDashboard;