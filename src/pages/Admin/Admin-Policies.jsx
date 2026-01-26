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
    const [viewArchived, setViewArchived] = useState(false); // New State

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
        form_type: "VUL", // Default
        active_status: true, // Default true (Active)
        agency: "", // Agency ID
        request_type: "manual", // Default
    });

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
            console.log("Fetching policies from database...");
            const { data, error } = await supabase
                .from("policy")
                .select(`
                    *,
                    agency_details:agency (
                        agency_id,
                        name
                    )
                `)
                .order("policy_id", { ascending: false });

            if (error) {
                console.error("Error fetching policies:", error);
                console.error("Error details:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                alert(`Failed to fetch policies: ${error.message}\n\nThis might be due to Row Level Security (RLS) policies. Please check your Supabase configuration.`);
            } else {
                console.log("Policies fetched successfully:", data);
                setPolicies(data || []);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            alert(`Unexpected error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgencies = async () => {
        try {
            const { data, error } = await supabase
                .from("agency")
                .select("*")
                .order("name", { ascending: true });

            if (error) {
                console.error("Error fetching agencies:", error);
            } else {
                setAgencies(data || []);
            }
        } catch (err) {
            console.error("Error fetching agencies:", err);
        }
    };

    // Handle Form Input
    const handleChange = (e) => {
        let value = e.target.value;
        if (e.target.name === "policy_name") {
            value = toTitleCase(value);
        }
        setFormData({ ...formData, [e.target.name]: value });
    };

    // Open Modal
    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ policy_name: "", form_type: "VUL", active_status: true, agency: "", request_type: "manual" });
        setCurrentPolicy(null);
        setShowModal(true);
    };

    const openEditModal = (policy) => {
        setIsEditing(true);
        setCurrentPolicy(policy);
        setFormData({
            policy_name: policy.policy_name,
            form_type: policy.form_type || "VUL",
            active_status: policy.active_status, // Boolean
            agency: policy.agency || "",
            request_type: policy.request_type || "manual",
        });
        setShowModal(true);
    };

    // Submit Policy (Add or Edit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.policy_name) {
            alert("Please fill in all fields");
            return;
        }

        setSubmitting(true);
        try {
            if (isEditing && currentPolicy) {
                // Update
                const { error } = await supabase
                    .from("policy")
                    .update({
                        policy_name: formData.policy_name,
                        policy_type: formData.policy_name, // Satisfy DB constraint
                        form_type: formData.form_type,
                        active_status: formData.active_status,
                        agency: formData.agency || null,
                        request_type: formData.request_type
                    })
                    .eq("policy_id", currentPolicy.policy_id);

                if (error) throw error;
                alert("Policy updated successfully!");
            } else {
                // Insert
                const { error } = await supabase
                    .from("policy")
                    .insert([{
                        policy_name: formData.policy_name,
                        policy_type: formData.policy_name, // Satisfy DB constraint
                        form_type: formData.form_type,
                        active_status: formData.active_status,
                        agency: formData.agency || null,
                        request_type: formData.request_type
                    }]);

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

    // Open Confirmation Modal
    const openConfirmModal = (policy) => {
        setPolicyToToggle(policy);
        setShowConfirmModal(true);
    };

    // Toggle Active/Inactive Status
    const confirmToggleStatus = async () => {
        if (!policyToToggle) return;

        // Toggle boolean
        const newStatus = !policyToToggle.active_status;
        try {
            const { error } = await supabase
                .from("policy")
                .update({ active_status: newStatus })
                .eq("policy_id", policyToToggle.policy_id);

            if (error) throw error;
            setShowConfirmModal(false);
            setPolicyToToggle(null);
            fetchPolicies();
        } catch (err) {
            console.error(err);
            alert("Failed to update status: " + err.message);
        }
    };

    // Delete Policy (Optional, be careful with FKs)
    // const handleDelete = async (id) => { ... }
    const filteredPolicies = policies.filter(policy => 
        viewArchived ? !policy.active_status : policy.active_status
    );
    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };


    return (
        <div className="admin-container">
            {/* SIDEBAR */}
            <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                <button
                    className="admin-sidebar-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <i className={`fa-solid ${sidebarOpen ? 'fa-bars' : 'fa-bars'}`}></i>
                </button>
                <div className="admin-sidebar-logo">
                    <img src={LogoImage} alt="Logo" className="admin-logo-img" />
                </div>
                <ul className="admin-sidebar-menu">
                    <li onClick={() => navigate("/admin/dashboard")}>
                        <i className="fa-solid fa-chart-line"></i> {sidebarOpen && <span>Dashboard</span>}
                    </li>
                    <li onClick={() => navigate("/admin/ManageUsers")}>
                        <i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}
                    </li>
                    {/* Active State for Policies */}
                    <li className="active">
                        <i className="fa-solid fa-file-shield"></i> {sidebarOpen && <span>Policies</span>}
                    </li>
                </ul>
            </aside>

            {/* HEADER */}
            <header className={`admin-header ${sidebarOpen ? '' : 'expanded'}`}>
                <div className="admin-header-content">
                    <h1>Admin Dashboard</h1>
                    <div className="admin-header-user">
                        <button
                            className="admin-user-profile-btn"
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <div className="admin-user-avatar">
                                {user?.user_metadata?.last_name ? (
                                    <span className="admin-avatar-initials">
                                        {user.user_metadata.last_name.charAt(0).toUpperCase()}
                                    </span>
                                ) : (
                                    <i className="fa-solid fa-user"></i>
                                )}
                            </div>
                            <span>{user?.user_metadata?.last_name || "User"} - Admin</span>
                        </button>
                        {showProfileMenu && (
                            <div className="admin-profile-dropdown">
                                <a href="#" className="admin-dropdown-item">
                                    <i className="fa-solid fa-user"></i> Profile
                                </a>
                                <a href="#" className="admin-dropdown-item">
                                    <i className="fa-solid fa-lock"></i> Change Password
                                </a>
                                <hr className="admin-dropdown-divider" />
                                <a onClick={logout} className="admin-dropdown-item admin-logout-item">
                                    <i className="fa-solid fa-right-from-bracket"></i> Logout
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className={`admin-main-content ${sidebarOpen ? '' : 'expanded'}`}>
                <div className="policies-container">
                    <div className="policies-header">
                        <h2 className="policies-title">Policy Management</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {/* NEW BUTTON: View Archived/Active */}
                            <button 
                                className="add-policy-btn" 
                                onClick={() => setViewArchived(!viewArchived)}
                                style={{ backgroundColor: viewArchived ? '#003266' : '#003266' }} 
                            >
                                <i className={`fa-solid ${viewArchived ? 'fa-list-check' : 'fa-box-archive'}`}></i>
                                {viewArchived ? " View Active" : " View Archived"}
                            </button>

                            <button className="add-policy-btn" onClick={openAddModal}>
                                <i className="fa-solid fa-plus"></i> Add New Policy
                            </button>
                    </div>
</div>
                    {loading ? (
                        <p className="loader">Loading policies...</p>
                    ) : (
                        <div className="table-container">
                            <table className="policies-table">
                                <thead>
                                    <tr>
                                        <th>Policy Name</th>
                                        <th>Form Type</th>
                                        <th>Request Type</th>
                                        <th>Agency</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
<tbody>
    {/* Use filteredPolicies instead of policies to allow the toggle to work */}
    {filteredPolicies.length === 0 ? (
        <tr>
            <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                {viewArchived 
                    ? "No archived policies found." 
                    : "No active policies found."}
            </td>
        </tr>
    ) : (
        filteredPolicies.map((policy) => {
            // Helper to get agency name safely
            const getAgencyName = () => {
                if (policy.agency_details?.name) return policy.agency_details.name;
                
                // Fallback: finding in agencies list if the join fails
                const found = agencies.find(a => a.agency_id === policy.agency);
                return found ? found.name : 'No Agency';
            };

            return (
                <tr key={policy.policy_id}>
                    <td>{policy.policy_name}</td>
                    <td>
                        <span className="policy-type-badge">{policy.form_type || 'N/A'}</span>
                    </td>
                    <td>
                        {toTitleCase(policy.request_type) || '-'}
                    </td>
                    <td>
                        <span className="agency-badge">{getAgencyName()}</span>
                    </td>
                    <td>
                        <span className={`status-badge ${policy.active_status ? 'status-active' : 'status-inactive'}`}>
                            {policy.active_status ? 'Active' : 'Archived'}
                        </span>
                    </td>
                    <td>
                        <div className="policy-actions">
                            <button
                                className={`toggle-btn ${policy.active_status ? 'btn-deactivate' : 'btn-activate'}`}
                                title={policy.active_status ? 'Archive Policy' : 'Restore Policy'}
                                onClick={() => openConfirmModal(policy)}
                            >
                                <i className={`fa-solid ${policy.active_status ? 'fa-box-archive' : 'fa-rotate-left'}`}></i>
                                {policy.active_status ? 'Archive' : 'Restore'}
                            </button>
                            <button
                                className="edit-btn"
                                title="Edit"
                                onClick={() => openEditModal(policy)}
                            >
                                <i className="fa-solid fa-pen"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            );
        })
    )}
</tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL */}
{/* ADD/EDIT MODAL */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-title">{isEditing ? "Edit Policy" : "Add New Policy"}</div>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
                                </div>
                                <div className="modal-buttons">
                                    <button type="button" className="modal-close" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="modal-submit" disabled={submitting}>Save Policy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* CONFIRMATION MODAL */}
                {showConfirmModal && policyToToggle && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '450px' }}>
                            <div className="modal-title">Confirm Action</div>
                            <div className="modal-form" style={{ textAlign: 'center' }}>
                                <p>Are you sure you want to <strong>{policyToToggle.active_status ? 'archive' : 'restore'}</strong>:</p>
                                <h3 style={{ marginTop: '10px', color: '#003266' }}>"{policyToToggle.policy_name}"</h3>
                            </div>
                            <div className="modal-buttons">
                                <button type="button" className="modal-close" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                                <button 
                                    type="button" 
                                    className={policyToToggle.active_status ? "btn-delete" : "btn-active-toggle"}
                                    onClick={confirmToggleStatus}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPolicies;