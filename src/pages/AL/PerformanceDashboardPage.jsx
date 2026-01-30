import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const PerformanceDashboardPage = () => {
    const { userRole, currentUser, performanceData, loadPerformanceData, loading } = useApp();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'totalANP', direction: 'desc' });

    // Modal state
    const [showStatModal, setShowStatModal] = useState(false);
    const [selectedStat, setSelectedStat] = useState(null);

    useEffect(() => {
        if (loading) return; // Wait for auth to load

        // Redirect non-AL users to main dashboard
        if (userRole !== 'AL') {
            navigate('/');
            return;
        }

        // Load performance data for this AL's team
        if (currentUser && currentUser.id) {
            loadPerformanceData(currentUser.id);
        }
    }, [userRole, currentUser, navigate, loadPerformanceData, loading]);

    if (loading) {
        return (
            <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div className="loading-spinner"></div>
                    <h3>Verifying Access...</h3>
                </div>
            </div>
        );
    }

    if (userRole !== 'AL') {
        return null;
    }

    if (!performanceData) {
        return (
            <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
                    <h3>Loading Performance Data...</h3>
                </div>
            </div>
        );
    }

    const { performanceByAP = [], teamStats = {
        totalIssued: 0,
        totalPending: 0,
        totalDeclined: 0,
        totalTeamANP: 0,
        totalMonthlyANP: 0,
        mostUsedPolicy: 'N/A',
        mostUsedPolicyCount: 0,
        policyDistribution: {}
    } } = performanceData || {};

    // Sorting logic
    const sortedData = [...performanceByAP].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    // Search filter
    const filteredData = sortedData.filter(ap =>
        ap.apName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle sort
    const handleSort = (key) => {
        setSortConfig({
            key,
            direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc'
        });
    };

    // Top performers (top 3 by total ANP)
    const topPerformers = [...performanceByAP]
        .sort((a, b) => b.totalANP - a.totalANP)
        .slice(0, 3);

    // Chart data - ANP by AP
    const anpChartData = {
        labels: performanceByAP.map(ap => ap.apName),
        datasets: [{
            label: 'Total ANP',
            data: performanceByAP.map(ap => ap.totalANP),
            backgroundColor: '#0055b8',
            borderRadius: 6
        }]
    };

    // Chart data - Team Status Distribution
    const statusChartData = {
        labels: ['Issued', 'Pending', 'Declined'],
        datasets: [{
            data: [teamStats.totalIssued, teamStats.totalPending, teamStats.totalDeclined],
            backgroundColor: ['#28a745', '#ffc107', '#dc3545']
        }]
    };

    // Chart data - Policy Distribution
    const policyChartData = {
        labels: Object.keys(teamStats.policyDistribution || {}),
        datasets: [{
            label: 'Policies Issued',
            data: Object.values(teamStats.policyDistribution || {}),
            backgroundColor: ['#e67e22', '#3498db', '#9b59b6', '#1abc9c', '#e74c3c', '#f39c12', '#2ecc71'],
            borderRadius: 6
        }]
    };

    // Extra Stats Logic
    const activeAgents = performanceByAP.filter(ap => ap.issued > 0).length;
    const avgCaseSize = teamStats.totalIssued > 0
        ? teamStats.totalTeamANP / teamStats.totalIssued
        : 0;

    // Handle stat card click
    const handleStatCardClick = (statType) => {
        setSelectedStat(statType);
        setShowStatModal(true);
    };

    // Render stat modal content
    const renderStatModal = () => {
        if (!selectedStat) return null;

        const statInfo = {
            totalTeamANP: {
                title: 'Total Team ANP',
                value: `PHP ${teamStats.totalTeamANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                description: 'Cumulative Annual New Premium from all team members',
                details: [
                    { label: 'Total Issued Policies', value: teamStats.totalIssued },
                    { label: 'Average Case Size', value: `PHP ${avgCaseSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                    { label: 'Active Agents', value: `${activeAgents} / ${performanceByAP.length}` }
                ]
            },
            monthlyTeamANP: {
                title: 'Monthly Team ANP',
                value: `PHP ${teamStats.totalMonthlyANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                description: 'Current month Annual New Premium intake',
                details: [
                    { label: 'Monthly Issued', value: teamStats.totalIssued },
                    { label: 'Monthly Pending', value: teamStats.totalPending },
                    { label: 'Monthly Declined', value: teamStats.totalDeclined }
                ]
            },
            avgCaseSize: {
                title: 'Average Case Size',
                value: `PHP ${avgCaseSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                description: 'Average premium per issued policy',
                details: [
                    { label: 'Total Team ANP', value: `PHP ${teamStats.totalTeamANP.toLocaleString()}` },
                    { label: 'Total Issued', value: teamStats.totalIssued },
                    { label: 'Calculation', value: 'Total ANP ÷ Total Issued' }
                ]
            },
            activeAgents: {
                title: 'Active Agents',
                value: `${activeAgents} / ${performanceByAP.length}`,
                description: 'Agents with at least one issued policy',
                details: [
                    { label: 'Activation Rate', value: `${((activeAgents / performanceByAP.length) * 100).toFixed(0)}%` },
                    { label: 'Total Team Members', value: performanceByAP.length },
                    { label: 'Inactive Agents', value: performanceByAP.length - activeAgents }
                ]
            },
            totalCases: {
                title: 'Total Cases',
                value: teamStats.totalIssued,
                description: 'Total policies issued by the team',
                details: [
                    { label: 'Issued', value: teamStats.totalIssued },
                    { label: 'Pending', value: teamStats.totalPending },
                    { label: 'Declined', value: teamStats.totalDeclined }
                ]
            },
            mostUsedPolicy: {
                title: 'Most Used Policy',
                value: teamStats.mostUsedPolicy,
                description: 'Most frequently issued policy type by your team',
                details: Object.entries(teamStats.policyDistribution || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([policy, count]) => ({
                        label: policy,
                        value: `${count} issued (${((count / teamStats.totalIssued) * 100).toFixed(1)}%)`
                    }))
            }
        };

        const info = statInfo[selectedStat];
        if (!info) return null;

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }} onClick={() => setShowStatModal(false)}>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '24px',
                    maxWidth: '900px',
                    width: '95%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #f1f5f9'
                }} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                        padding: '32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{info.title}</h3>
                            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '15px' }}>{info.description}</p>
                        </div>
                        <button
                            onClick={() => setShowStatModal(false)}
                            style={{
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                width: 'auto',
                                minWidth: 'auto',
                                flex: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748b',
                                transition: 'all 0.2s ease',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                                e.currentTarget.style.color = '#0f172a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                e.currentTarget.style.color = '#64748b';
                            }}
                        >
                            Close
                        </button>
                    </div>

                    <div style={{ padding: '0 32px 32px 32px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            padding: '32px',
                            borderRadius: '20px',
                            marginBottom: '32px',
                            color: '#fff',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}>
                            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Value</div>
                            <div style={{ fontSize: '42px', fontWeight: '800' }}>{info.value}</div>
                        </div>

                        {selectedStat === 'totalTeamANP' && (
                            <div style={{ marginBottom: '32px' }}>
                                <h4 style={{ marginBottom: '16px', color: '#0f172a', fontSize: '18px', fontWeight: '700' }}>Production Overview</h4>
                                <div style={{ height: '300px', width: '100%' }}>
                                    <Bar
                                        data={{
                                            ...anpChartData,
                                            datasets: [{
                                                ...anpChartData.datasets[0],
                                                backgroundColor: '#3b82f6',
                                                borderRadius: 8,
                                                barThickness: 'flex',
                                                maxBarThickness: 40
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: {
                                                    grid: { color: '#f1f5f9' },
                                                    border: { display: false }
                                                },
                                                x: {
                                                    grid: { display: false },
                                                    border: { display: false }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <h4 style={{ marginBottom: '16px', color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>Details</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {info.details.map((detail, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px'
                                }}>
                                    <span style={{ color: '#64748b', fontSize: '14px' }}>{detail.label}</span>
                                    <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>{detail.value}</span>
                                </div>
                            ))}
                        </div>

                        {selectedStat === 'totalCases' && (
                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ marginBottom: '16px', color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>Status Distribution</h4>
                                <div style={{ height: '200px' }}>
                                    <Doughnut
                                        data={statusChartData}
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
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Main Container */}
            <div className="container" style={{
                padding: '32px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                backgroundColor: '#fff'
            }}>
                {/* Page Header */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#2c3e50',
                        marginBottom: '10px'
                    }}>
                        Team Performance Overview
                    </h2>
                    <p style={{
                        color: '#7f8c8d',
                        fontSize: '14px',
                        margin: 0
                    }}>
                        Real-time metrics and agent rankings
                    </p>
                </div>

                {/* STATS ROW */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px'
                }}>
                    <div
                        className="stat-card"
                        style={{
                            borderLeft: '4px solid #f39c12',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onClick={() => handleStatCardClick('totalTeamANP')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                        }}
                    >
                        <div className="stat-header"><div className="stat-label">Total Team ANP</div></div>
                        <div className="stat-value" style={{ color: '#2c3e50' }}>PHP {teamStats.totalTeamANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="stat-subtext">All-time team production</div>
                    </div>

                    <div
                        className="stat-card"
                        style={{
                            borderLeft: '4px solid #28a745',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onClick={() => handleStatCardClick('monthlyTeamANP')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                        }}
                    >
                        <div className="stat-header"><div className="stat-label">Monthly Team ANP</div></div>
                        <div className="stat-value" style={{ color: '#28a745' }}>PHP {teamStats.totalMonthlyANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="stat-subtext">Current month intake</div>
                    </div>

                    <div
                        className="stat-card"
                        style={{
                            borderLeft: '4px solid #0055b8',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onClick={() => handleStatCardClick('avgCaseSize')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                        }}
                    >
                        <div className="stat-header"><div className="stat-label">Avg Case Size</div></div>
                        <div className="stat-value" style={{ color: '#0055b8' }}>PHP {avgCaseSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="stat-subtext">Per issued policy</div>
                    </div>

                    <div
                        className="stat-card"
                        style={{
                            borderLeft: '4px solid #9b59b6',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onClick={() => handleStatCardClick('activeAgents')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                        }}
                    >
                        <div className="stat-header"><div className="stat-label">Active Agents</div></div>
                        <div className="stat-value" style={{ color: '#9b59b6' }}>{activeAgents} <span style={{ fontSize: '14px', color: '#777' }}>/ {performanceByAP.length}</span></div>
                        <div className="stat-subtext">{((activeAgents / performanceByAP.length) * 100).toFixed(0)}% Activation Rate</div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="charts-grid" style={{
                    marginTop: '24px',
                    marginBottom: '24px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px'
                }}>
                    <div className="chart-container" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
                        <div className="chart-title" style={{ paddingLeft: '0', fontSize: '16px', marginBottom: '16px' }}>Team Efficiency (Issued)</div>
                        <div className="chart-wrapper" style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            height: '350px'
                        }}>
                            <Doughnut
                                data={statusChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom' } },
                                    cutout: '65%'
                                }}
                            />
                            <div style={{ position: 'absolute', pointerEvents: 'none', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#2c3e50' }}>{teamStats.totalIssued}</div>
                                <div style={{ fontSize: '11px', color: '#7f8c8d' }}>Issued</div>
                            </div>
                        </div>
                    </div>

                    <div className="chart-container" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
                        <div className="chart-title" style={{ paddingLeft: '0', fontSize: '16px', marginBottom: '16px' }}>Policy Distribution</div>
                        <div className="chart-wrapper" style={{
                            height: '350px',
                            background: '#fff',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                            <Bar
                                data={policyChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        title: { display: false }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: { stepSize: 1 },
                                            grid: { color: '#f1f5f9' },
                                            border: { display: false }
                                        },
                                        x: {
                                            grid: { display: false },
                                            border: { display: false }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* AP Performance Table */}
                <div style={{
                    marginTop: '32px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #e9ecef'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                        borderBottom: '2px solid #e9ecef',
                        padding: '24px 28px'
                    }}>
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#0f172a',
                            marginBottom: '6px',
                            letterSpacing: '-0.3px'
                        }}>
                            Agency Partner Performance
                        </h3>
                        <p style={{
                            fontSize: '13px',
                            color: '#64748b',
                            margin: '0 0 16px 0',
                            fontWeight: '500'
                        }}>
                            Individual agent metrics and rankings
                        </p>

                        {/* Search Bar */}
                        <div style={{ position: 'relative', maxWidth: '320px' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search AP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '10px 16px 10px 36px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    width: '100%',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#f8fafc'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#0055b8';
                                    e.target.style.backgroundColor = '#fff';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.backgroundColor = '#f8fafc';
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #efefef' }}>
                                        {[
                                            { key: 'apName', label: 'Agent Name' },
                                            { key: 'totalANP', label: 'Total ANP' },
                                            { key: 'monthlyANP', label: 'Monthly ANP' },
                                            { key: 'totalSubmissions', label: 'Apps' },
                                            { key: 'issued', label: 'Issued' },
                                            { key: 'pending', label: 'Pending' },
                                            { key: 'declined', label: 'Declined' },
                                            { key: 'conversionRate', label: 'Conv. Rate' }
                                        ].map(col => (
                                            <th
                                                key={col.key}
                                                onClick={() => handleSort(col.key)}
                                                style={{
                                                    padding: '16px 20px',
                                                    fontSize: '11px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    fontWeight: '600',
                                                    color: '#7f8c8d',
                                                    cursor: 'pointer',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {col.label}
                                                    {sortConfig.key === col.key && (
                                                        <span style={{ color: '#3498db' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.length > 0 ? (
                                        filteredData.map((ap, idx) => (
                                            <tr
                                                key={ap.apName}
                                                style={{
                                                    borderBottom: '1px solid #f1f1f1',
                                                    backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f8ff'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#fafafa'}
                                            >
                                                <td style={{ padding: '16px 20px', fontWeight: '600', color: '#2c3e50' }}>{ap.apName}</td>
                                                <td style={{ padding: '16px 20px', color: '#2c3e50', fontWeight: '500' }}>₱ {ap.totalANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '16px 20px', color: '#7f8c8d' }}>₱ {ap.monthlyANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '16px 20px' }}>{ap.totalSubmissions}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '12px', fontWeight: '600' }}>
                                                        {ap.issued}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#fff3e0', color: '#ef6c00', fontSize: '12px', fontWeight: '600' }}>
                                                        {ap.pending}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    {ap.declined > 0 ? (
                                                        <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#ffebee', color: '#c62828', fontSize: '12px', fontWeight: '600' }}>
                                                            {ap.declined}
                                                        </span>
                                                    ) : <span style={{ color: '#ccc' }}>-</span>}
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ flex: 1, height: '6px', backgroundColor: '#eee', borderRadius: '3px', width: '60px' }}>
                                                            <div style={{
                                                                height: '100%',
                                                                borderRadius: '3px',
                                                                width: `${Math.min(ap.conversionRate, 100)}%`,
                                                                backgroundColor: parseFloat(ap.conversionRate) >= 50 ? '#2ecc71' : '#f39c12'
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>
                                                            {ap.conversionRate}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#95a5a6' }}>
                                                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔍</div>
                                                {searchTerm ? 'No matching agency partners found.' : 'No performance data available.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Main Container */}

            {/* Stat Details Modal */}
            {showStatModal && renderStatModal()}
        </div>
    );
};

export default PerformanceDashboardPage;
