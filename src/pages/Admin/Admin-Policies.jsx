import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import "./Style/Policies.css";
import LogoImage from "../../assets/logo1.png";

const AdminPolicies = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Policies Data
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState(null);
    const [formData, setFormData] = useState({
        policy_name: "",
        policy_type: "VUL", // Default
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkAdmin();
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
        const { data, error } = await supabase
            .from("policy")
            .select("*")
            .order("policy_id", { ascending: false }); // Show newest first? Or alphabetical?

        if (error) console.error("Error fetching policies:", error);
        else setPolicies(data || []);
        setLoading(false);
    };

    // Handle Form Input
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Open Modal
    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ policy_name: "", policy_type: "VUL" });
        setCurrentPolicy(null);
        setShowModal(true);
    };

    const openEditModal = (policy) => {
        setIsEditing(true);
        setCurrentPolicy(policy);
        setFormData({
            policy_name: policy.policy_name,
            policy_type: policy.policy_type,
        });
        setShowModal(true);
    };

    // Submit Policy (Add or Edit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.policy_name || !formData.policy_type) {
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
                        policy_type: formData.policy_type
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
                        policy_type: formData.policy_type
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

    // Delete Policy (Optional, be careful with FKs)
    // const handleDelete = async (id) => { ... }

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
                    <li onClick={() => navigate("/admin/SerialNumber")}>
                        <i className="fa-solid fa-barcode"></i> {sidebarOpen && <span>Serial Numbers</span>}
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
                        <button className="add-policy-btn" onClick={openAddModal}>
                            <i className="fa-solid fa-plus"></i> Add New Policy
                        </button>
                    </div>

                    {loading ? (
                        <p className="loader">Loading policies...</p>
                    ) : (
                        <div className="table-container">
                            <table className="policies-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Policy Name</th>
                                        <th>Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policies.length === 0 ? (
                                        <tr>
                                            <td colSpan="4">No policies found.</td>
                                        </tr>
                                    ) : (
                                        policies.map((policy, index) => (
                                            <tr key={policy.policy_id}>
                                                <td>{index + 1}</td>
                                                <td>{policy.policy_name}</td>
                                                <td>
                                                    <span className="policy-type-badge">{policy.policy_type}</span>
                                                </td>
                                                <td>
                                                    <div className="policy-actions">
                                                        <button
                                                            className="edit-btn"
                                                            title="Edit"
                                                            onClick={() => openEditModal(policy)}
                                                        >
                                                            <i className="fa-solid fa-pen"></i>
                                                        </button>
                                                        {/* 
                                                        <button className="delete-btn" title="Delete">
                                                            <i className="fa-solid fa-trash"></i>
                                                        </button> 
                                                        */}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="policy-modal">
                            <div className="modal-header">
                                <h2>{isEditing ? "Edit Policy" : "Add New Policy"}</h2>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Policy Name</label>
                                    <input
                                        type="text"
                                        name="policy_name"
                                        value={formData.policy_name}
                                        onChange={handleChange}
                                        placeholder="e.g. Health Protect Plus"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Policy Type</label>
                                    <select
                                        name="policy_type"
                                        value={formData.policy_type}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="VUL">VUL</option>
                                        <option value="IHP">IHP</option>
                                        <option value="TRAD">TRAD</option>
                                    </select>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn" disabled={submitting}>
                                        {submitting ? "Saving..." : "Save Policy"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AdminPolicies;
