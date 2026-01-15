import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import LogoImage from "../../assets/logo1.png";

const AdminPolicies = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
    };

    checkAdmin();
  }, [navigate]);

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

           <li className="active" onClick={() => navigate("/admin/policies")}>
             <i className="fa-solid fa-file-contract"></i> {sidebarOpen && <span>Policies</span>}
           </li>
        </ul>
      </aside>

      {/* HEADER */}
      <header className={`admin-header ${sidebarOpen ? '' : 'expanded'}`}>
        <div className="admin-header-content">
          <h1>Admin Policies</h1>
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
                <a onClick={() => navigate("/admin/SerialNumber")} className="admin-dropdown-item">
                  <i className="fa-solid fa-barcode"></i> Serial Numbers
                </a>
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
        <div className="header-row">
          <div>
            <h1 className="title">Policy Management</h1>
            <p className="subtitle">Manage system policies and configurations.</p>
          </div>
        </div>
        
        <div className="admin-card">
           <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              <h3>Work in Progress</h3>
              <p>This page is currently under implementation.</p>
           </div>
        </div>

      </main>
    </div>
  );
};

export default AdminPolicies;
