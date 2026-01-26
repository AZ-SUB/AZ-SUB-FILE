import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import "./Style/ManageUsers.css?v=2.1";

import LogoImage from "../../assets/logo1.png";

const ManageUsers = () => {
  const navigate = useNavigate();

  // List Data
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null); // Admin session user
  const [statusFilter, setStatusFilter] = useState("Active");

  const filteredUsers = users.filter((u) => {
    const currentStatus = u.Status || "Active";
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
    reportsTo: "",
    appPassword: ""
  });

  // Hierarchy/View Data
  const [potentialUplines, setPotentialUplines] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingSupervisor, setViewingSupervisor] = useState(null);
  const [viewingSubordinates, setViewingSubordinates] = useState([]);

  // Messages
  const [modalError, setModalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Common Card Style for Hierarchy
  const cardStyle = {
    background: '#f8fafc',
    padding: '12px 15px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px'
  };

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
            app_password: formData.appPassword
          })
          .eq("id", editingUserId);
        if (error) throw error;
        setSuccessMsg("User updated successfully!");
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              account_type: formData.position
            },
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
          Status: "Active",
          app_password: formData.appPassword
        });
        if (profileError) throw profileError;
        setSuccessMsg("User created successfully!");
      }

      if (formData.reportsTo && userIdToProcess) {
        await supabase.from("user_hierarchy").update({ is_active: false }).eq("user_id", userIdToProcess);
        await supabase.from("user_hierarchy").insert({
          user_id: userIdToProcess,
          report_to_id: formData.reportsTo,
          assigned_by: user.id,
          is_active: true
        });
      }
      fetchUsers();
      setTimeout(() => closeModal(), 1500);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = async (u) => {
    setViewingUser(u);
    setShowViewModal(true);
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
      reportsTo: "",
      appPassword: u.app_password || ""
    });
    const { data } = await supabase.from("user_hierarchy").select("report_to_id").eq("user_id", u.id).eq("is_active", true).maybeSingle();
    if (data) setFormData(prev => ({ ...prev, reportsTo: data.report_to_id }));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowViewModal(false);
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({ firstName: "", lastName: "", email: "", password: "", position: "MP", reportsTo: "", appPassword: "" });
    setModalError("");
    setSuccessMsg("");
  };

  const toggleUserStatus = async (userItem) => {
    const currentStatus = userItem.Status || "Active";
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const actionText = newStatus === "Inactive" ? "deactivate" : "reactivate";
    if (window.confirm(`Are you sure you want to ${actionText} ${userItem.first_name} ${userItem.last_name}?`)) {
      const { error } = await supabase.from("profiles").update({ Status: newStatus }).eq("id", userItem.id);
      if (error) alert("Error: " + error.message);
      else fetchUsers();
    }
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
          <li className="active"><i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}</li>
          <li onClick={() => navigate("/admin/policies")}><i className="fa-solid fa-file-shield"></i> {sidebarOpen && <span>Policies</span>}</li>
        </ul>
      </aside>

      <header className={`admin-header ${sidebarOpen ? '' : expanded}`}>
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
                <button onClick={() => navigate("/admin/Profile")} className="admin-dropdown-item"><i className="fa-solid fa-user"></i> Profile</button>
                <button onClick={() => navigate("/admin/SerialNumber")} className="admin-dropdown-item"><i className="fa-solid fa-barcode"></i> Serial Numbers</button>
                <hr className="admin-dropdown-divider" />
                <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="admin-dropdown-item admin-logout-item">
                  <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={`admin-main-content ${sidebarOpen ? '' : 'expanded'}`}>
        <div className="header-row">
          <h1>Manage Users</h1>
          <div className="header-actions">
            <button className="add-btn" onClick={() => setStatusFilter(statusFilter === "Active" ? "Inactive" : "Active")}>
              <i className={`fa-solid ${statusFilter === "Active" ? "fa-user-slash" : "fa-user-check"}`}></i>
              {statusFilter === "Active" ? " View Inactive Users" : " View Active Users"}
            </button>
            <button className="add-btn" onClick={() => setShowModal(true)}>+ Add User</button>
          </div>
        </div>

        <div className="admin-table-card">
          <table className="admin-user-table">
            <thead>
              <tr><th>No.</th><th>Last Name</th><th>First Name</th><th>Position</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#888" }}>No {statusFilter.toLowerCase()} users found.</td></tr>
              ) : (
                filteredUsers.map((u, index) => (
                  <tr key={u.id}>
                    <td>{index + 1}</td>
                    <td>{u.last_name}</td>
                    <td>{u.first_name}</td>
                    <td>{u.account_type}</td>
                    <td>
                      <span className={`status-badge ${u.Status === "Inactive" ? "inactive" : "active"}`}>
                        {u.Status || "Active"}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button className="btn-view" onClick={() => openViewModal(u)}>View</button>
                      <button className="btn-update" onClick={() => openEditModal(u)}>Update</button>
                      <button className={u.Status === "Inactive" ? "btn-active-toggle" : "btn-delete"} onClick={() => toggleUserStatus(u)}>
                        {u.Status === "Inactive" ? "Activate" : "Deactivate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
{/* Add/Edit Modal */}
{showModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      {/* HEADER - Fixed */}
      <div className="modal-title" style={{ padding: '22px 35px', borderBottom: '1px solid var(--border-color)', background: '#f7f9fc' }}>
        {isEditMode ? "Edit User" : "Add New User"}
      </div>

      {/* BODY - Scrollable (Uses .modal-form for the hidden scrollbar) */}
      <form className="modal-form" onSubmit={submitAddUser} style={{ flex: 1, overflowY: 'auto' }}>
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

        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label>Email App Password</label>
          <input
            type="password"
            name="appPassword"
            value={formData.appPassword}
            onChange={handleFormChange}
            placeholder="App Password for SMTP"
          />
        </div>

        <div className="password-position-row">
          {!isEditMode && (
            <div className="input-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} readOnly />
                <button type="button" className="generate-btn" onClick={generatePassword}>Generate</button>
              </div>
            </div>
          )}
          <div className="input-group">
            <label>Position</label>
            <select name="position" value={formData.position} onChange={handleFormChange}>
              <option value="Admin">Admin</option>
              <option value="MP">Managing Partner (MP)</option>
              <option value="AL">Agency Leader (AL)</option>
              <option value="AP">Agency Partner (AP)</option>
              <option value="MD">Managing Director (MD)</option>
            </select>
          </div>
        </div>

        {(formData.position === 'AP' || formData.position === 'AL') && (
          <div className="input-group">
            <label>Reports To</label>
            <select name="reportsTo" value={formData.reportsTo} onChange={handleFormChange}>
              <option value="">-- Select Supervisor --</option>
              {potentialUplines.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
        )}

        {modalError && <p className="modal-error" style={{ color: 'var(--danger-color)', fontSize: '14px' }}>{modalError}</p>}
        {successMsg && <p className="modal-success" style={{ color: 'var(--success-color)', fontSize: '14px' }}>{successMsg}</p>}
      </form>

      {/* FOOTER - Fixed */}
      <div className="modal-buttons" style={{ padding: '18px 35px', borderTop: '1px solid var(--border-color)', background: '#f7f9fc' }}>
        <button type="button" className="modal-close" onClick={closeModal}>Back</button>
        <button type="submit" className="modal-submit" onClick={submitAddUser} disabled={loading}>
          {isEditMode ? "Update User" : "Create User"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* View Modal */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h2 className="modal-title">View User Details</h2></div>
            <div className="modal-form">
              <div className="name-row">
                <div className="input-group"><label>First Name</label><input type="text" value={viewingUser.first_name || ""} readOnly /></div>
                <div className="input-group"><label>Last Name</label><input type="text" value={viewingUser.last_name || ""} readOnly /></div>
              </div>
              <div className="name-row">
                <div className="input-group"><label>Email</label><input type="text" value={viewingUser.email || ""} readOnly /></div>
                <div className="input-group"><label>Position</label><input type="text" value={viewingUser.account_type || ""} readOnly /></div>
              </div>

              <div className="hierarchy-section" style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--primary-color)' }}>Hierarchy</h3>
                <div className="hierarchy-item" style={{ marginBottom: '20px' }}>
                  <label>Reports To</label>
                  <div style={cardStyle}>
                    {viewingSupervisor ? (
                      <><span>{viewingSupervisor.first_name} {viewingSupervisor.last_name}</span><span className="status-badge active">{viewingSupervisor.account_type}</span></>
                    ) : <span style={{ color: '#999' }}>No supervisor assigned</span>}
                  </div>
                </div>
                <div className="hierarchy-item">
                  <label>Direct Reports ({viewingSubordinates.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {viewingSubordinates.map((sub, idx) => (
                      <div key={idx} style={cardStyle}>
                        <span>{sub.first_name} {sub.last_name}</span>
                        <span className="status-badge active" style={{ fontSize: '10px' }}>{sub.account_type}</span>
                      </div>
                    ))}
                    {viewingSubordinates.length === 0 && <div style={cardStyle}><span style={{ color: '#999' }}>No direct reports found</span></div>}
                  </div>
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