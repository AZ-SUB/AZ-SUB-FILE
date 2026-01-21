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


    // --- NEW: State for Detailed View Modal ---
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [selectedYear, setSelectedYear] = useState('All');
    const [availableYears, setAvailableYears] = useState([]);


    // --- NEW: State for Payment Confirmation Modal ---
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


                        // Show if 'issued' OR if 'showAll' is checked
                        if (status === 'issued' || showAll) {
                            policies.push({
                                ...s,
                                id: s.sub_id || s.id, // Ensure ID is present
                                clientName: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'Unknown Client',
                                clientEmail: c.email || 'No Email',
                                client_id: c.id
                            });
                        }
                    });
                }
            });


            // Deduplicate policies based on ID
            const uniquePolicies = [];
            const seenIds = new Set();


            policies.forEach(p => {
                if (p.id && !seenIds.has(p.id)) {
                    seenIds.add(p.id);
                    uniquePolicies.push(p);
                } else if (!p.id) {
                    // unexpected, but keep it if no ID
                    uniquePolicies.push({ ...p, _tempId: Math.random() });
                }
            });


            const filtered = uniquePolicies.filter(p =>
                p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.clientEmail && p.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()))
            );


            // Sort Years Descending
            const years = [...new Set(filtered.map(p => {
                if (!p.next_payment_date) return 'Unscheduled';
                const d = new Date(p.next_payment_date);
                return isNaN(d.getTime()) ? 'Invalid' : d.getFullYear().toString();
            }))].sort().reverse();
            setAvailableYears(years);


            // Set default year to current year if available, unless "All" is selected
            if (years.length > 0 && selectedYear === 'All' && !years.includes('All')) {
                // Logic to default to current year could go here, but 'All' is fine
            }


            const groups = {};
            filtered.forEach(p => {
                // Determine Year for filtering
                let year = 'Unscheduled';
                if (p.next_payment_date) {
                    const d = new Date(p.next_payment_date);
                    if (!isNaN(d.getTime())) year = d.getFullYear().toString();
                }


                // Apply Year Filter
                if (selectedYear !== 'All' && year !== selectedYear) return;


                // Group missing dates under "Unscheduled / New"
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


                // Key format: "Year-MonthIdx|Month Name Year" for easy sorting
                // e.g., "2026-00|January 2026"
                const monthIdx = d.getMonth().toString().padStart(2, '0');
                const fullYear = d.getFullYear();
                const monthName = d.toLocaleString('default', { month: 'long' });


                // We use a comparable key for sorting, but we'll display just the readable part
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
        // Show confirmation modal instead of browser confirm
        setPolicyToConfirm(id);
        setShowConfirmModal(true);
    };


    const confirmPayment = async () => {
        if (!policyToConfirm) return;


        setProcessingIds(prev => new Set(prev).add(policyToConfirm));
        // Don't close modal yet, let the button show "Processing..."


        try {
            const res = await api.markPolicyPaid(policyToConfirm);


            // Only close modal on success or after attempt
            setShowConfirmModal(false);


            if (res.success) {
                alert(`Payment Recorded! New Due Date: ${res.nextDate}`);
                await handleRefresh();
            } else {
                // Display the actual error message from backend
                alert('Error recording payment: ' + (res.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error marking policy as paid:', error);
            setShowConfirmModal(false);
            alert('Error recording payment: ' + (error.message || 'Unknown error'));
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


    // --- UPDATED: Open Modal with Full Policy Object ---
    const handleViewDetails = (policy, e) => {
        e.stopPropagation();
        setSelectedPolicy(policy);
        setShowDetailsModal(true);
    };


    // --- Helper: Render Skeleton Loading State ---
    const renderSkeleton = () => {
        // Create 2 mock months with 3 rows each
        return [1, 2].map((groupNum) => (
            <div key={groupNum} className="month-container" style={{ border: '1px solid #eee' }}>
                <div className="month-header" style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    <div className="skeleton-box" style={{ width: '150px', height: '20px', backgroundColor: '#d1d9e6' }}></div>
                    <div className="month-stats">
                        <div className="skeleton-box" style={{ width: '80px', height: '20px', borderRadius: '12px' }}></div>
                        <div className="skeleton-box" style={{ width: '80px', height: '20px', borderRadius: '12px', marginLeft: '10px' }}></div>
                    </div>
                </div>
                <div className="client-list">
                    <table className="monthly-table">
                        <thead>
                            <tr>
                                <th style={{width: '25%'}}>Client Name</th>
                                <th style={{width: '15%'}}>Policy Type</th>
                                <th style={{width: '15%'}}>Due Date</th>
                                <th style={{width: '15%'}}>Premium</th>
                                <th style={{width: '10%'}}>Status</th>
                                <th style={{width: '10%'}}>View</th>
                                <th style={{width: '10%'}}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3].map((rowNum) => (
                                <tr key={rowNum}>
                                    <td>
                                        <div className="skeleton-box" style={{ width: '60%', marginBottom: '6px' }}></div>
                                        <div className="skeleton-box" style={{ width: '40%', height: '10px' }}></div>
                                    </td>
                                    <td><div className="skeleton-box" style={{ width: '70%' }}></div></td>
                                    <td><div className="skeleton-box" style={{ width: '50%' }}></div></td>
                                    <td><div className="skeleton-box" style={{ width: '60%' }}></div></td>
                                    <td><div className="skeleton-badge"></div></td>
                                    <td><div className="skeleton-btn" style={{ width: '40px', height: '24px' }}></div></td>
                                    <td><div className="skeleton-btn" style={{ width: '70px', height: '24px' }}></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ));
    };


    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Client Payment Board</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={showAll}
                                onChange={(e) => setShowAll(e.target.checked)}
                            />
                            Show All (Inc. Pending)
                        </label>


                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isLoading ? 'wait' : 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {isLoading ? 'Refreshing...' : ' Refresh Data'}
                        </button>


                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ced4da',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#495057'
                            }}
                        >
                            <option value="All">All Years</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <div className="search-bar-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search Client by Name or Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="search-btn">Search</button>
                </div>


                {isLoading ? (
                    renderSkeleton()
                ) : Object.keys(groupedPolicies).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No policies found.
                    </div>
                ) : (
                    Object.entries(groupedPolicies)
                        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by the "Year-MonthIdx" key prefix
                        .map(([sortKey, items]) => {
                            // Extract readable title from key "2026-00|January 2026"
                            const monthStr = sortKey.includes('|') ? sortKey.split('|')[1] : sortKey;


                            const overdueCount = items.filter(i => isDateOverdue(i.next_payment_date)).length;
                            const pendingCount = items.length - overdueCount;


                            return (
                                <div key={monthStr} className="month-container">
                                    <div className="month-header">
                                        <div className="month-title">{monthStr}</div>
                                        <div className="month-stats">
                                            <span className="stat-badge">Total: {items.length}</span>
                                            <span className="stat-badge" style={{ color: '#ffc107' }}>Due: {pendingCount}</span>
                                            {overdueCount > 0 && (
                                                <span className="stat-badge" style={{ color: '#ff6b6b' }}>Overdue: {overdueCount}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="client-list">
                                        <table className="monthly-table">
                                            <thead>
                                                <tr>
                                                    <th>Client Name</th>
                                                    <th>Policy Type</th>
                                                    <th>Due Date</th>
                                                    <th>Premium</th>
                                                    <th>Status</th>
                                                    <th>View</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((p, idx) => {
                                                    const isOver = isDateOverdue(p.next_payment_date);
                                                    const isProcessing = processingIds.has(p.id);


                                                    const displayDate = p.next_payment_date
                                                        ? new Date(p.next_payment_date).toLocaleDateString()
                                                        : 'N/A';


                                                    return (
                                                        <tr key={p.id || p._tempId || idx}>
                                                            <td>
                                                                <strong>{p.clientName}</strong><br />
                                                                <span style={{ fontSize: '11px', color: '#777' }}>{p.clientEmail || ''}</span>
                                                            </td>
                                                            <td>{p.policy_type}</td>
                                                            <td>{displayDate}</td>
                                                            <td>PHP {parseFloat(p.premium_paid).toLocaleString()}</td>
                                                            <td>
                                                                {p.status !== 'Issued' ? (
                                                                    <span className="status-badge status-pending" style={{ fontSize: '10px' }}>{p.status}</span>
                                                                ) : isOver ? (
                                                                    <span className="status-overdue">笞 OVERDUE</span>
                                                                ) : (
                                                                    <span className="status-due">Upcoming</span>
                                                                )}
                                                            </td>


                                                            {/* View Details Button */}
                                                            <td>
                                                                <button
                                                                    onClick={(e) => handleViewDetails(p, e)}
                                                                    style={{
                                                                        backgroundColor: '#007bff',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px'
                                                                    }}
                                                                >
                                                                    View
                                                                </button>
                                                            </td>


                                                            <td>
                                                                <button
                                                                    className="pay-btn"
                                                                    onClick={(e) => markPaid(p.id, e)}
                                                                    disabled={isProcessing}
                                                                    style={{
                                                                        opacity: isProcessing ? 0.6 : 1,
                                                                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                                    }}
                                                                >
                                                                    {isProcessing ? 'Saving...' : 'Mark Paid'}
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
            </div>


            {/* --- NEW: DETAILED VIEW MODAL --- */}
            {showDetailsModal && selectedPolicy && ReactDOM.createPortal(
                <div onClick={() => setShowDetailsModal(false)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 10000,
                    margin: 0,
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{
                        maxWidth: '600px',
                        width: '100%',
                        margin: 'auto',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Policy Details</h2>
                            <span className="close-modal" onClick={() => setShowDetailsModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">


                            {/* 1. KEY INFO GRID */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px',
                                backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6'
                            }}>
                                {/* ADDED: Client Name Field */}
                                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '5px' }}>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Client Name</small>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                                        {selectedPolicy.clientName}
                                    </div>
                                    <small style={{ color: '#888' }}>{selectedPolicy.clientEmail}</small>
                                </div>


                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Serial Number</small>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#003781' }}>{selectedPolicy.serial_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Current Status</small>
                                    <div>
                                        <span className={`status-badge status-${selectedPolicy.status ? selectedPolicy.status.toLowerCase() : 'pending'}`}>
                                            {selectedPolicy.status || 'Pending'}
                                        </span>
                                    </div>
                                </div>


                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Policy Type</small>
                                    <div style={{ fontWeight: 500 }}>{selectedPolicy.policy_type}</div>
                                </div>
                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Premium</small>
                                    <div style={{ fontWeight: 500 }}>PHP {parseFloat(selectedPolicy.premium_paid).toLocaleString()}</div>
                                </div>


                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Mode of Payment</small>
                                    <div>{selectedPolicy.mode_of_payment}</div>
                                </div>
                                <div>
                                    <small style={{ color: '#666', fontWeight: 600 }}>Agency</small>
                                    <div>{selectedPolicy.agency || '-'}</div>
                                </div>
                            </div>


                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '20px' }}>
                                <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '6px' }}>
                                    <small style={{ color: '#0055b8', fontWeight: 700 }}>Submitted On</small>
                                    <div style={{ fontSize: '13px' }}>
                                        {selectedPolicy.created_at ? new Date(selectedPolicy.created_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                                <div style={{ padding: '10px', background: '#d4edda', borderRadius: '6px' }}>
                                    <small style={{ color: '#155724', fontWeight: 700 }}>Issued On</small>
                                    <div style={{ fontSize: '13px' }}>
                                        {selectedPolicy.status === 'Issued' ?
                                            (selectedPolicy.date_issued ? new Date(selectedPolicy.date_issued).toLocaleDateString() : 'N/A')
                                            : '-'}
                                    </div>
                                </div>
                                <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '6px' }}>
                                    <small style={{ color: '#856404', fontWeight: 700 }}>Next Due</small>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                        {selectedPolicy.next_payment_date ? new Date(selectedPolicy.next_payment_date).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>


                            {/* 2. ATTACHMENTS LIST */}
                            <h3 style={{ marginTop: '25px', marginBottom: '10px', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                梼 Attached Files
                            </h3>
                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {selectedPolicy.attachments && selectedPolicy.attachments.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {selectedPolicy.attachments.map((file, idx) => (
                                            <li key={idx} style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <a
                                                    href={file.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ textDecoration: 'none', color: '#007bff', fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    塘 {file.fileName || 'Document'}
                                                </a>
                                                <span style={{ fontSize: '11px', color: '#999' }}>
                                                    {(file.fileSize / 1024).toFixed(0)} KB
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>No documents attached.</p>
                                )}
                            </div>


                            {/* 3. PAYMENT HISTORY (ADDED) */}
                            <h3 style={{ marginTop: '25px', marginBottom: '10px', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                諜 Payment History
                            </h3>
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
                                                        <td style={{ padding: '8px' }}>
                                                            {new Date(hist.payment_date).toLocaleDateString()}
                                                            <div style={{ fontSize: '10px', color: '#999' }}>
                                                                {new Date(hist.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            {hist.period_covered ? new Date(hist.period_covered).toLocaleDateString() : '-'}
                                                        </td>
                                                        <td style={{ padding: '8px', fontWeight: 600, color: '#28a745' }}>
                                                            PHP {parseFloat(hist.amount).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                                                    No payment history found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>


                            <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                {/* Added Mark Paid Button to Details Modal */}
                                {selectedPolicy.status !== 'Issued' && (
                                    <button
                                        onClick={(e) => {
                                            setShowDetailsModal(false);
                                            markPaid(selectedPolicy.id, e);
                                        }}
                                        style={{
                                            padding: '8px 20px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            marginRight: '10px'
                                        }}
                                    >
                                        Mark as Paid
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    style={{
                                        padding: '8px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}


            {/* --- NEW: PAYMENT CONFIRMATION MODAL --- */}
            {showConfirmModal && ReactDOM.createPortal(
                <div onClick={!processingIds.has(policyToConfirm) ? cancelPayment : undefined} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 10001,
                    margin: 0,
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{
                        maxWidth: '450px',
                        width: '100%',
                        margin: 'auto',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Confirm Payment</h2>
                            {!processingIds.has(policyToConfirm) && (
                                <span className="close-modal" onClick={cancelPayment}>&times;</span>
                            )}
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '16px', marginBottom: '20px', color: '#495057' }}>
                                Are you sure you want to mark this payment as received?
                            </p>
                            <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '25px' }}>
                                This will record the payment and update the next due date.
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={cancelPayment}
                                    disabled={processingIds.has(policyToConfirm)}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: processingIds.has(policyToConfirm) ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        opacity: processingIds.has(policyToConfirm) ? 0.6 : 1
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmPayment}
                                    disabled={processingIds.has(policyToConfirm)}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: processingIds.has(policyToConfirm) ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        opacity: processingIds.has(policyToConfirm) ? 0.6 : 1,
                                        minWidth: '140px'
                                    }}
                                >
                                    {processingIds.has(policyToConfirm) ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};


export default ClientsPage;

