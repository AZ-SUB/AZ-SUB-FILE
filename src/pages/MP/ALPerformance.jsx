// ALPerformance.jsx - FINAL UPDATED VERSION
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALPageSkeleton } from './MPSkeletons';
import { useMPData } from './MPData';
import MPLayout from './MPLayout';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './MP_Styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const ALPerformance = () => {
    const { alPerformance, apPerformance, getAPsByAL, loading } = useMPData();
    const navigate = useNavigate();



    // State for filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [appliedFilters, setAppliedFilters] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        status: 'All',
        search: ''
    });

    // State for modals
    const [showAPsModal, setShowAPsModal] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [showStatDetailsModal, setShowStatDetailsModal] = useState(false);
    const [selectedStat, setSelectedStat] = useState(null);
    const [selectedAL, setSelectedAL] = useState(null);

    // State for policy details data
    const [policyDetailsData, setPolicyDetailsData] = useState(null);
    const [loadingPolicyDetails, setLoadingPolicyDetails] = useState(false);

    // Month names
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    // Apply filters
    const applyFilters = () => {
        setAppliedFilters({
            month: selectedMonth,
            year: selectedYear,
            status: statusFilter,
            search: searchTerm
        });
    };

    // Clear filters
    const clearFilters = () => {
        setSelectedMonth(new Date().getMonth());
        setSelectedYear(currentYear);
        setStatusFilter('All');
        setSearchTerm('');
        setAppliedFilters({
            month: new Date().getMonth(),
            year: currentYear,
            status: 'All',
            search: ''
        });
    };

    // Calculate AP performance status
    const getAPPerformanceStatus = (monthlyCases) => {
        if (monthlyCases >= 7) return 'PERFORMING';
        if (monthlyCases >= 4) return 'AVERAGE';
        return 'NEEDS IMPROVEMENT';
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

    // Handle View AP Details - Now shows AP details modal instead of navigating
    const handleViewAPDetails = (ap) => {
        navigate('/mp/ap-performance', {
            state: {
                selectedAP: ap,
                selectedMonth: appliedFilters.month,
                selectedYear: appliedFilters.year
            }
        });
    };

    // Handle Stat Card Click
    const handleStatCardClick = (statType) => {
        setSelectedStat(statType);
        setShowStatDetailsModal(true);
    };

    // Filter ALs based on applied filters
    const filteredALs = alPerformance.filter(al => {
        // Status filter
        if (appliedFilters.status !== 'All' && al.status !== appliedFilters.status) {
            return false;
        }

        // Search filter
        // Search filter
        if (appliedFilters.search &&
            !al.name.toLowerCase().includes(appliedFilters.search.toLowerCase()) &&
            !al.city.toLowerCase().includes(appliedFilters.search.toLowerCase())) {
            return false;
        }

        return true;
    });

    // Calculate statistics
    const totalALs = filteredALs.length;
    const performingALs = filteredALs.filter(al => al.status === 'PERFORMING').length;
    const averageActivityRatio = filteredALs.length > 0 ?
        filteredALs.reduce((sum, al) => sum + al.activityRatio, 0) / filteredALs.length : 0;
    const totalANP = filteredALs.reduce((sum, al) => sum + al.totalANP, 0);
    const totalCases = filteredALs.reduce((sum, al) => sum + al.totalCases, 0);

    // Get unique statuses for filter
    const uniqueStatuses = ['All', 'PERFORMING', 'AVERAGE', 'NEEDS IMPROVEMENT'];

    // Get AP performance summary for a specific AL
    const getAPPerformanceSummaryForAL = (alName) => {
        const aps = getAPsByAL(alName);
        const total = aps.length;
        const active = aps.filter(ap => ap.monthlyCases > 0).length; // Active if issued at least 1 policy
        const performing = aps.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'PERFORMING').length;
        const average = aps.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'AVERAGE').length;
        const needsImprovement = aps.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'NEEDS IMPROVEMENT').length;
        const inactive = aps.filter(ap => ap.monthlyCases === 0).length;

        return { total, active, performing, average, needsImprovement, inactive };
    };

    // Get monthly performance adjusted for selected month/year
    const getAdjustedMonthlyPerformance = (al) => {
        const basePerformance = {
            policiesIssued: al.monthlyCases,
            anp: al.monthlyANP,
            newClients: Math.floor(al.monthlyCases * 0.6),
            conversionRate: 80 + Math.floor(Math.random() * 15)
        };

        // Adjust based on selected month/year
        const monthMultiplier = appliedFilters.month === 11 ? 1.3 : appliedFilters.month === 0 ? 0.8 : 1.0;
        const yearMultiplier = appliedFilters.year === 2026 ? 1.2 : appliedFilters.year === 2025 ? 1.1 : 1.0;
        const totalMultiplier = monthMultiplier * yearMultiplier;

        return {
            policiesIssued: Math.round(basePerformance.policiesIssued * totalMultiplier),
            anp: Math.round(basePerformance.anp * totalMultiplier),
            newClients: Math.round(basePerformance.newClients * totalMultiplier),
            conversionRate: basePerformance.conversionRate
        };
    };

    // Render stat details based on selected stat
    const renderStatDetails = () => {
        switch (selectedStat) {
            case 'totalALs':
                return (
                    <div>
                        <h3>Total Agency Leaders Details</h3>
                        <p>Showing detailed information about all Agency Leaders in the network.</p>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Total ALs:</span>
                                <span className="info-value">{totalALs}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Performing ALs:</span>
                                <span className="info-value">{performingALs}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Average ALs:</span>
                                <span className="info-value">{filteredALs.filter(al => al.status === 'AVERAGE').length}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Needs Improvement:</span>
                                <span className="info-value">{filteredALs.filter(al => al.status === 'NEEDS IMPROVEMENT').length}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'performingALs':
                return (
                    <div>
                        <h3>Performing Agency Leaders Details</h3>
                        <p>Agency Leaders with monthly cases ≥ 7 policies.</p>
                        <table className="performance-table">
                            <thead>
                                <tr>
                                    <th>AL Name</th>
                                    <th>Monthly Cases</th>
                                    <th>Activity Ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredALs.filter(al => al.status === 'PERFORMING').map(al => (
                                    <tr key={al.id}>
                                        <td>{al.name}</td>
                                        <td>{al.monthlyCases}</td>
                                        <td>{al.activityRatio}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'totalANP':
                return (
                    <div>
                        <h3>Total ANP Details</h3>
                        <p>Cumulative Annual Premium from all Agency Leaders.</p>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Total ANP:</span>
                                <span className="info-value">₱ {totalANP.toLocaleString()}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Average per AL:</span>
                                <span className="info-value">₱ {Math.round(totalANP / totalALs).toLocaleString()}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Monthly ANP:</span>
                                <span className="info-value">₱ {filteredALs.reduce((sum, al) => sum + al.monthlyANP, 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'totalCases':
                return (
                    <div>
                        <h3>Total Cases Details</h3>
                        <p>Total policies issued by all Agency Leaders.</p>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Total Cases:</span>
                                <span className="info-value">{totalCases}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Average per AL:</span>
                                <span className="info-value">{Math.round(totalCases / totalALs)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Monthly Cases:</span>
                                <span className="info-value">{filteredALs.reduce((sum, al) => sum + al.monthlyCases, 0)}</span>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <ALPageSkeleton />;
    }

    return (
        <MPLayout title="Agent Leaders Performance">
            {/* Header with Filters - Matching MPDashboard style */}

            <div className="mp-filters">
                <div className="filter-group">
                    <label>Search AL</label>
                    <input
                        type="text"
                        placeholder="Search by name or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mp-search-input"
                    />
                </div>

                <div className="filter-group">
                    <label>Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mp-filter-select"
                    >
                        {uniqueStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Month</label>
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
                    <label>Year</label>
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


            {/* Clickable Stat Cards with Hover Effect */}
            <div className="dashboard-grid">
                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #003781', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalALs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Total Agency Leaders</div>
                    <div className="stat-value">{totalALs}</div>
                    <div className="stat-subtext">Managing the network</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #28a745', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('performingALs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Performing ALs</div>
                    <div className="stat-value">{performingALs}</div>
                    <div className="stat-subtext">{(totalALs > 0 ? (performingALs / totalALs * 100).toFixed(1) : 0)}% of total</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #0055b8', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalANP')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Total ANP</div>
                    <div className="stat-value">₱ {totalANP.toLocaleString()}</div>
                    <div className="stat-subtext">Cumulative from ALs</div>
                </div>

                <div
                    className="stat-card hover-card"
                    style={{ borderLeft: '4px solid #f39c12', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalCases')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Total Cases</div>
                    <div className="stat-value">{totalCases}</div>
                    <div className="stat-subtext">{(totalALs > 0 ? (totalCases / totalALs).toFixed(0) : 0)} avg per AL</div>
                </div>
            </div>

            {/* Main Table */}
            <div className="card">
                <div className="card-header">
                    <h2>Agency Leaders Detailed View - {months[appliedFilters.month]} {appliedFilters.year}</h2>
                    <div className="card-header-stats">
                        <span className="stat-badge">Showing: {filteredALs.length} of {alPerformance.length}</span>
                        <span className="stat-badge status-performing">Performing: {performingALs}</span>
                    </div>
                </div>
                <div className="card-body">
                    <table className="mp-al-table">
                        <thead>
                            <tr>
                                <th>AL Name</th>
                                <th>City</th>
                                <th>AP Count</th>
                                <th>Activity Ratio</th>
                                <th>Total ANP</th>
                                <th>Monthly ANP</th>
                                <th>Total Cases</th>
                                <th>Monthly Cases</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredALs.map(al => {
                                const apSummary = getAPPerformanceSummaryForAL(al.name);
                                const monthlyPerformance = getAdjustedMonthlyPerformance(al);

                                return (
                                    <tr key={al.id}>
                                        <td>
                                            <div className="agent-info">
                                                <div className="agent-name">{al.name}</div>
                                                <div className="agent-detail">
                                                    {al.city}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{al.city}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{apSummary.total}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {apSummary.active} active ({apSummary.active > 0 ? Math.round((apSummary.active / apSummary.total) * 100) : 0}%)
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
                                            <div style={{ fontWeight: '600' }}>
                                                ₱ {al.totalANP.toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#28a745' }}>
                                                ₱ {monthlyPerformance.anp.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {monthlyPerformance.policiesIssued} policies
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{al.totalCases}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{monthlyPerformance.policiesIssued}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {monthlyPerformance.newClients} new clients
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
                                                    View APs ({apSummary.total})
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

            {/* APs Modal */}
            {showAPsModal && selectedAL && (
                <div className="mp-modal">
                    <div className="mp-modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh' }}>
                        <div className="mp-modal-header">
                            <div>
                                <h2>{selectedAL.name} - Agency Partners</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    APs under this Agency Leader and their performance
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
                                            {getAPPerformanceSummaryForAL(selectedAL.name).total}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Active APs</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                                            {getAPPerformanceSummaryForAL(selectedAL.name).active}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Performing APs</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0055b8' }}>
                                            {getAPPerformanceSummaryForAL(selectedAL.name).performing}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Avg. Monthly Cases</div>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#f39c12' }}>
                                            {Math.floor(getAPsByAL(selectedAL.name).reduce((sum, ap) => sum + (ap.monthlyCases || 0), 0) / getAPsByAL(selectedAL.name).length)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Agency Partners List</h4>
                            <div className="modal-table-responsive">
                                <table className="performance-table">
                                    <thead>
                                        <tr>
                                            <th>AP Name</th>
                                            <th>Activity Status</th>
                                            <th>Total ANP</th>
                                            <th>Monthly ANP</th>
                                            <th>Total Cases</th>
                                            <th>Monthly Cases</th>
                                            <th>Performance Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getAPsByAL(selectedAL.name).map(ap => {
                                            const performanceStatus = getAPPerformanceStatus(ap.monthlyCases);
                                            const isActive = ap.monthlyCases > 0;

                                            return (
                                                <tr key={ap.id}>
                                                    <td>
                                                        <div className="agent-info">
                                                            <div className="agent-name">{ap.name}</div>
                                                            <div className="agent-detail">ID: {ap.licenseNumber}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="activity-status-cell">
                                                            <span className={`activity-dot ${isActive ? 'active' : 'inactive'}`}></span>
                                                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>
                                                            ₱ {ap.totalANP.toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600', color: '#28a745' }}>
                                                            ₱ {ap.monthlyANP.toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{ap.totalCases}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{ap.monthlyCases}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            {performanceStatus === 'PERFORMING' ? '🎯 Performing' :
                                                                performanceStatus === 'AVERAGE' ? '📊 Average' :
                                                                    ap.monthlyCases === 0 ? '⚫ No policies issued' : '⚠️ Needs Improvement'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge status-${performanceStatus.toLowerCase().replace(' ', '-')}`}>
                                                            {performanceStatus}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleViewAPDetails(ap)}
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
                            </div>

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
                                <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Policy Statistics</h4>
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
                                            ₱ {selectedAL.monthlyANP.toLocaleString()}
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
                            <div className="modal-table-responsive">
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
                                                            ₱ {estimatedANP.toLocaleString()}
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
                            </div>

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

            {/* Stat Details Modal */}
            {showStatDetailsModal && (
                <div className="mp-modal">
                    <div className="mp-modal-content" style={{ maxWidth: '800px' }}>
                        <div className="mp-modal-header">
                            <div>
                                <h2>Statistic Details</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    Detailed information for the selected statistic
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
        </MPLayout>
    );
};

export default ALPerformance;