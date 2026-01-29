// - Restored Details Modal + Fixed Header
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

const ClientsPage = () => {
    // Alias customers to clients for consistency
    const { customers: clients, loadCustomers: loadClients } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [groupedPolicies, setGroupedPolicies] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Toggle to see "Pending" items
    const [showAll, setShowAll] = useState(false);

    // --- Modal States ---
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [selectedYear, setSelectedYear] = useState('All');
    const [availableYears, setAvailableYears] = useState([]);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [policyToConfirm, setPolicyToConfirm] = useState(null);

    // Track processing actions
    const [processingIds, setProcessingIds] = useState(new Set());

    useEffect(() => {
        handleRefresh();
    }, []);

    const handleRefresh = async () => {
        setIsLoading(true);
        await loadClients();
        setIsLoading(false);
    };

    // --- GROUPING LOGIC ---
    useEffect(() => {
        if (clients && clients.length > 0) {
            const policies = [];

            clients.forEach(c => {
                if (c.submissions && c.submissions.length > 0) {
                    c.submissions.forEach(s => {
                        const status = s.status ? s.status.toLowerCase() : '';
                        if (status === 'issued' || showAll) {
                            policies.push({
                                ...s,
                                id: s.sub_id || s.id,
                                clientName: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'Unknown Client',
                                clientEmail: c.email || 'No Email',
                                client_id: c.id
                            });
                        }
                    });
                }
            });

            // Deduplicate
            const uniquePolicies = [];
            const seenIds = new Set();
            policies.forEach(p => {
                if (p.id && !seenIds.has(p.id)) {
                    seenIds.add(p.id);
                    uniquePolicies.push(p);
                } else if (!p.id) {
                    uniquePolicies.push({ ...p, _tempId: Math.random() });
                }
            });

            const filtered = uniquePolicies.filter(p =>
                p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.clientEmail && p.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            // Sort Years
            const years = [...new Set(filtered.map(p => {
                if (!p.next_payment_date) return 'Unscheduled';
                const d = new Date(p.next_payment_date);
                return isNaN(d.getTime()) ? 'Invalid' : d.getFullYear().toString();
            }))].sort().reverse();
            setAvailableYears(years);

            const groups = {};
            filtered.forEach(p => {
                let year = 'Unscheduled';
                if (p.next_payment_date) {
                    const d = new Date(p.next_payment_date);
                    if (!isNaN(d.getTime())) year = d.getFullYear().toString();
                }

                if (selectedYear !== 'All' && year !== selectedYear) return;

                if (!p.next_payment_date) {
                    const key = 'Unscheduled / New';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                    return;
                }

                const d = new Date(p.next_payment_date);
                if (isNaN(d.getTime())) {
                    const key = 'Invalid Date Error';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                    return;
                }

                // Key format: "Year-MonthIdx|Month Name Year"
                const monthIdx = d.getMonth().toString().padStart(2, '0');
                const fullYear = d.getFullYear();
                const monthName = d.toLocaleString('default', { month: 'long' });
                const key = `${fullYear}-${monthIdx}|${monthName} ${fullYear}`;

                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
            });

            setGroupedPolicies(groups);
        } else {
            setGroupedPolicies({});
        }
    }, [clients, searchQuery, showAll, selectedYear]);

    const isDateOverdue = (dateString) => {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(dateString);
        return checkDate < today;
    };

    const markPaid = async (id, e) => {
        e.stopPropagation();
        setPolicyToConfirm(id);
        setShowConfirmModal(true);
    };

    const confirmPayment = async () => {
        if (!policyToConfirm) return;
        setProcessingIds(prev => new Set(prev).add(policyToConfirm));

        try {
            const res = await api.markPolicyPaid(policyToConfirm);
            setShowConfirmModal(false);
            if (res.success) {
                alert(`Payment Recorded! New Due Date: ${res.nextDate}`);
                await handleRefresh();
            } else {
                alert('Error: ' + (res.message || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            setShowConfirmModal(false);
            alert('Error: ' + error.message);
        } finally {
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(policyToConfirm);
                return newSet;
            });
            setPolicyToConfirm(null);
        }
    };

    const cancelPayment = () => {
        setShowConfirmModal(false);
        setPolicyToConfirm(null);
    };

    const handleViewDetails = (policy, e) => {
        e.stopPropagation();
        setSelectedPolicy(policy);
        setShowDetailsModal(true);
    };

    // --- STYLES ---
    const styles = {
        card: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: '25px',
            margin: '20px',
            border: '1px solid #e0e0e0'
        },
        headerRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            flexWrap: 'nowrap',
            gap: '20px'
        },
        title: {
            fontSize: '22px',
            fontWeight: '700',
            color: '#2c3e50',
            margin: 0,
            whiteSpace: 'nowrap'
        },
        controls: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
        },
        refreshBtn: {
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            transition: 'background 0.2s'
        },
        searchContainer: {
            display: 'flex', gap: '10px', marginBottom: '20px'
        },
        searchInput: {
            flex: 1, padding: '12px 15px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'
        },
        searchBtn: {
            backgroundColor: '#003266', color: 'white', border: 'none', padding: '10px 25px',
            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
        },
        monthContainer: {
            marginBottom: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
        },
        monthHeader: {
            backgroundColor: '#004481',
            color: 'white',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        monthTitle: {
            fontSize: '16px', fontWeight: 'bold'
        },
        badge: {
            fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', marginLeft: '10px',
            display: 'inline-block'
        },
        badgeTotal: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' },
        badgeDue: { backgroundColor: '#ecd266', color: '#333' },
        
        table: {
            width: '100%', borderCollapse: 'collapse', fontSize: '14px'
        },
        th: {
            textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid #eee', color: '#666',
            backgroundColor: '#f8f9fa', fontWeight: '600'
        },
        td: {
            padding: '14px 20px', borderBottom: '1px solid #eee', verticalAlign: 'middle', color: '#333'
        },
        viewBtn: {
            backgroundColor: '#007bff', color: 'white', border: 'none', padding: '6px 14px',
            borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
        },
        markPaidBtn: {
            backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 14px',
            borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
            width: '100px'
        },
        statusUpcoming: {
            color: '#f39c12', fontWeight: 'bold', fontSize: '13px'
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.headerRow}>
                <h2 style={styles.title}>Client Payment Board</h2>
                
                <div style={styles.controls}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '500' }}>
                        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                        Show All (Inc. Pending)
                    </label>

                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        style={styles.refreshBtn}
                        onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#5a6268')}
                        onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#6c757d')}
                    >
                        {isLoading ? 'REFRESHING...' : 'REFRESH DATA'}
                    </button>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid #ced4da',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        <option value="All">All Years</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div style={styles.searchContainer}>
                <input
                    type="text"
                    style={styles.searchInput}
                    placeholder="Search Client by Name or Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button style={styles.searchBtn}>SEARCH</button>
            </div>

            {isLoading ? <div style={{textAlign:'center', padding: '40px', color: '#666'}}>Loading Payment Data...</div> : Object.keys(groupedPolicies).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#888', background: '#f9f9f9', borderRadius: '8px' }}>
                    <h3>No scheduled payments found.</h3>
                    <p>Try changing the year filter or ensure policies have an "Issued" status.</p>
                </div>
            ) : (
                Object.entries(groupedPolicies)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([sortKey, items]) => {
                        const monthStr = sortKey.includes('|') ? sortKey.split('|')[1] : sortKey;
                        const overdueCount = items.filter(i => isDateOverdue(i.next_payment_date)).length;

                        return (
                            <div key={sortKey} style={styles.monthContainer}>
                                <div style={styles.monthHeader}>
                                    <div style={styles.monthTitle}>{monthStr}</div>
                                    <div>
                                        <span style={{ ...styles.badge, ...styles.badgeTotal }}>Total: {items.length}</span>
                                        {overdueCount > 0 && (
                                            <span style={{ ...styles.badge, backgroundColor: '#dc3545', color: 'white' }}>Overdue: {overdueCount}</span>
                                        )}
                                        <span style={{ ...styles.badge, ...styles.badgeDue }}>Due: {items.length - overdueCount}</span>
                                    </div>
                                </div>

                                <div style={{overflowX: 'auto'}}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{...styles.th, width: '25%'}}>Client Name</th>
                                                <th style={{...styles.th, width: '15%'}}>Policy Type</th>
                                                <th style={{...styles.th, width: '15%'}}>Due Date</th>
                                                <th style={{...styles.th, width: '15%'}}>Premium</th>
                                                <th style={{...styles.th, width: '10%'}}>Status</th>
                                                <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>View</th>
                                                <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((p, idx) => {
                                                const isOver = isDateOverdue(p.next_payment_date);
                                                const isProcessing = processingIds.has(p.id);
                                                const displayDate = p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString() : 'N/A';

                                                return (
                                                    <tr key={p.id || idx}>
                                                        <td style={styles.td}>
                                                            <div style={{fontWeight: 'bold', color: '#2c3e50'}}>{p.clientName}</div>
                                                            <div style={{ fontSize: '11px', color: '#888' }}>{p.clientEmail}</div>
                                                        </td>
                                                        <td style={styles.td}>{p.policy_type}</td>
                                                        <td style={styles.td}>{displayDate}</td>
                                                        <td style={styles.td}>PHP {parseFloat(p.premium_paid).toLocaleString()}</td>
                                                        <td style={styles.td}>
                                                            {isOver ? 
                                                                <span style={{color:'#dc3545', fontWeight:'bold', background: '#ffebeb', padding: '2px 8px', borderRadius: '4px', fontSize: '12px'}}>OVERDUE</span> : 
                                                                <span style={{color:'#f39c12', fontWeight:'bold'}}>Upcoming</span>
                                                            }
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            <button onClick={(e) => handleViewDetails(p, e)} style={styles.viewBtn}>VIEW</button>
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            <button
                                                                onClick={(e) => markPaid(p.id, e)}
                                                                disabled={isProcessing}
                                                                style={{
                                                                    ...styles.markPaidBtn,
                                                                    opacity: isProcessing ? 0.6 : 1,
                                                                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                {isProcessing ? 'SAVING...' : 'MARK PAID'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
            )}

            {/* --- RESTORED: DETAILED VIEW MODAL --- */}
            {showDetailsModal && selectedPolicy && ReactDOM.createPortal(
                <div onClick={() => setShowDetailsModal(false)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000
                }}>
                    <div className="modal-content" style={{
                        maxWidth: '600px', width: '100%', margin: '20px',
                        maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'white',
                        borderRadius: '12px', padding: '0', position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>
                        
                        <div style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h2 style={{margin: 0, fontSize: '20px', color: '#003266'}}>Policy Details</h2>
                            <span onClick={() => setShowDetailsModal(false)} style={{cursor: 'pointer', fontSize: '24px', color: '#999'}}>&times;</span>
                        </div>

                        <div style={{padding: '20px'}}>
                            {/* 1. KEY INFO GRID */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px',
                                backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6'
                            }}>
                                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '5px' }}>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Client Name</small>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{selectedPolicy.clientName}</div>
                                    <small style={{ color: '#888' }}>{selectedPolicy.clientEmail}</small>
                                </div>

                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Serial Number</small>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#003781' }}>{selectedPolicy.serial_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Current Status</small>
                                    <div>
                                        <span className={`status-badge status-${selectedPolicy.status ? selectedPolicy.status.toLowerCase() : 'pending'}`}
                                            style={{padding: '4px 10px', borderRadius: '12px', background: '#e9ecef', fontSize: '12px', fontWeight: 'bold'}}>
                                            {selectedPolicy.status || 'Pending'}
                                        </span>
                                    </div>
                                </div>

                                <div><small style={{ color: '#666', fontWeight: 600 }}>Policy Type</small><div style={{ fontWeight: 500 }}>{selectedPolicy.policy_type}</div></div>
                                <div><small style={{ color: '#666', fontWeight: 600 }}>Premium</small><div style={{ fontWeight: 500 }}>PHP {parseFloat(selectedPolicy.premium_paid).toLocaleString()}</div></div>
                                <div><small style={{ color: '#666', fontWeight: 600 }}>Mode</small><div>{selectedPolicy.mode_of_payment}</div></div>
                                <div><small style={{ color: '#666', fontWeight: 600 }}>Agency</small><div>{selectedPolicy.agency || '-'}</div></div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '20px' }}>
                                <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '6px' }}>
                                    <small style={{ color: '#0055b8', fontWeight: 700 }}>Submitted On</small>
                                    <div style={{ fontSize: '13px' }}>{selectedPolicy.created_at ? new Date(selectedPolicy.created_at).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div style={{ padding: '10px', background: '#d4edda', borderRadius: '6px' }}>
                                    <small style={{ color: '#155724', fontWeight: 700 }}>Issued On</small>
                                    <div style={{ fontSize: '13px' }}>{selectedPolicy.status === 'Issued' ? (selectedPolicy.date_issued ? new Date(selectedPolicy.date_issued).toLocaleDateString() : 'N/A') : '-'}</div>
                                </div>
                                <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '6px' }}>
                                    <small style={{ color: '#856404', fontWeight: 700 }}>Next Due</small>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{selectedPolicy.next_payment_date ? new Date(selectedPolicy.next_payment_date).toLocaleDateString() : 'N/A'}</div>
                                </div>
                            </div>

                            {/* 2. ATTACHMENTS LIST */}
                            <h3 style={{ marginTop: '25px', marginBottom: '10px', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Attached Files</h3>
                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {selectedPolicy.attachments && selectedPolicy.attachments.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {selectedPolicy.attachments.map((file, idx) => (
                                            <li key={idx} style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 500, fontSize: '14px' }}>
                                                    📄 {file.fileName || 'Document'}
                                                </a>
                                                <span style={{ fontSize: '11px', color: '#999' }}>{(file.fileSize / 1024).toFixed(0)} KB</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>No documents attached.</p>
                                )}
                            </div>

                            {/* 3. PAYMENT HISTORY */}
                            <h3 style={{ marginTop: '25px', marginBottom: '10px', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Payment History</h3>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                                        <tr>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Paid On</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Period Covered</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPolicy.payment_history && selectedPolicy.payment_history.length > 0 ? (
                                            selectedPolicy.payment_history
                                                .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
                                                .map((hist, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '8px' }}>{new Date(hist.payment_date).toLocaleDateString()}</td>
                                                        <td style={{ padding: '8px' }}>{hist.period_covered ? new Date(hist.period_covered).toLocaleDateString() : '-'}</td>
                                                        <td style={{ padding: '8px', fontWeight: 600, color: '#28a745' }}>PHP {parseFloat(hist.amount).toLocaleString()}</td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No payment history found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                {selectedPolicy.status !== 'Issued' && (
                                    <button onClick={(e) => { setShowDetailsModal(false); markPaid(selectedPolicy.id, e); }}
                                        style={{ padding: '8px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
                                        Mark as Paid
                                    </button>
                                )}
                                <button onClick={() => setShowDetailsModal(false)} style={{ padding: '8px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* CONFIRM MODAL */}
            {showConfirmModal && ReactDOM.createPortal(
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10001 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{marginTop: 0, color: '#333'}}>Confirm Payment</h3>
                        <p style={{color: '#666', marginBottom: '25px'}}>Are you sure you want to mark this policy as paid? This will advance the due date.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={cancelPayment} style={{ padding: '10px 24px', backgroundColor: '#f1f1f1', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={confirmPayment} style={{ padding: '10px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};

export default ClientsPage;