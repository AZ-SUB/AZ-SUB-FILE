// APPerformance.jsx - FINAL UPDATED VERSION
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMPData } from './MPData';
import MPLayout from './MPLayout';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import './MP_Styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const APPerformance = () => {
    const { apPerformance } = useMPData();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [activityFilter, setActivityFilter] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [appliedFilters, setAppliedFilters] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        status: 'All',
        activity: 'All',
        search: ''
    });
    
    // State for modals
    const [showAPDetailsModal, setShowAPDetailsModal] = useState(false);
    const [showStatDetailsModal, setShowStatDetailsModal] = useState(false);
    const [selectedStat, setSelectedStat] = useState(null);
    const [selectedAP, setSelectedAP] = useState(null);
    
    // Month names
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    // Check for AP details from navigation
    useEffect(() => {
        if (location.state?.selectedAP) {
            setSelectedAP(location.state.selectedAP);
            setSelectedMonth(location.state.selectedMonth || new Date().getMonth());
            setSelectedYear(location.state.selectedYear || currentYear);
            setShowAPDetailsModal(true);
        }
    }, [location.state]);

    // Apply filters
    const applyFilters = () => {
        setAppliedFilters({
            month: selectedMonth,
            year: selectedYear,
            status: statusFilter,
            activity: activityFilter,
            search: searchTerm
        });
    };

    // Clear filters
    const clearFilters = () => {
        setSelectedMonth(new Date().getMonth());
        setSelectedYear(currentYear);
        setStatusFilter('All');
        setActivityFilter('All');
        setSearchTerm('');
        setAppliedFilters({
            month: new Date().getMonth(),
            year: currentYear,
            status: 'All',
            activity: 'All',
            search: ''
        });
    };

    // Get AP performance status based on policies issued
    const getAPPerformanceStatus = (monthlyCases) => {
        if (monthlyCases >= 7) return 'PERFORMING';
        if (monthlyCases >= 4) return 'AVERAGE';
        return 'NEEDS IMPROVEMENT';
    };

    // Get AP activity status (Active if issued at least 1 policy)
    const getAPActivityStatus = (monthlyCases) => {
        return monthlyCases > 0 ? 'Active' : 'Inactive';
    };

    // Handle View AP Details
    const handleViewAPDetails = (ap) => {
        setSelectedAP(ap);
        setShowAPDetailsModal(true);
    };

    // Handle Stat Card Click
    const handleStatCardClick = (statType) => {
        setSelectedStat(statType);
        setShowStatDetailsModal(true);
    };

    // Filter APs based on applied filters
    const filteredAPs = apPerformance.filter(ap => {
        // Status filter
        if (appliedFilters.status !== 'All') {
            const performanceStatus = getAPPerformanceStatus(ap.monthlyCases);
            if (performanceStatus !== appliedFilters.status) {
                return false;
            }
        }
        
        // Activity filter
        if (appliedFilters.activity !== 'All') {
            const activityStatus = getAPActivityStatus(ap.monthlyCases);
            if (activityStatus !== appliedFilters.activity) {
                return false;
            }
        }
        
        // Search filter
        if (appliedFilters.search && 
            !ap.name.toLowerCase().includes(appliedFilters.search.toLowerCase()) &&
            !ap.alName.toLowerCase().includes(appliedFilters.search.toLowerCase()) &&
            !ap.region.toLowerCase().includes(appliedFilters.search.toLowerCase()) &&
            !ap.city.toLowerCase().includes(appliedFilters.search.toLowerCase())) {
            return false;
        }
        
        return true;
    });

    // Calculate statistics based on filtered data
    const totalAPs = filteredAPs.length;
    const activeAPs = filteredAPs.filter(ap => ap.monthlyCases > 0).length;
    const performingAPs = filteredAPs.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'PERFORMING').length;
    const totalANP = filteredAPs.reduce((sum, ap) => sum + ap.totalANP, 0);
    const monthlyANP = filteredAPs.reduce((sum, ap) => sum + ap.monthlyANP, 0);
    const avgMonthlyCases = totalAPs > 0 ? filteredAPs.reduce((sum, ap) => sum + ap.monthlyCases, 0) / totalAPs : 0;

    // Render stat details based on selected stat
    const renderStatDetails = () => {
        switch(selectedStat) {
            case 'totalAPs':
                return (
                    <div>
                        <h3>Total Agent Partners Details</h3>
                        <p>Showing detailed information about all Agent Partners in the network.</p>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Total APs:</span>
                                <span className="info-value">{totalAPs}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Active APs:</span>
                                <span className="info-value">{activeAPs}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Inactive APs:</span>
                                <span className="info-value">{totalAPs - activeAPs}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Active Rate:</span>
                                <span className="info-value">{(totalAPs > 0 ? (activeAPs/totalAPs*100).toFixed(1) : 0)}%</span>
                            </div>
                        </div>
                    </div>
                );
            case 'activeAPs':
                return (
                    <div>
                        <h3>Active Agent Partners Details</h3>
                        <p>Agent Partners who have issued at least 1 policy this month.</p>
                        <table className="performance-table">
                            <thead>
                                <tr>
                                    <th>AP Name</th>
                                    <th>Agent Leader</th>
                                    <th>Monthly Cases</th>
                                    <th>Monthly ANP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAPs.filter(ap => ap.monthlyCases > 0).slice(0, 10).map(ap => (
                                    <tr key={ap.id}>
                                        <td>{ap.name}</td>
                                        <td>{ap.alName}</td>
                                        <td>{ap.monthlyCases}</td>
                                        <td>PHP {ap.monthlyANP.toLocaleString()}</td>
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
                        <p>Cumulative Annual Premium from all Agent Partners.</p>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Total ANP:</span>
                                <span className="info-value">PHP {totalANP.toLocaleString()}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Average per AP:</span>
                                <span className="info-value">PHP {Math.round(totalANP / totalAPs).toLocaleString()}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Monthly ANP:</span>
                                <span className="info-value">PHP {monthlyANP.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'avgMonthlyCases':
                return (
                    <div>
                        <h3>Average Monthly Cases Details</h3>
                        <p>Average policies issued per Agent Partner.</p>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Average Cases:</span>
                                <span className="info-value">{avgMonthlyCases.toFixed(1)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Total Cases:</span>
                                <span className="info-value">{filteredAPs.reduce((sum, ap) => sum + ap.totalCases, 0)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Monthly Cases:</span>
                                <span className="info-value">{filteredAPs.reduce((sum, ap) => sum + ap.monthlyCases, 0)}</span>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <MPLayout>
            {/* Header with Filters - Matching MPDashboard style */}
            <div className="mp-dashboard-header">
                <h1>Agent Partners Performance</h1>
            </div>

            <div className="mp-filters">
                <div className="filter-group">
                    <label>Search AP/AL</label>
                    <input
                        type="text"
                        placeholder="Search by name, AL, region, or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mp-search-input"
                    />
                </div>
                
                <div className="filter-group">
                    <label>Performance</label>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mp-filter-select"
                    >
                        <option value="All">All Performance</option>
                        <option value="PERFORMING">Performing</option>
                        <option value="AVERAGE">Average</option>
                        <option value="NEEDS IMPROVEMENT">Needs Improvement</option>
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>Activity</label>
                    <select 
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        className="mp-filter-select"
                    >
                        <option value="All">All Activity</option>
                        <option value="Active">Active Only</option>
                        <option value="Inactive">Inactive Only</option>
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
                    onClick={() => handleStatCardClick('totalAPs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Total Agent Partners</div>
                    <div className="stat-value">{totalAPs}</div>
                    <div className="stat-subtext">In network</div>
                </div>

                <div 
                    className="stat-card hover-card" 
                    style={{ borderLeft: '4px solid #28a745', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('activeAPs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Active APs</div>
                    <div className="stat-value">{activeAPs}</div>
                    <div className="stat-subtext">{(totalAPs > 0 ? (activeAPs/totalAPs*100).toFixed(1) : 0)}% Active Rate</div>
                </div>

                <div 
                    className="stat-card hover-card" 
                    style={{ borderLeft: '4px solid #0055b8', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('totalANP')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Total ANP</div>
                    <div className="stat-value">PHP {totalANP.toLocaleString()}</div>
                    <div className="stat-subtext">Cumulative from APs</div>
                </div>

                <div 
                    className="stat-card hover-card" 
                    style={{ borderLeft: '4px solid #f39c12', cursor: 'pointer' }}
                    onClick={() => handleStatCardClick('avgMonthlyCases')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="stat-label">Avg. Monthly Cases</div>
                    <div className="stat-value">{avgMonthlyCases.toFixed(1)}</div>
                    <div className="stat-subtext">Per active AP</div>
                </div>
            </div>

            {/* Charts Section - Similar to MPDashboard */}
            <div className="charts-grid">
                <div className="chart-container">
                    <div className="chart-header">
                        <div className="chart-title">AP Performance Distribution</div>
                        <div className="chart-subtitle">Performance levels across all APs</div>
                    </div>
                    <div className="chart-wrapper">
                        <Doughnut 
                            data={{
                                labels: ['PERFORMING', 'AVERAGE', 'NEEDS IMPROVEMENT', 'INACTIVE'],
                                datasets: [{
                                    data: [
                                        filteredAPs.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'PERFORMING').length,
                                        filteredAPs.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'AVERAGE').length,
                                        filteredAPs.filter(ap => getAPPerformanceStatus(ap.monthlyCases) === 'NEEDS IMPROVEMENT' && ap.monthlyCases > 0).length,
                                        filteredAPs.filter(ap => ap.monthlyCases === 0).length
                                    ],
                                    backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d']
                                }]
                            }}
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' }
                                }
                            }} 
                        />
                    </div>
                </div>

                <div className="chart-container">
                    <div className="chart-header">
                        <div className="chart-title">Monthly ANP Trend - {appliedFilters.year}</div>
                        <div className="chart-subtitle">ANP generated by month</div>
                    </div>
                    <div className="chart-wrapper">
                        <Bar 
                            data={{
                                labels: months.map(m => m.substring(0, 3)),
                                datasets: [{
                                    label: 'ANP (Thousands)',
                                    data: [145, 168, 195, 220, 255, 285, 245, 230, 210, 195, 165, 150],
                                    backgroundColor: '#0055b8',
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
                                            callback: function(value) {
                                                return 'PHP ' + value + 'K';
                                            }
                                        }
                                    }
                                }
                            }} 
                        />
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="card">
                <div className="card-header">
                    <h2>Agent Partners Detailed View - {months[appliedFilters.month]} {appliedFilters.year}</h2>
                    <div className="card-header-stats">
                        <span className="stat-badge">Showing: {filteredAPs.length} of {apPerformance.length}</span>
                        <span className="stat-badge status-active">Active: {activeAPs}</span>
                        <span className="stat-badge status-performing">Performing: {performingAPs}</span>
                    </div>
                </div>
                <div className="card-body">
                    <table className="mp-al-table">
                        <thead>
                            <tr>
                                <th>AP Name</th>
                                <th>Agent Leader</th>
                                <th>Region</th>
                                <th>Activity Status</th>
                                <th>Last Activity</th>
                                <th>Total ANP</th>
                                <th>Monthly ANP</th>
                                <th>Total Cases</th>
                                <th>Monthly Cases</th>
                                <th>Performance Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAPs.map(ap => {
                                const performanceStatus = getAPPerformanceStatus(ap.monthlyCases);
                                const activityStatus = getAPActivityStatus(ap.monthlyCases);
                                
                                return (
                                    <tr key={ap.id}>
                                        <td>
                                            <div className="agent-info">
                                                <div className="agent-name">{ap.name}</div>
                                                <div className="agent-detail">ID: {ap.licenseNumber}</div>
                                                <div className="agent-detail">{ap.city}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{ap.alName}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {ap.region}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{ap.region}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {ap.city}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="activity-status-cell">
                                                <span className={`activity-dot ${activityStatus.toLowerCase()}`}></span>
                                                <span>{activityStatus}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{ap.lastActivity}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {activityStatus === 'Active' ? 'Recently active' : 'No recent activity'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>
                                                PHP {ap.totalANP.toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#28a745' }}>
                                                PHP {ap.monthlyANP.toLocaleString()}
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
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleViewAPDetails(ap)}
                                                    className="view-button"
                                                >
                                                    View Details
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

            {/* AP Details Modal */}
            {showAPDetailsModal && selectedAP && (
                <div className="mp-modal">
                    <div className="mp-modal-content" style={{ maxWidth: '800px' }}>
                        <div className="mp-modal-header">
                            <div>
                                <h2>AP Details - {selectedAP.name}</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    Complete information and performance metrics
                                </p>
                            </div>
                            <button 
                                className="mp-modal-close"
                                onClick={() => setShowAPDetailsModal(false)}
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>AP Name</div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                            {selectedAP.name}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Agent Leader</div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                            {selectedAP.alName}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>License Number</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                                            {selectedAP.licenseNumber}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Contact Number</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                                            {selectedAP.contactNumber}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Performance Metrics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ 
                                    background: '#e3f2fd', 
                                    padding: '16px', 
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#0055b8' }}>Monthly Cases</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                                        {selectedAP.monthlyCases}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        {getAPPerformanceStatus(selectedAP.monthlyCases)} Status
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    background: '#d4edda', 
                                    padding: '16px', 
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#155724' }}>Monthly ANP</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                                        PHP {selectedAP.monthlyANP.toLocaleString()}
                                    </div>
                                    
                                </div>
                                
                                <div style={{ 
                                    background: '#fff3cd', 
                                    padding: '16px', 
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#856404' }}>Total Cases</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                                        {selectedAP.totalCases}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        All-time
                                    </div>
                                </div>
                            </div>
                            
                            <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Additional Information</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Region</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        {selectedAP.region}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>City</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        {selectedAP.city}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Join Date</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        {selectedAP.joinDate}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Last Activity</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        {selectedAP.lastActivity}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Activity Status</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        <span className={`status-badge ${getAPActivityStatus(selectedAP.monthlyCases) === 'Active' ? 'status-active' : 'status-inactive'}`}>
                                            {getAPActivityStatus(selectedAP.monthlyCases)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Performance Status</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        <span className={`status-badge status-${getAPPerformanceStatus(selectedAP.monthlyCases).toLowerCase().replace(' ', '-')}`}>
                                            {getAPPerformanceStatus(selectedAP.monthlyCases)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setShowAPDetailsModal(false)}
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

export default APPerformance;