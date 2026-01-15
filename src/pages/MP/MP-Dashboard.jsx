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
    const { mpStats, alPerformance, apPerformance } = useMPData();
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
        // This function would normally fetch new data from API
        // For now, we'll just update the state with filtered data
        console.log(`Filtering data for: Month ${month}, Year ${year}, Search: ${search}`);
    };

    // Calculate summary statistics (updated with filter logic)
    const calculateStats = () => {
        const totalALs = alPerformance.length;
        const performingALs = alPerformance.filter(al => al.status === 'PERFORMING').length;
        const totalALANP = alPerformance.reduce((sum, al) => sum + al.totalANP, 0);
        const totalALPolicies = alPerformance.reduce((sum, al) => sum + al.totalCases, 0);
        const avgActivityRatio = alPerformance.reduce((sum, al) => sum + al.activityRatio, 0) / totalALs;

        const totalAPs = apPerformance.length;
        const activeAPs = apPerformance.filter(ap => ap.monthlyCases > 0).length; // Updated: Active if issued at least 1 policy
        const totalAPANP = apPerformance.reduce((sum, ap) => sum + ap.totalANP, 0);
        const totalAPPolicies = apPerformance.reduce((sum, ap) => sum + ap.totalCases, 0);
        const avgANPPerAP = totalAPs > 0 ? totalAPANP / totalAPs : 0;

        // Get month/year specific data
        const monthData = getMonthSpecificData(selectedMonth, selectedYear);
        
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
            monthData
        };
    };

    // Get month/year specific data
    const getMonthSpecificData = (month, year) => {
        // Mock data for different months/years
        const monthlyData = {
            0: { // January
                2024: { activityRatio: 75, monthlyANP: 2850000, totalPolicies: 2100 },
                2025: { activityRatio: 78, monthlyANP: 3200000, totalPolicies: 2400 },
                2026: { activityRatio: 82, monthlyANP: 3500000, totalPolicies: 2650 }
            },
            1: { // February
                2024: { activityRatio: 76, monthlyANP: 2900000, totalPolicies: 2150 },
                2025: { activityRatio: 79, monthlyANP: 3300000, totalPolicies: 2450 },
                2026: { activityRatio: 83, monthlyANP: 3600000, totalPolicies: 2700 }
            },
            6: { // July
                2024: { activityRatio: 80, monthlyANP: 3250000, totalPolicies: 2400 },
                2025: { activityRatio: 83, monthlyANP: 3600000, totalPolicies: 2700 },
                2026: { activityRatio: 86, monthlyANP: 3900000, totalPolicies: 2950 }
            },
            11: { // December
                2024: { activityRatio: 85, monthlyANP: 3500000, totalPolicies: 2650 },
                2025: { activityRatio: 88, monthlyANP: 3850000, totalPolicies: 2900 },
                2026: { activityRatio: 90, monthlyANP: 4200000, totalPolicies: 3200 }
            }
        };

        // Default data
        const defaultData = {
            activityRatio: 75,
            monthlyANP: 2980000,
            totalPolicies: 2100
        };

        return monthlyData[month]?.[year] || defaultData;
    };

    // Get historical data for stat cards
    const getStatHistoryData = (statType) => {
        const historyData = {
            activityRatio: {
                title: 'Activity Ratio History',
                description: 'Monthly activity ratio trend over the past year',
                data: [
                    { month: 'Jan', value: 72, trend: 'up' },
                    { month: 'Feb', value: 74, trend: 'up' },
                    { month: 'Mar', value: 76, trend: 'up' },
                    { month: 'Apr', value: 75, trend: 'down' },
                    { month: 'May', value: 77, trend: 'up' },
                    { month: 'Jun', value: 79, trend: 'up' },
                    { month: 'Jul', value: 80, trend: 'up' },
                    { month: 'Aug', value: 82, trend: 'up' },
                    { month: 'Sep', value: 81, trend: 'down' },
                    { month: 'Oct', value: 83, trend: 'up' },
                    { month: 'Nov', value: 84, trend: 'up' },
                    { month: 'Dec', value: 85, trend: 'up' }
                ],
                unit: '%'
            },
            totalANP: {
                title: 'Total ANP History',
                description: 'Cumulative Annual Premium growth over time',
                data: [
                    { month: 'Jan', value: 2.1, trend: 'up' },
                    { month: 'Feb', value: 2.4, trend: 'up' },
                    { month: 'Mar', value: 2.8, trend: 'up' },
                    { month: 'Apr', value: 3.2, trend: 'up' },
                    { month: 'May', value: 3.6, trend: 'up' },
                    { month: 'Jun', value: 4.1, trend: 'up' },
                    { month: 'Jul', value: 4.5, trend: 'up' },
                    { month: 'Aug', value: 4.9, trend: 'up' },
                    { month: 'Sep', value: 5.4, trend: 'up' },
                    { month: 'Oct', value: 5.8, trend: 'up' },
                    { month: 'Nov', value: 6.3, trend: 'up' },
                    { month: 'Dec', value: 6.8, trend: 'up' }
                ],
                unit: 'M PHP',
                prefix: 'PHP '
            },
            monthlyANP: {
                title: 'Monthly ANP History',
                description: 'Monthly ANP performance trend',
                data: [
                    { month: 'Jan', value: 285, trend: 'up' },
                    { month: 'Feb', value: 290, trend: 'up' },
                    { month: 'Mar', value: 295, trend: 'up' },
                    { month: 'Apr', value: 310, trend: 'up' },
                    { month: 'May', value: 325, trend: 'up' },
                    { month: 'Jun', value: 340, trend: 'up' },
                    { month: 'Jul', value: 330, trend: 'down' },
                    { month: 'Aug', value: 320, trend: 'down' },
                    { month: 'Sep', value: 335, trend: 'up' },
                    { month: 'Oct', value: 350, trend: 'up' },
                    { month: 'Nov', value: 365, trend: 'up' },
                    { month: 'Dec', value: 380, trend: 'up' }
                ],
                unit: 'K PHP',
                prefix: 'PHP '
            },
            totalCases: {
                title: 'Total Cases History',
                description: 'Total policies issued over time',
                data: [
                    { month: 'Jan', value: 2100, trend: 'up' },
                    { month: 'Feb', value: 2150, trend: 'up' },
                    { month: 'Mar', value: 2200, trend: 'up' },
                    { month: 'Apr', value: 2300, trend: 'up' },
                    { month: 'May', value: 2400, trend: 'up' },
                    { month: 'Jun', value: 2500, trend: 'up' },
                    { month: 'Jul', value: 2600, trend: 'up' },
                    { month: 'Aug', value: 2700, trend: 'up' },
                    { month: 'Sep', value: 2800, trend: 'up' },
                    { month: 'Oct', value: 2900, trend: 'up' },
                    { month: 'Nov', value: 3000, trend: 'up' },
                    { month: 'Dec', value: 3200, trend: 'up' }
                ],
                unit: ''
            },
            totalALs: {
                title: 'Agent Leaders History',
                description: 'Number of Agent Leaders over time',
                data: [
                    { month: 'Jan', value: 8, trend: 'stable' },
                    { month: 'Feb', value: 8, trend: 'stable' },
                    { month: 'Mar', value: 9, trend: 'up' },
                    { month: 'Apr', value: 9, trend: 'stable' },
                    { month: 'May', value: 10, trend: 'up' },
                    { month: 'Jun', value: 10, trend: 'stable' },
                    { month: 'Jul', value: 11, trend: 'up' },
                    { month: 'Aug', value: 11, trend: 'stable' },
                    { month: 'Sep', value: 12, trend: 'up' },
                    { month: 'Oct', value: 12, trend: 'stable' },
                    { month: 'Nov', value: 13, trend: 'up' },
                    { month: 'Dec', value: 13, trend: 'stable' }
                ],
                unit: 'ALs'
            },
            totalAPs: {
                title: 'Agent Partners History',
                description: 'Number of Agent Partners over time',
                data: [
                    { month: 'Jan', value: 45, trend: 'up' },
                    { month: 'Feb', value: 48, trend: 'up' },
                    { month: 'Mar', value: 52, trend: 'up' },
                    { month: 'Apr', value: 55, trend: 'up' },
                    { month: 'May', value: 58, trend: 'up' },
                    { month: 'Jun', value: 62, trend: 'up' },
                    { month: 'Jul', value: 65, trend: 'up' },
                    { month: 'Aug', value: 68, trend: 'up' },
                    { month: 'Sep', value: 72, trend: 'up' },
                    { month: 'Oct', value: 75, trend: 'up' },
                    { month: 'Nov', value: 78, trend: 'up' },
                    { month: 'Dec', value: 82, trend: 'up' }
                ],
                unit: 'APs'
            }
        };

        return historyData[statType] || {
            title: 'Statistic History',
            description: 'Historical data for this statistic',
            data: [],
            unit: ''
        };
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
        
        // Sort by monthly ANP (with month/year adjustment)
        return filteredALs
            .sort((a, b) => {
                // Adjust ANP based on month/year
                const aAdjusted = adjustANPForMonth(a.monthlyANP, appliedFilters.month, appliedFilters.year);
                const bAdjusted = adjustANPForMonth(b.monthlyANP, appliedFilters.month, appliedFilters.year);
                return bAdjusted - aAdjusted;
            })
            .slice(0, 5);
    };

    // Adjust ANP based on month/year
    const adjustANPForMonth = (baseANP, month, year) => {
        // Simple adjustment based on month
        const monthAdjustments = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.2, 1.15, 1.1, 1.05, 1.0, 0.95];
        const yearMultiplier = year === 2026 ? 1.2 : year === 2025 ? 1.1 : 1.0;
        
        return baseANP * monthAdjustments[month] * yearMultiplier;
    };

    // Get most availed policies based on filters
    const getMostAvailedPolicies = () => {
        const basePolicies = [
            { policy_name: 'Allianz Well', count: 45, percentage: 32, category: 'System' },
            { policy_name: 'Eazy Health', count: 32, percentage: 23, category: 'Manual' },
            { policy_name: 'Allianz Fundamental Cover', count: 28, percentage: 20, category: 'Manual' },
            { policy_name: 'AZpire Growth', count: 20, percentage: 14, category: 'System' },
            { policy_name: 'Allianz Secure Pro', count: 10, percentage: 7, category: 'Manual' },
            { policy_name: 'Single Pay/Optimal', count: 5, percentage: 4, category: 'System' }
        ];

        // Adjust counts based on month/year
        const monthMultiplier = appliedFilters.month === 11 ? 1.3 : appliedFilters.month === 0 ? 0.8 : 1.0;
        const yearMultiplier = appliedFilters.year === 2026 ? 1.2 : appliedFilters.year === 2025 ? 1.1 : 1.0;
        const totalMultiplier = monthMultiplier * yearMultiplier;

        return basePolicies.map(policy => ({
            ...policy,
            count: Math.round(policy.count * totalMultiplier),
            percentage: Math.round(policy.percentage * totalMultiplier * 100) / 100
        }));
    };

    // Get monthly issued policies based on year
    const getMonthlyIssuedPolicies = () => {
        const baseData = [
            { month: 'Jan', issued: 18, anp: 1450000 },
            { month: 'Feb', issued: 22, anp: 1680000 },
            { month: 'Mar', issued: 25, anp: 1950000 },
            { month: 'Apr', issued: 28, anp: 2200000 },
            { month: 'May', issued: 32, anp: 2550000 },
            { month: 'Jun', issued: 35, anp: 2850000 },
            { month: 'Jul', issued: 30, anp: 2450000 },
            { month: 'Aug', issued: 28, anp: 2300000 },
            { month: 'Sep', issued: 26, anp: 2100000 },
            { month: 'Oct', issued: 24, anp: 1950000 },
            { month: 'Nov', issued: 20, anp: 1650000 },
            { month: 'Dec', issued: 18, anp: 1500000 }
        ];

        // Adjust for selected year
        const yearMultiplier = appliedFilters.year === 2026 ? 1.2 : appliedFilters.year === 2025 ? 1.1 : 1.0;
        
        return baseData.map(item => ({
            month: item.month,
            issued: Math.round(item.issued * yearMultiplier),
            anp: Math.round(item.anp * yearMultiplier)
        }));
    };

    // Handle View APs Modal
    const handleViewAPsModal = (al) => {
        setSelectedAL(al);
        setShowAPsModal(true);
    };

    // Handle View Policy Details Modal
    const handleViewPolicyDetails = (al) => {
        setSelectedAL(al);
        setShowPolicyModal(true);
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
        const historyData = getStatHistoryData(selectedStat);
        const currentMonth = months[appliedFilters.month];
        
        return (
            <div>
                <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>{historyData.title}</h3>
                <p style={{ marginBottom: '24px', color: '#64748b', fontSize: '14px' }}>
                    {historyData.description} - {currentMonth} {appliedFilters.year}
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
                                {selectedStat === 'activityRatio' && `${getMonthSpecificData(appliedFilters.month, appliedFilters.year).activityRatio}%`}
                                {selectedStat === 'totalANP' && `PHP ${(stats.totalALANP / 1000000).toFixed(1)}M`}
                                {selectedStat === 'monthlyANP' && `PHP ${getMonthSpecificData(appliedFilters.month, appliedFilters.year).monthlyANP.toLocaleString()}`}
                                {selectedStat === 'totalCases' && getMonthSpecificData(appliedFilters.month, appliedFilters.year).totalPolicies.toLocaleString()}
                                {selectedStat === 'totalALs' && stats.totalALs}
                                {selectedStat === 'totalAPs' && stats.totalAPs}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Yearly Change</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                                {selectedStat === 'activityRatio' && '+2.3%'}
                                {selectedStat === 'totalANP' && '+12.5%'}
                                {selectedStat === 'monthlyANP' && '+8.2%'}
                                {selectedStat === 'totalCases' && '+5.7%'}
                                {selectedStat === 'totalALs' && '+15.4%'}
                                {selectedStat === 'totalAPs' && '+12.2%'}
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
                            {historyData.data.map((item, index) => {
                                const prevValue = index > 0 ? historyData.data[index - 1].value : item.value;
                                const change = ((item.value - prevValue) / prevValue * 100).toFixed(1);
                                
                                return (
                                    <tr key={item.month}>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{item.month}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>
                                                {historyData.prefix || ''}{item.value.toLocaleString()} {historyData.unit}
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
                                labels: historyData.data.map(d => d.month),
                                datasets: [{
                                    label: historyData.title,
                                    data: historyData.data.map(d => d.value),
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
                                            callback: function(value) {
                                                return historyData.prefix ? `${historyData.prefix}${value}${historyData.unit}` : `${value}${historyData.unit}`;
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

    // Calculate current stats
    const stats = calculateStats();
    const topALs = getTopPerformers();
    const mostAvailedPolicies = getMostAvailedPolicies();
    const monthlyIssuedPolicies = getMonthlyIssuedPolicies();
    const selectedMonthYear = `${months[appliedFilters.month]} ${appliedFilters.year}`;
    const monthSpecificStats = getMonthSpecificData(appliedFilters.month, appliedFilters.year);

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
                    <div className="stat-subtext">{stats.activeAPs} of {stats.totalAPs} APs active</div>
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
                    <div className="stat-value">PHP {(stats.totalALANP / 1000000).toFixed(1)}M</div>
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
                    <div className="stat-value">PHP {monthSpecificStats.monthlyANP.toLocaleString()}</div>
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
                    <div className="stat-value">{monthSpecificStats.totalPolicies.toLocaleString()}</div>
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
                    <div className="stat-value">{stats.totalALs}</div>
                    <div className="stat-subtext">{stats.performingALs} Performing ({((stats.performingALs/stats.totalALs)*100).toFixed(0)}%)</div>
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
                    <div className="stat-value">{stats.totalAPs}</div>
                    <div className="stat-subtext">{stats.activeAPs} Active ({((stats.activeAPs/stats.totalAPs)*100).toFixed(0)}%)</div>
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
                    <div className="stat-value">PHP {stats.avgANPPerAP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="stat-subtext">Per Active Partner</div>
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
                                            text: 'ANP (M PHP)'
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
                                const adjustedANP = adjustANPForMonth(al.monthlyANP, appliedFilters.month, appliedFilters.year);
                                
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
                                                PHP {adjustedANP.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {al.monthlyANP.toLocaleString()} base
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Policy Distribution</h3>
                                    <div style={{ height: '300px' }}>
                                        <Bar 
                                            data={{
                                                labels: ['Allianz Well', 'Eazy Health', 'Allianz Fundamental Cover', 'AZpire Growth', 'Allianz Secure Pro', 'Single Pay/Optimal'],
                                                datasets: [{
                                                    label: 'Policy Count',
                                                    data: [145, 80, 55, 25, 10, 5],
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
                                    <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Monthly Trend - {selectedYear}</h3>
                                    <div style={{ height: '300px' }}>
                                        <Bar 
                                            data={{
                                                labels: months.map(m => m.substring(0, 3)),
                                                datasets: [{
                                                    label: 'Policies Issued',
                                                    data: [15, 18, 22, 25, 28, 30, 25, 22, 20, 18, 15, 12],
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
                                            Allianz Well
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
                                    {[
                                        { policy_name: 'Allianz Well', category: 'System', count: 145, percentage: 45 },
                                        { policy_name: 'Eazy Health', category: 'Manual', count: 80, percentage: 25 },
                                        { policy_name: 'Allianz Fundamental Cover', category: 'Manual', count: 55, percentage: 17 },
                                        { policy_name: 'AZpire Growth', category: 'System', count: 25, percentage: 8 },
                                        { policy_name: 'Allianz Secure Pro', category: 'Manual', count: 10, percentage: 3 },
                                        { policy_name: 'Single Pay/Optimal', category: 'System', count: 5, percentage: 2 }
                                    ].map((policy, index) => {
                                        const estimatedANP = Math.floor(policy.count * 50000);
                                        
                                        return (
                                            <tr key={policy.policy_name}>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>{policy.policy_name}</div>
                                                </td>
                                                <td>
                                                    <span className={`category-badge ${policy.category.toLowerCase()}`}>
                                                        {policy.category}
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
                                    })}
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