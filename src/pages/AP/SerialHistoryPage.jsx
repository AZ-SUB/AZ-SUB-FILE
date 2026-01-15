import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const SerialHistoryPage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadMonitoringData();
    }, []);

    // Filter Logic
    const filteredItems = monitoringData.filter(item => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const name = (item.client_name || item.client_first_name || '').toLowerCase();
            const serial = (item.serial_number || '').toLowerCase();
            return name.includes(term) || serial.includes(term);
        }
        return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Get status badge styling
    const getStatusBadge = (item) => {
        if (item.form_type) {
            return { text: 'Submitted', color: '#28a745', bg: '#d4edda' };
        }
        return { text: 'Pending Docs', color: '#856404', bg: '#fff3cd' };
    };

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0' }}>Serial Request History</h2>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                            Track all serial number requests and their submission status
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search Serial or Name..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                style={{
                                    padding: '10px 15px 10px 40px',
                                    borderRadius: '8px',
                                    border: '2px solid #e9ecef',
                                    width: '280px',
                                    fontSize: '14px',
                                    transition: 'all 0.3s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#0055b8'}
                                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                            />
                        </div>
                        <div style={{
                            padding: '10px 15px',
                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#0055b8'
                        }}>
                            Total: {filteredItems.length}
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-body">
                {currentItems.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 20px',
                        color: '#6c757d',
                        background: '#f8f9fa',
                        borderRadius: '12px',
                        border: '2px dashed #dee2e6'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
                        <h3 style={{ color: '#495057', marginBottom: '8px' }}>No serial requests found</h3>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                            {searchTerm ? 'Try adjusting your search terms' : 'Serial requests will appear here once created'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="serial-table" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>Serial Number</th>
                                        <th style={{ width: '25%' }}>Client Name</th>
                                        <th style={{ width: '25%' }}>Policy Type</th>
                                        <th style={{ width: '15%' }}>Date Generated</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(item => {
                                        const status = getStatusBadge(item);
                                        return (
                                            <tr key={item.id} style={{ transition: 'all 0.2s' }}>
                                                <td>
                                                    <div style={{
                                                        fontFamily: 'monospace',
                                                        fontWeight: 700,
                                                        color: '#003781',
                                                        fontSize: '15px',
                                                        background: '#e3f2fd',
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        display: 'inline-block'
                                                    }}>
                                                        {item.serial_number}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: '#2c3e50', marginBottom: '2px' }}>
                                                        {item.client_name || `${item.client_first_name} ${item.client_last_name}`}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ color: '#495057' }}>
                                                        {item.policy_type}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                                                        {new Date(item.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 14px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        color: status.color,
                                                        background: status.bg,
                                                        border: `1px solid ${status.color}30`,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {item.form_type ? '✓' : '⏱'} {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* --- ENHANCED PAGINATION CONTROLS --- */}
                        {totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '30px',
                                padding: '20px',
                                background: '#f8f9fa',
                                borderRadius: '10px'
                            }}>
                                <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: 500 }}>
                                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} requests
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: currentPage === 1 ? '#e9ecef' : '#0055b8',
                                            color: currentPage === 1 ? '#adb5bd' : 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            transition: 'all 0.3s',
                                            boxShadow: currentPage === 1 ? 'none' : '0 2px 4px rgba(0,85,184,0.2)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (currentPage !== 1) {
                                                e.target.style.backgroundColor = '#004494';
                                                e.target.style.transform = 'translateY(-2px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (currentPage !== 1) {
                                                e.target.style.backgroundColor = '#0055b8';
                                                e.target.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        ← Previous
                                    </button>

                                    <div style={{
                                        padding: '10px 20px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: '#0055b8',
                                        border: '2px solid #0055b8',
                                        minWidth: '120px',
                                        textAlign: 'center'
                                    }}>
                                        Page {currentPage} of {totalPages}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: currentPage === totalPages ? '#e9ecef' : '#0055b8',
                                            color: currentPage === totalPages ? '#adb5bd' : 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            transition: 'all 0.3s',
                                            boxShadow: currentPage === totalPages ? 'none' : '0 2px 4px rgba(0,85,184,0.2)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (currentPage !== totalPages) {
                                                e.target.style.backgroundColor = '#004494';
                                                e.target.style.transform = 'translateY(-2px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (currentPage !== totalPages) {
                                                e.target.style.backgroundColor = '#0055b8';
                                                e.target.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SerialHistoryPage;