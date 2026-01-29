// - Updated Actions Column (Text + Colors)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import "./Style/Policies.css";
import LogoImage from "../../assets/logo1.png";
import { toTitleCase } from "../../utils/textUtils";

const AdminPolicies = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [viewArchived, setViewArchived] = useState(false);

    // Policies Data
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Agencies Data
    const [agencies, setAgencies] = useState([]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState(null);
    
    const [formData, setFormData] = useState({
        policy_name: "",
        form_type: "VUL",
        active_status: true,
        agency: "",
        request_type: "manual",
    });

    // --- Requirements State ---
    const [requirements, setRequirements] = useState([]);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [policyToToggle, setPolicyToToggle] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkAdmin();
        fetchAgencies();
    }, [navigate]);

    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Please login first");
            navigate("/");
            return;
        }
        const { data: profile } = await supabase
            .from("profiles")
            .select("account_type")
            .eq("id", session.user.id)
            .single();

        if (profile?.account_type?.toLowerCase() !== "admin") {
            alert("Access denied");
            navigate("/");
            return;
        }
        setUser(session.user);
        fetchPolicies();
    };

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("policy")
                .select(`*, agency_details:agency (agency_id, name)`)
                .order("policy_id", { ascending: false });

            if (error) throw error;
            setPolicies(data || []);
        } catch (err) {
            console.error(err);
            alert(`Failed to fetch policies: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgencies = async () => {
        const { data } = await supabase.from("agency").select("*").order("name", { ascending: true });
        setAgencies(data || []);
    };

    // --- Requirements Logic ---
    const addRequirement = () => {
        setRequirements([...requirements, { id: `req_${Date.now()}`, label: "", required: true }]);
    };

    const removeRequirement = (index) => {
        const newReqs = [...requirements];
        newReqs.splice(index, 1);
        setRequirements(newReqs);
    };

    const updateRequirement = (index, field, value) => {
        const newReqs = [...requirements];
        newReqs[index][field] = value;
        setRequirements(newReqs);
    };

    // Handle Form Input
    const handleChange = (e) => {
        let value = e.target.value;
        if (e.target.name === "policy_name") value = toTitleCase(value);
        setFormData({ ...formData, [e.target.name]: value });
    };

    // Open Modal
    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ policy_name: "", form_type: "VUL", active_status: true, agency: "", request_type: "manual" });
        setRequirements([]); 
        setCurrentPolicy(null);
        setShowModal(true);
    };

    const openEditModal = (policy) => {
        setIsEditing(true);
        setCurrentPolicy(policy);
        setFormData({
            policy_name: policy.policy_name,
            form_type: policy.form_type || "VUL",
            active_status: policy.active_status,
            agency: policy.agency || "",
            request_type: policy.request_type || "manual",
        });
        setRequirements(policy.requirements || []);
        setShowModal(true);
    };

    // Submit Policy
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.policy_name) {
            alert("Please fill in all fields");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                policy_name: formData.policy_name,
                policy_type: formData.policy_name,
                form_type: formData.form_type,
                active_status: formData.active_status,
                agency: formData.agency || null,
                request_type: formData.request_type,
                requirements: requirements 
            };

            if (isEditing && currentPolicy) {
                const { error } = await supabase
                    .from("policy")
                    .update(payload)
                    .eq("policy_id", currentPolicy.policy_id);
                if (error) throw error;
                alert("Policy updated successfully!");
            } else {
                const { error } = await supabase.from("policy").insert([payload]);
                if (error) throw error;
                alert("Policy added successfully!");
            }

            setShowModal(false);
            fetchPolicies();
        } catch (err) {
            console.error(err);
            alert("Operation failed: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openConfirmModal = (policy) => {
        setPolicyToToggle(policy);
        setShowConfirmModal(true);
    };

    const confirmToggleStatus = async () => {
        if (!policyToToggle) return;
        try {
            const { error } = await supabase
                .from("policy")
                .update({ active_status: !policyToToggle.active_status })
                .eq("policy_id", policyToToggle.policy_id);

            if (error) throw error;
            setShowConfirmModal(false);
            setPolicyToToggle(null);
            fetchPolicies();
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    };

    const filteredPolicies = policies.filter(policy => 
        viewArchived ? !policy.active_status : policy.active_status
    );

    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    return (
        <div className="admin-container">
            <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <i className="fa-solid fa-bars"></i>
                </button>
                <div className="admin-sidebar-logo">
                    <img src={LogoImage} alt="Logo" className="admin-logo-img" />
                </div>
                <ul className="admin-sidebar-menu">
                    <li onClick={() => navigate("/admin/dashboard")}><i className="fa-solid fa-chart-line"></i> {sidebarOpen && <span>Dashboard</span>}</li>
                    <li onClick={() => navigate("/admin/ManageUsers")}><i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}</li>
                    <li className="active"><i className="fa-solid fa-file-shield"></i> {sidebarOpen && <span>Policies</span>}</li>
                </ul>
            </aside>

            <header className={`admin-header ${sidebarOpen ? '' : 'expanded'}`}>
                <div className="admin-header-content">
                    <h1>Admin Dashboard</h1>
                    <div className="admin-header-user">
                        <button className="admin-user-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                            <div className="admin-user-avatar">
                                <i className="fa-solid fa-user"></i>
                            </div>
                            <span>{user?.user_metadata?.last_name || "User"} - Admin</span>
                        </button>
                        {showProfileMenu && (
                            <div className="admin-profile-dropdown">
                                <a onClick={() => navigate("/admin/Profile")} className="admin-dropdown-item"><i className="fa-solid fa-user"></i> Profile</a>
                                <a onClick={logout} className="admin-dropdown-item admin-logout-item"><i className="fa-solid fa-right-from-bracket"></i> Logout</a>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className={`admin-main-content ${sidebarOpen ? '' : 'expanded'}`}>
                <div className="policies-container">
                    <div className="policies-header">
                        <h2 className="policies-title">Policy Management</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="add-policy-btn" onClick={() => setViewArchived(!viewArchived)} style={{ backgroundColor: '#003266' }}>
                                <i className={`fa-solid ${viewArchived ? 'fa-list-check' : 'fa-box-archive'}`}></i>
                                {viewArchived ? " View Active" : " View Archived"}
                            </button>
                            <button className="add-policy-btn" onClick={openAddModal}>
                                <i className="fa-solid fa-plus"></i> Add New Policy
                            </button>
                        </div>
                    </div>

                    {loading ? <p className="loader">Loading policies...</p> : (
                        <div className="table-container">
                            <table className="policies-table">
                                <thead>
                                    <tr>
                                        <th>Policy Name</th>
                                        <th>Form Type</th>
                                        <th>Requirements</th>
                                        <th>Request Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPolicies.map((policy) => (
                                        <tr key={policy.policy_id}>
                                            <td>{policy.policy_name}</td>
                                            <td><span className="policy-type-badge">{policy.form_type || 'N/A'}</span></td>
                                            <td>
                                                <small style={{ color: '#666' }}>
                                                    {policy.requirements?.length || 0} files required
                                                </small>
                                            </td>
                                            <td>{toTitleCase(policy.request_type) || '-'}</td>
                                            <td>
                                                <span className={`status-badge ${policy.active_status ? 'status-active' : 'status-inactive'}`}>
                                                    {policy.active_status ? 'Active' : 'Archived'}
                                                </span>
                                            </td>
                                            
                                            {/* --- UPDATED ACTIONS COLUMN (TEXT + COLORS) --- */}
                                            <td>
                                                <div className="policy-actions" style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => openConfirmModal(policy)}
                                                        style={{
                                                            backgroundColor: policy.active_status ? '#dc3545' : '#28a745', // Red for Archive, Green for Restore
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        <i className={`fa-solid ${policy.active_status ? 'fa-box-archive' : 'fa-rotate-left'}`}></i>
                                                        {policy.active_status ? "Archive" : "Restore"}
                                                    </button>

                                                    <button 
                                                        onClick={() => openEditModal(policy)}
                                                        style={{
                                                            backgroundColor: '#007bff', // Blue for Edit
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-pen"></i>
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                            {/* ------------------------------------------- */}

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ADD/EDIT MODAL */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="modal-title">{isEditing ? "Edit Policy" : "Add New Policy"}</div>
                            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                                <div className="modal-form">
                                    <div className="input-group">
                                        <label>Policy Name</label>
                                        <input name="policy_name" value={formData.policy_name} onChange={handleChange} required />
                                    </div>
                                    <div className="name-row">
                                        <div className="input-group">
                                            <label>Request Type</label>
                                            <select name="request_type" value={formData.request_type} onChange={handleChange}>
                                                <option value="Manual">Manual</option>
                                                <option value="System">System</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Form Type</label>
                                            <select name="form_type" value={formData.form_type} onChange={handleChange} required>
                                                <option value="VUL">VUL</option>
                                                <option value="IHP">IHP</option>
                                                <option value="TRAD">TRAD</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Agency</label>
                                        <select name="agency" value={formData.agency} onChange={handleChange}>
                                            <option value="">-- No Agency --</option>
                                            {agencies.map(a => <option key={a.agency_id} value={a.agency_id}>{a.name}</option>)}
                                        </select>
                                    </div>

                                    {/* REQUIREMENTS BUILDER */}
                                    <div className="input-group" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <label style={{ margin: 0 }}>Document Requirements</label>
                                            <button type="button" onClick={addRequirement} style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer', background: '#e3f2fd', color: '#0055b8', border: '1px solid #b3d7ff', borderRadius: '4px' }}>
                                                + Add File Slot
                                            </button>
                                        </div>
                                        
                                        {requirements.length === 0 && <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No specific documents defined. (Will use defaults)</p>}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {requirements.map((req, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Document Name (e.g. Valid ID)" 
                                                        value={req.label}
                                                        onChange={(e) => updateRequirement(idx, 'label', e.target.value)}
                                                        required
                                                        style={{ flex: 1, padding: '6px', fontSize: '13px' }}
                                                    />
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={req.required}
                                                            onChange={(e) => updateRequirement(idx, 'required', e.target.checked)}
                                                        /> 
                                                        Req?
                                                    </label>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeRequirement(idx)}
                                                        style={{ background: '#ffebeb', color: '#dc3545', border: '1px solid #ffc9c9', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                                <div className="modal-buttons" style={{ marginTop: '20px' }}>
                                    <button type="button" className="modal-close" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="modal-submit" disabled={submitting}>Save Policy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* CONFIRM MODAL */}
                {showConfirmModal && policyToToggle && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '400px' }}>
                            <div className="modal-title">Confirm Action</div>
                            <p style={{ textAlign: 'center', margin: '20px 0' }}>Are you sure you want to <strong>{policyToToggle.active_status ? 'archive' : 'restore'}</strong> "{policyToToggle.policy_name}"?</p>
                            <div className="modal-buttons">
                                <button type="button" className="modal-close" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                                <button type="button" className="modal-submit" onClick={confirmToggleStatus}>Confirm</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPolicies;