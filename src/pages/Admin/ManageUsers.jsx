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

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [position, setPosition] = useState("MP");

  // Hierarchy State
  const [reportsTo, setReportsTo] = useState("");
  const [potentialUplines, setPotentialUplines] = useState([]);

  const [modalError, setModalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [viewingUser, setViewingUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSupervisor, setViewingSupervisor] = useState(null);
  const [viewingSubordinates, setViewingSubordinates] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [availableColleagues, setAvailableColleagues] = useState([]);
  const [showAddColleague, setShowAddColleague] = useState(false);
  const [selectedColleague, setSelectedColleague] = useState("");

  useEffect(() => {
    fetchUsers();
    getUser();
  }, []);

  useEffect(() => {
    if (position) {
      fetchPotentialUplines(position, editingUserId);
    }
  }, [position, editingUserId]);

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

  // Fetch Potential Uplines based on Position
  const fetchPotentialUplines = async (role, excludeUserId = null) => {
    let uplineRole = "";
    if (role === "AP") uplineRole = "AL";
    else if (role === "AL") uplineRole = "MP";
    // MPs do not report to MDs, and MDs do not report to anyone in this flow

    if (!uplineRole) {
      setPotentialUplines([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, account_type")
        .eq("account_type", uplineRole);

      if (error) throw error;

      // Filter out the current user being edited to prevent self-assignment
      let filteredData = data || [];
      if (excludeUserId) {
        filteredData = filteredData.filter(u => u.id !== excludeUserId);
      }

      setPotentialUplines(filteredData);
    } catch (err) {
      console.error("Error fetching uplines:", err.message);
    }
  };

  // Fetch current supervisor for a user (for Edit mode)
  const fetchCurrentUpline = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("user_hierarchy")
        .select("report_to_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error("Error fetching current upline:", error);
      }

      if (data) {
        setReportsTo(data.report_to_id);
      } else {
        setReportsTo("");
      }
    } catch (err) {
      console.error("Error fetching current upline:", err);
    }
  };

  // Fetch hierarchy details for View mode
  const fetchViewHierarchy = async (userId) => {
    setViewingSupervisor(null);
    setViewingSubordinates([]);

    try {
      // 1. Get Supervisor
      const { data: uptimeData, error: uptimeError } = await supabase
        .from("user_hierarchy")
        .select(`
                report_to_id,
                profiles:report_to_id (first_name, last_name, account_type)
            `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!uptimeError && uptimeData && uptimeData.profiles) {
        // Handle potential array return from Supabase
        const profileData = Array.isArray(uptimeData.profiles) ? uptimeData.profiles[0] : uptimeData.profiles;
        setViewingSupervisor(profileData);
      }

      // 2. Get Subordinates
      const { data: downlineData, error: downlineError } = await supabase
        .from("user_hierarchy")
        .select(`
                user_id,
                profiles:user_id (first_name, last_name, account_type)
            `)
        .eq("report_to_id", userId)
        .eq("is_active", true);

      if (!downlineError && downlineData) {
        const subs = downlineData.map(d => {
          const p = d.profiles;
          return Array.isArray(p) ? p[0] : p;
        }).filter(Boolean);
        setViewingSubordinates(subs);
      }

    } catch (err) {
      console.error("Error fetching view hierarchy:", err);
    }
  };

  // Generate password
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

  // Create or Update user
  const submitAddUser = async (e) => {
    e.preventDefault();
    setModalError("");
    setSuccessMsg("");

    try {
      let userIdToProcess = editingUserId;

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

        if (updateError) throw updateError;
        setSuccessMsg("User updated successfully!");

      } else {
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

        if (authError) throw authError;

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

        if (profileError) throw profileError;

        userIdToProcess = authData.user.id;
        setSuccessMsg("User created successfully!");
      }

      // Handle Hierarchy (Reports To)
      // Only if a supervisor is selected and we have a valid userId
      if (reportsTo && userIdToProcess) {
        // First, deactivate any existing active relationship for this user
        await supabase
          .from("user_hierarchy")
          .update({ is_active: false })
          .eq("user_id", userIdToProcess);

        // Insert new relationship
        const { error: hierarchyError } = await supabase
          .from("user_hierarchy")
          .insert({
            user_id: userIdToProcess,
            report_to_id: reportsTo,
            assigned_at: new Date().toISOString(),
            assigned_by: user.id, // Current admin ID
            is_active: true
          });

        if (hierarchyError) {
          console.error("Hierarchy error details:", hierarchyError);
          throw new Error("User saved, but failed to assign supervisor: " + hierarchyError.message);
        }
      }

      // Reset and Fetch
      if (!isEditMode) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setPosition("MP");
        setReportsTo("");
      }

      fetchUsers();
      setTimeout(() => {
        if (isEditMode) closeModal();
      }, 1500);

    } catch (err) {
      setModalError(err.message);
    }
  };

  // Open modal for viewing
  const openViewModal = async (userToView) => {
    setViewingUser(userToView);
    setShowViewModal(true);
    await fetchViewHierarchy(userToView.id);
    // Old colleague-related calls removed
    // await fetchColleagues(userToView.id);
    // await fetchAvailableColleagues(userToView);
  };

  // Fetch colleagues for the viewing user
  const fetchColleagues = async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
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
  const openEditModal = async (userToEdit) => {
    setIsEditMode(true);
    setEditingUserId(userToEdit.id);
    setFirstName(userToEdit.first_name);
    setLastName(userToEdit.last_name);
    setEmail(userToEdit.email);
    setPosition(userToEdit.account_type);
    setPassword("");
    setModalError("");
    setSuccessMsg("");

    // Fetch hierarchy info
    await fetchPotentialUplines(userToEdit.account_type, userToEdit.id);
    await fetchCurrentUpline(userToEdit.id);

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
    setReportsTo("");
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

                <div className="password-position-row">
                  {!isEditMode ? (
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
                  ) : null}

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

                {/* Reports To Section - Only show for AP and AL */}
                {(position === 'AP' || position === 'AL') && (
                  <div className="input-group" style={{ marginTop: "10px" }}>
                    <label>Reports To (Supervisor)</label>
                    <select
                      value={reportsTo}
                      onChange={(e) => setReportsTo(e.target.value)}
                      disabled={potentialUplines.length === 0}
                    >
                      <option value="">
                        {potentialUplines.length === 0 ? "No Supervisor Required/Available" : "-- Select Supervisor --"}
                      </option>
                      {potentialUplines.map((upline) => (
                        <option key={upline.id} value={upline.id}>
                          {upline.first_name} {upline.last_name} ({upline.account_type})
                        </option>
                      ))}
                    </select>
                    {potentialUplines.length === 0 && (
                      <small style={{ color: '#999', marginTop: '5px' }}>
                        No eligible supervisors found for {position}
                      </small>
                    )}
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
          <div className="modal-box" style={{ maxWidth: "700px" }}>
            <h2 className="modal-title">View User Details</h2>
            <div className="modal-content">
              <div className="name-row">
                <div className="input-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={viewingUser.first_name || ""}
                    readOnly
                  />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={viewingUser.last_name || ""}
                    readOnly
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
                  />
                </div>
                <div className="input-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={viewingUser.account_type || ""}
                    readOnly
                  />
                </div>
              </div>

              {/* Hierarchy Section */}
              <div className="hierarchy-section">
                <h3>Hierarchy</h3>

                {/* Supervisor */}
                <div className="hierarchy-item">
                  <label className="hierarchy-label">Reports To</label>
                  <div className={`hierarchy-card ${!viewingSupervisor ? 'empty' : ''}`}>
                    {viewingSupervisor ? (
                      <>
                        {viewingSupervisor.first_name} {viewingSupervisor.last_name}
                        <span className="hierarchy-badge">
                          {viewingSupervisor.account_type}
                        </span>
                      </>
                    ) : (
                      <span>No supervisor assigned</span>
                    )}
                  </div>
                </div>

                {/* Subordinates */}
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
                  ) : (
                    <div className="hierarchy-card empty">
                      No direct reports found
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
                  setViewingSupervisor(null);
                  setViewingSubordinates([]);
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
