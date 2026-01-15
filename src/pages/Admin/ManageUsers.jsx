import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import "./Style/ManageUsers.css?v=2";
import LogoImage from "../../assets/logo1.png";

const ManageUsers = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [position, setPosition] = useState("MP");

  const [modalError, setModalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [colleagues, setColleagues] = useState([]);
  const [availableColleagues, setAvailableColleagues] = useState([]);
  const [showAddColleague, setShowAddColleague] = useState(false);
  const [selectedColleague, setSelectedColleague] = useState("");

  useEffect(() => {
    fetchUsers();
    getUser();
  }, []);

  const getUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) setUser(session.user);
  };

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
  }, [showModal]);

  // Fetch users
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error.message);
    } else {
      setUsers(data || []);
    }
  };

  // Generate password with format: #+(First 2 letters of lastname Uppercase and lowercase)+8080
  const generatePassword = () => {
    if (!lastName.trim()) {
      setModalError("Please enter last name first");
      return;
    }

    const firstTwoLetters = lastName.substring(0, 2);
    const pwd = `#${firstTwoLetters.charAt(0).toUpperCase()}${firstTwoLetters.charAt(1).toLowerCase()}8080`;
    setPassword(pwd);
    setModalError("");
  };

  // Create user
  const submitAddUser = async (e) => {
    e.preventDefault();
    setModalError("");
    setSuccessMsg("");

    if (isEditMode) {
      // Update existing user in profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          account_type: position,
        })
        .eq("id", editingUserId);

      if (updateError) {
        setModalError(updateError.message);
        return;
      }

      setSuccessMsg("User updated successfully!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setPosition("MP");
      setIsEditMode(false);
      setEditingUserId(null);
      fetchUsers();
      setTimeout(() => setShowModal(false), 1000);
      return;
    }

    // Create new user
    // 1. Create Auth user
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            account_type: position,
          },
        },
      });

    if (authError) {
      setModalError(authError.message);
      return;
    }

    // 2. Insert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        account_type: position,
      });

    if (profileError) {
      setModalError(profileError.message);
      return;
    }

    // Reset
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPosition("MP");

    setSuccessMsg("User created successfully!");
    fetchUsers();
  };

  // Open modal for viewing
  const openViewModal = async (userToView) => {
    setViewingUser(userToView);
    setShowViewModal(true);
    await fetchColleagues(userToView.id);
    await fetchAvailableColleagues(userToView);
  };

  // Fetch colleagues for the viewing user
  const fetchColleagues = async (userId) => {
    try {
      // Assuming we have a colleagues/relationships table
      // For now, we'll filter by position hierarchy
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        // Get users in the same or related positions based on hierarchy
        const position = data.account_type;
        const hierarchy = {
          admin: ["MD", "MP", "AL", "AP"],
          MD: ["MP", "AL", "AP"],
          MP: ["AL", "AP"],
          AL: ["AP"],
          AP: []
        };

        const relatedPositions = hierarchy[position] || [];
        if (relatedPositions.length > 0) {
          const { data: colleaguesData, error: colleaguesError } = await supabase
            .from("profiles")
            .select("*")
            .in("account_type", relatedPositions)
            .neq("id", userId);

          if (!colleaguesError && colleaguesData) {
            setColleagues(colleaguesData);
          }
        } else {
          setColleagues([]);
        }
      }
    } catch (err) {
      console.error("Error fetching colleagues:", err);
      setColleagues([]);
    }
  };

  // Fetch available colleagues to add
  const fetchAvailableColleagues = async (currentUser) => {
    try {
      const hierarchy = {
        admin: ["MD", "MP", "AL", "AP"],
        MD: ["MP", "AL", "AP"],
        MP: ["AL", "AP"],
        AL: ["AP"],
        AP: []
      };

      const relatedPositions = hierarchy[currentUser.account_type] || [];
      if (relatedPositions.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("account_type", relatedPositions)
          .neq("id", currentUser.id);

        if (!error && data) {
          // Filter out already added colleagues
          const colleagueIds = colleagues.map(c => c.id);
          const available = data.filter(u => !colleagueIds.includes(u.id));
          setAvailableColleagues(available);
        }
      } else {
        setAvailableColleagues([]);
      }
    } catch (err) {
      console.error("Error fetching available colleagues:", err);
      setAvailableColleagues([]);
    }
  };

  // Add colleague
  const addColleague = async () => {
    if (!selectedColleague) return;

    try {
      const colleague = availableColleagues.find(c => c.id === selectedColleague);
      if (colleague) {
        setColleagues([...colleagues, colleague]);
        setAvailableColleagues(availableColleagues.filter(c => c.id !== selectedColleague));
        setSelectedColleague("");
        setShowAddColleague(false);

        // Here you would save to database if you have a relationships table
        // await supabase.from("user_relationships").insert({...});
      }
    } catch (err) {
      console.error("Error adding colleague:", err);
    }
  };

  // Remove colleague
  const removeColleague = (colleagueId) => {
    const removed = colleagues.find(c => c.id === colleagueId);
    if (removed) {
      setColleagues(colleagues.filter(c => c.id !== colleagueId));
      setAvailableColleagues([...availableColleagues, removed]);
    }
  };

  // Open modal for editing
  const openEditModal = (userToEdit) => {
    setIsEditMode(true);
    setEditingUserId(userToEdit.id);
    setFirstName(userToEdit.first_name);
    setLastName(userToEdit.last_name);
    setEmail(userToEdit.email);
    setPosition(userToEdit.account_type);
    setPassword("");
    setModalError("");
    setSuccessMsg("");
    setShowModal(true);
  };

  // Close modal and reset
  const closeModal = () => {
    setShowModal(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPosition("MP");
    setIsEditMode(false);
    setEditingUserId(null);
    setModalError("");
    setSuccessMsg("");
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
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
          <li className="active">
            <i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}
          </li>

        </ul>
      </aside>

      {/* Header */}
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
                <button onClick={() => navigate("/admin/SerialNumber")} className="admin-dropdown-item" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.5rem 1rem' }}>
                  <i className="fa-solid fa-barcode"></i> Serial Numbers
                </button>
                <button className="admin-dropdown-item" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.5rem 1rem' }}>
                  <i className="fa-solid fa-user"></i> Profile
                </button>
                <button className="admin-dropdown-item" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.5rem 1rem' }}>
                  <i className="fa-solid fa-lock"></i> Change Password
                </button>
                <hr className="admin-dropdown-divider" />
                <button onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }} className="admin-dropdown-item admin-logout-item" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.5rem 1rem' }}>
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
          <button className="add-btn" onClick={() => setShowModal(true)}>
            + Add User
          </button>
        </div>

        <div className="admin-table-card">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Position</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u, index) => (
                  <tr key={u.id}>
                    <td>{index + 1}</td>
                    <td>{u.last_name}</td>
                    <td>{u.first_name}</td>
                    <td>{u.account_type}</td>
                    <td className="action-cell">
                      <button className="btn-view" onClick={() => openViewModal(u)}>View</button>
                      <button className="btn-update" onClick={() => openEditModal(u)}>Update</button>
                      <button className="btn-delete">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">{isEditMode ? "Edit User" : "Add New User"}</h2>
            <form className="modal-form" onSubmit={submitAddUser}>
              <div className="modal-content">
                <div className="name-row">
                  <div className="input-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                {!isEditMode && (
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                {!isEditMode && (
                  <div className="password-position-row">
                    <div className="input-group">
                      <label>Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="generate-btn"
                          onClick={generatePassword}
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Position</label>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="MP">Managing Partner (MP)</option>
                        <option value="AL">Agent Leader (AL)</option>
                        <option value="AP">Agent Partner (AP)</option>
                        <option value="MD">Managing Director (MD)</option>
                      </select>
                    </div>
                  </div>
                )}

                {isEditMode && (
                  <div className="input-group">
                    <label>Position</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="MP">Managing Partner (MP)</option>
                      <option value="AL">Agent Leader (AL)</option>
                      <option value="AP">Agent Partner (AP)</option>
                      <option value="MD">Managing Director (MD)</option>
                    </select>
                  </div>
                )}

                {!isEditMode && (
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={() => setShowPassword(!showPassword)}
                    />
                    <span className="switch"></span>
                    Show Password
                  </label>
                )}

                {modalError && <p className="modal-error">{modalError}</p>}
                {successMsg && <p className="modal-success">{successMsg}</p>}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeModal}
                >
                  Back
                </button>
                <button type="submit" className="modal-submit">
                  {isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "900px" }}>
            <h2 className="modal-title">View User Details</h2>
            <div className="modal-content">
              <div className="name-row">
                <div className="input-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={viewingUser.first_name || ""}
                    readOnly
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={viewingUser.last_name || ""}
                    readOnly
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              </div>
              <div className="name-row">
                <div className="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={viewingUser.email || ""}
                    readOnly
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
                <div className="input-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={viewingUser.account_type || ""}
                    readOnly
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              {/* Position Hierarchy Section */}
              <div className="hierarchy-section" style={{ marginTop: "30px", paddingTop: "20px", borderTop: "2px solid #e5e5e5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>Position Hierarchy & Colleagues</h3>
                  <button
                    type="button"
                    className="generate-btn"
                    onClick={() => setShowAddColleague(!showAddColleague)}
                    style={{ padding: "8px 16px", fontSize: "13px" }}
                  >
                    <i className="fa-solid fa-plus"></i> Add Colleague
                  </button>
                </div>

                {/* Hierarchy Display */}
                <div className="hierarchy-display" style={{ marginBottom: "20px", padding: "15px", background: "#f9f9f9", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <strong style={{ color: "#003266" }}>Hierarchy:</strong>
                    <span style={{ fontSize: "14px", color: "#666" }}>
                      {viewingUser.account_type === "admin" && "Admin → MD → MP → AL → AP"}
                      {viewingUser.account_type === "MD" && "MD → MP → AL → AP"}
                      {viewingUser.account_type === "MP" && "MP → AL → AP"}
                      {viewingUser.account_type === "AL" && "AL → AP"}
                      {viewingUser.account_type === "AP" && "AP (No subordinates)"}
                    </span>
                  </div>
                </div>

                {/* Add Colleague Dropdown */}
                {showAddColleague && (
                  <div style={{ marginBottom: "20px", padding: "15px", background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px" }}>
                    <div className="input-group">
                      <label>Select Colleague to Add</label>
                      <select
                        value={selectedColleague}
                        onChange={(e) => setSelectedColleague(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="">-- Select a colleague --</option>
                        {availableColleagues.map((colleague) => (
                          <option key={colleague.id} value={colleague.id}>
                            {colleague.first_name} {colleague.last_name} ({colleague.account_type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="modal-submit"
                        onClick={addColleague}
                        disabled={!selectedColleague}
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="modal-close"
                        onClick={() => {
                          setShowAddColleague(false);
                          setSelectedColleague("");
                        }}
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Colleagues List */}
                <div className="colleagues-list">
                  <label style={{ marginBottom: "10px", display: "block", fontWeight: "600", color: "#333" }}>
                    Colleagues ({colleagues.length})
                  </label>
                  {colleagues.length === 0 ? (
                    <p style={{ color: "#999", fontStyle: "italic", padding: "20px", textAlign: "center", background: "#f9f9f9", borderRadius: "8px" }}>
                      No colleagues added yet. Click "Add Colleague" to add one.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {colleagues.map((colleague) => (
                        <div
                          key={colleague.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 15px",
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: "8px"
                          }}
                        >
                          <div>
                            <strong style={{ color: "#333" }}>
                              {colleague.first_name} {colleague.last_name}
                            </strong>
                            <span style={{ marginLeft: "10px", color: "#666", fontSize: "13px" }}>
                              ({colleague.account_type})
                            </span>
                            <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                              {colleague.email}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeColleague(colleague.id)}
                            style={{
                              background: "#ff4b4b",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              transition: "all 0.3s ease"
                            }}
                            onMouseOver={(e) => e.target.style.background = "#ff2222"}
                            onMouseOut={(e) => e.target.style.background = "#ff4b4b"}
                          >
                            <i className="fa-solid fa-trash"></i> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-buttons">
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingUser(null);
                  setColleagues([]);
                  setAvailableColleagues([]);
                  setShowAddColleague(false);
                  setSelectedColleague("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
