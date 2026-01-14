import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const PerformanceDashboardPage = () => {
    const { userRole, currentUser, performanceData, loadPerformanceData } = useApp();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'totalANP', direction: 'desc' });

    useEffect(() => {
        // Redirect non-AL users to main dashboard
        if (userRole !== 'AL') {
            navigate('/');
            return;
        }

        // Load performance data for this AL's team
        if (currentUser && currentUser.id) {
            loadPerformanceData(currentUser.id);
        }
    }, [userRole, currentUser, navigate, loadPerformanceData]);

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

    const { performanceByAP, teamStats } = performanceData;

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

    // Extra Stats Logic
    const activeAgents = performanceByAP.filter(ap => ap.issued > 0).length;
    const avgCaseSize = teamStats.totalIssued > 0
        ? teamStats.totalTeamANP / teamStats.totalIssued
        : 0;

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div className="card" style={{ marginBottom: '24px', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <div className="card-header" style={{ background: 'transparent', border: 'none', padding: '0 0 10px 0' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', fontWeight: '800' }}>Team Performance Overview</h2>
                    <p style={{ color: '#7f8c8d', margin: 0 }}>Real-time metrics and agent rankings</p>
                </div>

                {/* STATS ROW */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px'
                }}>
                    <div className="stat-card" style={{ borderLeft: '4px solid #f39c12', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div className="stat-header"><div className="stat-label">Total Team ANP</div></div>
                        <div className="stat-value" style={{ color: '#2c3e50' }}>PHP {teamStats.totalTeamANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="stat-subtext">All-time team production</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #28a745', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div className="stat-header"><div className="stat-label">Monthly Team ANP</div></div>
                        <div className="stat-value" style={{ color: '#28a745' }}>PHP {teamStats.totalMonthlyANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="stat-subtext">Current month intake</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #0055b8', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div className="stat-header"><div className="stat-label">Avg Case Size</div></div>
                        <div className="stat-value" style={{ color: '#0055b8' }}>PHP {avgCaseSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="stat-subtext">Per issued policy</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #9b59b6', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div className="stat-header"><div className="stat-label">Active Agents</div></div>
                        <div className="stat-value" style={{ color: '#9b59b6' }}>{activeAgents} <span style={{ fontSize: '14px', color: '#777' }}>/ {performanceByAP.length}</span></div>
                        <div className="stat-subtext">{((activeAgents / performanceByAP.length) * 100).toFixed(0)}% Activation Rate</div>
                    </div>
                </div>
            </div>

            {/* CHARTS ROW using standard 'charts-grid' for consistent sizing */}
            <div className="charts-grid" style={{ marginTop: '24px', marginBottom: '24px' }}>
                <div className="chart-container">
                    <div className="chart-title">Production Overview (ANP)</div>
                    <div className="chart-wrapper">
                        <Bar
                            data={{
                                ...anpChartData,
                                datasets: [{
                                    ...anpChartData.datasets[0],
                                    backgroundColor: (context) => {
                                        const ctx = context.chart.ctx;
                                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                                        gradient.addColorStop(0, '#0055b8');
                                        gradient.addColorStop(1, '#00a8e8');
                                        return gradient;
                                    },
                                    borderRadius: 6,
                                    barThickness: 'flex',
                                    maxBarThickness: 60
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </div>
                </div>

                <div className="chart-container">
                    <div className="chart-title">Team Efficiency (Issued)</div>
                    <div className="chart-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            </div>

            {/* AP Performance Table - MODERN UI */}
            <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-header" style={{
                    background: '#fff',
                    borderBottom: '1px solid #eee',
                    padding: '20px 25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>Agency Partner Performance</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#95a5a6' }}>Detailed breakdown of individual agent metrics</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#bdc3c7' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search Agents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '10px 16px 10px 36px',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0',
                                fontSize: '14px',
                                width: '280px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                backgroundColor: '#f9f9f9'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3498db'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        />
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
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
    );
};

export default PerformanceDashboardPage;
