import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import "./Style/ManageUsers.css?v=2";
import LogoImage from "../../assets/logo1.png";

const ManageUsers = () => {
  const navigate = useNavigate();

  // List Data
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null); // Admin session user
  // --- ADD THESE BLOCKS ---
const [statusFilter, setStatusFilter] = useState("Active"); // Default to Active

// Derived state to filter the list based on the "Status" column
const filteredUsers = users.filter((u) => {
  const currentStatus = u.Status || "Active"; // Treat null as Active
  return currentStatus === statusFilter;
});
  // UI States
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    position: "MP",
    reportsTo: ""
  });

  // Hierarchy/View Data
  const [potentialUplines, setPotentialUplines] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingSupervisor, setViewingSupervisor] = useState(null);
  const [viewingSubordinates, setViewingSubordinates] = useState([]);

  // Messages
  const [modalError, setModalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- Initialization ---

  useEffect(() => {
    fetchUsers();
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    getSession();
  }, []);

  useEffect(() => {
    document.body.style.overflow = (showModal || showViewModal) ? "hidden" : "auto";
  }, [showModal, showViewModal]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setUsers(data || []);
  };

  // --- Hierarchy Logic ---

  const fetchPotentialUplines = useCallback(async (role, excludeUserId = null) => {
    const roleMap = { "AP": "AL", "AL": "MP" };
    const uplineRole = roleMap[role];

    if (!uplineRole) {
      setPotentialUplines([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, account_type")
      .eq("account_type", uplineRole)
      .neq("id", excludeUserId || "");

    if (!error) setPotentialUplines(data || []);
  }, []);

  useEffect(() => {
    fetchPotentialUplines(formData.position, editingUserId);
  }, [formData.position, editingUserId, fetchPotentialUplines]);

  // --- Handlers ---

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePassword = () => {
    if (!formData.lastName.trim()) {
      setModalError("Please enter last name first");
      return;
    }
    const firstTwo = formData.lastName.substring(0, 2);
    const pwd = `#${firstTwo.charAt(0).toUpperCase()}${firstTwo.charAt(1).toLowerCase()}8080`;
    setFormData(prev => ({ ...prev, password: pwd }));
    setModalError("");
  };

  const submitAddUser = async (e) => {
    e.preventDefault();
    setModalError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      let userIdToProcess = editingUserId;

      if (isEditMode) {
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            account_type: formData.position,
          })
          .eq("id", editingUserId);
        if (error) throw error;
        setSuccessMsg("User updated successfully!");
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { first_name: formData.firstName, last_name: formData.lastName, account_type: formData.position },
          },
        });
        if (authError) throw authError;

        userIdToProcess = authData.user.id;
const { error: profileError } = await supabase.from("profiles").insert({
  id: userIdToProcess,
  first_name: formData.firstName,
  last_name: formData.lastName,
  email: formData.email,
  account_type: formData.position,
  Status: "Active", // Explicitly set this here
});
        if (profileError) throw profileError;
        setSuccessMsg("User created successfully!");
      }

      // Handle Hierarchy Assignment
      if (formData.reportsTo && userIdToProcess) {
        await supabase.from("user_hierarchy").update({ is_active: false }).eq("user_id", userIdToProcess);
        const { error: hError } = await supabase.from("user_hierarchy").insert({
          user_id: userIdToProcess,
          report_to_id: formData.reportsTo,
          assigned_by: user.id,
          is_active: true
        });
        if (hError) throw hError;
      }

      fetchUsers();
      setTimeout(() => closeModal(), 1500);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Modal Controls ---

  const openViewModal = async (u) => {
    setViewingUser(u);
    setShowViewModal(true);
    
    // Reset and fetch hierarchy info
    const [supRes, subRes] = await Promise.all([
      supabase.from("user_hierarchy").select("profiles:report_to_id(first_name, last_name, account_type)").eq("user_id", u.id).eq("is_active", true).maybeSingle(),
      supabase.from("user_hierarchy").select("profiles:user_id(first_name, last_name, account_type)").eq("report_to_id", u.id).eq("is_active", true)
    ]);

    setViewingSupervisor(supRes.data?.profiles || null);
    setViewingSubordinates(subRes.data?.map(d => d.profiles).filter(Boolean) || []);
  };

  const openEditModal = async (u) => {
    setIsEditMode(true);
    setEditingUserId(u.id);
    setFormData({
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      password: "",
      position: u.account_type,
      reportsTo: ""
    });

    // Fetch current supervisor
    const { data } = await supabase.from("user_hierarchy").select("report_to_id").eq("user_id", u.id).eq("is_active", true).maybeSingle();
    if (data) setFormData(prev => ({ ...prev, reportsTo: data.report_to_id }));
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowViewModal(false);
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({ firstName: "", lastName: "", email: "", password: "", position: "MP", reportsTo: "" });
    setModalError("");
    setSuccessMsg("");
    setViewingSupervisor(null);
    setViewingSubordinates([]);
  };
const toggleUserStatus = async (userItem) => {
  const currentStatus = userItem.Status || "Active";
  const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
  
  // Dynamic message based on target status
  const actionText = newStatus === "Inactive" ? "deactivate" : "reactivate";
  const confirmMessage = `Are you sure you want to ${actionText} ${userItem.first_name} ${userItem.last_name}?`;

  // Standard browser confirmation (OK = Confirm, Cancel = Back)
  if (window.confirm(confirmMessage)) {
    const { error } = await supabase
      .from("profiles")
      .update({ Status: newStatus })
      .eq("id", userItem.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      fetchUsers(); // Refresh the table
    }
  }
};

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="admin-sidebar-logo">
          <img src={LogoImage} alt="Logo" className="admin-logo-img" />
        </div>
        <ul className="admin-sidebar-menu">
          <li onClick={() => navigate("/admin/dashboard")}>
            <i className="fa-solid fa-chart-line"></i> {sidebarOpen && <span>Dashboard</span>}
          </li>
          <li className="active">
            <i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}
          </li>
          <li onClick={() => navigate("/admin/policies")}>
            <i className="fa-solid fa-file-shield"></i> {sidebarOpen && <span>Policies</span>}
          </li>
        </ul>
      </aside>

      {/* Header */}
      <header className={`admin-header ${sidebarOpen ? '' : 'expanded'}`}>
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <div className="admin-header-user">
            <button className="admin-user-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div className="admin-user-avatar">
                {user?.user_metadata?.last_name ? (
                  <span className="admin-avatar-initials">{user.user_metadata.last_name.charAt(0).toUpperCase()}</span>
                ) : <i className="fa-solid fa-user"></i>}
              </div>
              <span>{user?.user_metadata?.last_name || "User"} - Admin</span>
            </button>
            {showProfileMenu && (
              <div className="admin-profile-dropdown">
                <button onClick={() => navigate("/admin/SerialNumber")} className="admin-dropdown-item"><i className="fa-solid fa-barcode"></i> Serial Numbers</button>
                <button className="admin-dropdown-item"><i className="fa-solid fa-user"></i> Profile</button>
                <hr className="admin-dropdown-divider" />
                <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="admin-dropdown-item admin-logout-item">
                  <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`admin-main-content ${sidebarOpen ? '' : 'expanded'}`}>
<div className="header-row">
  <h1>Manage Users</h1>
  <div className="header-actions">
    {/* Toggle Filter Button */}
    <button 
      className="add-btn" 
      onClick={() => setStatusFilter(statusFilter === "Active" ? "Inactive" : "Active")}
    >
      <i className={`fa-solid ${statusFilter === "Active" ? "fa-user-slash" : "fa-user-check"}`}></i>
      {statusFilter === "Active" ? " View Inactive Users" : " View Active Users"}
    </button>

    <button className="add-btn" onClick={() => setShowModal(true)}>+ Add User</button>
  </div>
</div>

        <div className="admin-table-card">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Position</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
<tbody>
  {filteredUsers.length === 0 ? (
    <tr>
      <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
        No {statusFilter.toLowerCase()} users found.
      </td>
    </tr>
  ) : (
    filteredUsers.map((u, index) => {
      const isInactive = u.Status === "Inactive";
      
      return (
        <tr key={u.id}>
          <td>{index + 1}</td>
          <td>{u.last_name}</td>
          <td>{u.first_name}</td>
          <td>{u.account_type}</td>
          <td>
            <span className={`status-badge ${isInactive ? "inactive" : "active"}`}>
              {isInactive ? "Inactive" : "Active"}
            </span>
          </td>
          <td className="action-cell">
            <button className="btn-view" onClick={() => openViewModal(u)}>View</button>
            <button className="btn-update" onClick={() => openEditModal(u)}>Update</button>
            <button 
              className={isInactive ? "btn-active-toggle" : "btn-delete"} 
              onClick={() => toggleUserStatus(u)}
            >
              {isInactive ? "Activate" : "Deactivate"}
            </button>
          </td>
        </tr>
      );
    })
  )}
</tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">{isEditMode ? "Edit User" : "Add New User"}</h2>
            <form className="modal-form" onSubmit={submitAddUser}>
              <div className="modal-content">
                <div className="name-row">
                  <div className="input-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleFormChange} />
                  </div>
                  <div className="input-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleFormChange} />
                  </div>
                </div>

                {!isEditMode && (
                  <div className="input-group">
                    <label>Email</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleFormChange} />
                  </div>
                )}

                <div className="password-position-row">
                  {!isEditMode && (
                    <div className="input-group">
                      <label>Password</label>
                      <div className="password-input-wrapper">
                        <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleFormChange} />
                        <button type="button" className="generate-btn" onClick={generatePassword}>Generate</button>
                      </div>
                    </div>
                  )}
                  <div className="input-group">
                    <label>Position</label>
                    <select name="position" value={formData.position} onChange={handleFormChange}>
                      <option value="Admin">Admin</option>
                      <option value="MP">Managing Partner (MP)</option>
                      <option value="AL">Agent Leader (AL)</option>
                      <option value="AP">Agent Partner (AP)</option>
                      <option value="MD">Managing Director (MD)</option>
                    </select>
                  </div>
                </div>

                {(formData.position === 'AP' || formData.position === 'AL') && (
                  <div className="input-group" style={{ marginTop: "10px" }}>
                    <label>Reports To (Supervisor)</label>
                    <select name="reportsTo" value={formData.reportsTo} onChange={handleFormChange} disabled={potentialUplines.length === 0}>
                      <option value="">{potentialUplines.length === 0 ? "No Supervisor Available" : "-- Select Supervisor --"}</option>
                      {potentialUplines.map((u) => (
                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.account_type})</option>
                      ))}
                    </select>
                  </div>
                )}

                {!isEditMode && (
                  <label className="switch-label">
                    <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                    <span className="switch"></span> Show Password
                  </label>
                )}

                {modalError && <p className="modal-error">{modalError}</p>}
                {successMsg && <p className="modal-success">{successMsg}</p>}
              </div>

              <div className="modal-buttons">
                <button type="button" className="modal-close" onClick={closeModal}>Back</button>
                <button type="submit" className="modal-submit" disabled={loading}>{isEditMode ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "700px" }}>
            <h2 className="modal-title">View User Details</h2>
            <div className="modal-content">
              <div className="name-row">
                <div className="input-group"><label>First Name</label><input type="text" value={viewingUser.first_name || ""} readOnly /></div>
                <div className="input-group"><label>Last Name</label><input type="text" value={viewingUser.last_name || ""} readOnly /></div>
              </div>
              <div className="name-row">
                <div className="input-group"><label>Email</label><input type="email" value={viewingUser.email || ""} readOnly /></div>
                <div className="input-group"><label>Position</label><input type="text" value={viewingUser.account_type || ""} readOnly /></div>
              </div>

              <div className="hierarchy-section">
                <h3>Hierarchy</h3>
                <div className="hierarchy-item">
                  <label className="hierarchy-label">Reports To</label>
                  <div className={`hierarchy-card ${!viewingSupervisor ? 'empty' : ''}`}>
                    {viewingSupervisor ? (
                      <>{viewingSupervisor.first_name} {viewingSupervisor.last_name} <span className="hierarchy-badge">{viewingSupervisor.account_type}</span></>
                    ) : <span>No supervisor assigned</span>}
                  </div>
                </div>

                <div className="hierarchy-item">
                  <label className="hierarchy-label">Direct Reports ({viewingSubordinates.length})</label>
                  {viewingSubordinates.length > 0 ? (
                    <div className="subordinates-list">
                      {viewingSubordinates.map((sub, idx) => (
                        <div key={idx} className="subordinate-item">
                          <span className="subordinate-name">{sub.first_name} {sub.last_name}</span>
                          <span className="subordinate-badge">{sub.account_type}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="hierarchy-card empty">No direct reports found</div>}
                </div>
              </div>
            </div>
            <div className="modal-buttons">
              <button type="button" className="modal-close" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;