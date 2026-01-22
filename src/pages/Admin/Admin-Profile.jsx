import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/Profile.css";
import LogoImage from "../../assets/logo1.png";

const AdminProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    Middle: "",
    gender: "",
    birthday: "",
    email: "",
    contact_number: "",
    Address: "",
    civil_status: "" 
  });

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("You need to login first");
        navigate("/");
        return;
      }

      const type = session.user.user_metadata?.account_type;
      if (!type || type.toLowerCase() !== "admin") {
        alert("You do not have access to this page");
        navigate("/");
        return;
      }

      setUser(session.user);
      fetchUserProfile(session.user.id);
    };

    checkAdmin();
  }, [navigate]);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        Middle: data.Middle || "",
        gender: data.gender || "",
        birthday: data.birthday || "",
        email: data.email || "",
        contact_number: data.contact_number || "",
        Address: data.Address || "",
        civil_status: data.civil_status || ""
      });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles")
      .update(formData)
      .eq("id", user.id);

    if (error) {
      alert("Error updating profile: " + error.message);
    } else {
      alert("Profile updated successfully!");
      setIsModalOpen(false);
      fetchUserProfile(user.id);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    try {
      // Step 1: Re-authenticate user by signing in again with old password
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.oldPassword,
      });

      if (reauthError) {
        alert("Verification failed: Current password is incorrect.");
        return;
      }

      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      alert("Password updated successfully!");
      setIsPasswordModalOpen(false);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
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
          <li onClick={() => navigate("/admin/ManageUsers")}>
            <i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}
          </li>
          <li onClick={() => navigate("/admin/policies")}>
            <i className="fa-solid fa-file-contract"></i> {sidebarOpen && <span>Policies</span>}
          </li>
        </ul>
      </aside>

      {/* HEADER */}
      <header className={`admin-header ${sidebarOpen ? "" : "expanded"}`}>
        <div className="admin-header-content">
          <h1>Admin Profile</h1>
          <div className="admin-header-user">
            <button className="admin-user-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div className="admin-user-avatar">
                <span className="admin-avatar-initials">
                  {profile?.last_name?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <span>{profile?.last_name || "Admin"} - Admin</span>
            </button>
            {showProfileMenu && (
              <div className="admin-profile-dropdown">
                <a onClick={() => navigate("/admin/Profile")} className="admin-dropdown-item">
                  <i className="fa-solid fa-user"></i> Profile
                </a>
                <a onClick={() => { setIsPasswordModalOpen(true); setShowProfileMenu(false); }} className="admin-dropdown-item">
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
      <main className={`admin-main-content ${sidebarOpen ? "" : "expanded"}`}>
        <div className="profile-card">
          <div className="profile-header">
            <h2>Personal Information</h2>
            <button className="update-btn" onClick={() => setIsModalOpen(true)}>
              Update Info
            </button>
          </div>

          <table className="profile-table">
            <tbody>
              <tr><td><strong>Last Name:</strong></td><td>{profile?.last_name || "N/A"}</td></tr>
              <tr><td><strong>First Name:</strong></td><td>{profile?.first_name || "N/A"}</td></tr>
              <tr><td><strong>Middle Name/Suffix:</strong></td><td>{profile?.Middle || "N/A"}</td></tr>
              <tr><td><strong>Gender:</strong></td><td>{profile?.gender || "N/A"}</td></tr>
              <tr><td><strong>Birthday:</strong></td><td>{profile?.birthday || "N/A"}</td></tr>
              <tr><td><strong>Email:</strong></td><td>{profile?.email || "N/A"}</td></tr>
              <tr><td><strong>Contact:</strong></td><td>{profile?.contact_number || "N/A"}</td></tr>
              <tr><td><strong>Address:</strong></td><td>{profile?.Address || "N/A"}</td></tr>
              <tr><td><strong>Civil Status:</strong></td><td>{profile?.civil_status || "N/A"}</td></tr>
            </tbody>
          </table>
        </div>

        {/* PROFILE UPDATE MODAL */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Update Profile Information</h3>
              <form onSubmit={handleUpdate} className="profile-form">
                <div className="form-grid">
                  <input type="text" placeholder="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                  <input type="text" placeholder="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                  <input type="text" placeholder="Middle Name" value={formData.Middle} onChange={(e) => setFormData({...formData, Middle: e.target.value})} />
                  
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <input type="date" value={formData.birthday} onChange={(e) => setFormData({...formData, birthday: e.target.value})} />
                  <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  <input type="text" placeholder="Contact Number" value={formData.contact_number} onChange={(e) => setFormData({...formData, contact_number: e.target.value})} />
                  <input type="text" placeholder="Address" value={formData.Address} onChange={(e) => setFormData({...formData, Address: e.target.value})} />
                  
                  <select value={formData.civil_status} onChange={(e) => setFormData({...formData, civil_status: e.target.value})}>
                    <option value="">Select Civil Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Annulled">Annulled</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="save-btn">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD MODAL */}
        {isPasswordModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content password-modal">
              <h3>Change Password</h3>
              <p className="modal-subtitle">Verify your current password to update security.</p>
              <form onSubmit={handleChangePassword}>
                <div className="password-form-stack">
                  <div className="input-group">
                    <label>Old Password</label>
                    <input 
                      type="password" 
                      placeholder="Current password" 
                      required 
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                    />
                  </div>
                  <hr className="password-divider" />
                  <div className="input-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      placeholder="Minimum 6 characters" 
                      required 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="Confirm new password" 
                      required 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                  <button type="submit" className="save-btn">Update Password</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminProfile;