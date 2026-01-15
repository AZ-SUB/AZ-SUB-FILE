import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import LogoImage from "../../assets/logo1.png";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState(0);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [users, setUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newSerialNumbers, setNewSerialNumbers] = useState(0);

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
      fetchTotalUsers();
      fetchUsers();
      fetchNewSerialNumbers();
    };

    checkAdmin();
  }, [navigate]);

  const fetchTotalUsers = async () => {
    try {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setTotalUsers(count || 0);
    } catch (err) {
      console.log("Profiles table missing. Defaulting to 1 admin.");
      setTotalUsers(1);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error.message);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchNewSerialNumbers = async () => {
    try {
      // Get serial numbers added in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      const { count, error } = await supabase
        .from("serial_number")
        .select("*", { count: "exact", head: true })
        .gte("date", sevenDaysAgoISO);

      if (error) {
        console.error("Error fetching new serial numbers:", error.message);
        setNewSerialNumbers(0);
      } else {
        setNewSerialNumbers(count || 0);
      }
    } catch (err) {
      console.error("Error fetching new serial numbers:", err);
      setNewSerialNumbers(0);
    }
  };

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
          <li className="active" onClick={() => navigate("/admin/dashboard")}>
            <i className="fa-solid fa-chart-line"></i> {sidebarOpen && <span>Dashboard</span>}
          </li>

          <li onClick={() => navigate("/admin/ManageUsers")}>
            <i className="fa-solid fa-users"></i> {sidebarOpen && <span>Manage Users</span>}
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
            <h1 className="title">Dashboard Overview</h1>
            <p className="subtitle">Welcome back, Admin 👋</p>
          </div>
        </div>

        {/* CARDS GRID */}
        <div className="admin-cards-grid">

          {/* Total Users */}
          <div className="admin-card">
            <div className="admin-card-icon user-icon">
              <i className="fa-solid fa-user-group"></i>
            </div>

            <div className="admin-card-info">
              <p className="admin-card-title">Total Users</p>
              <h2 className="admin-card-number">{totalUsers}</h2>
              <div className="bar-chart">
                <div className="bar" style={{ height: "85%", backgroundColor: "#003266" }}></div>
                <div className="bar" style={{ height: "70%", backgroundColor: "#0052a3" }}></div>
                <div className="bar" style={{ height: "90%", backgroundColor: "#003266" }}></div>
                <div className="bar" style={{ height: "65%", backgroundColor: "#0052a3" }}></div>
                <div className="bar" style={{ height: "80%", backgroundColor: "#003266" }}></div>
              </div>
            </div>
          </div>

          {/* New Serial Numbers */}
          <div className="admin-card admin-serial-card">
            <div className="admin-card-icon admin-serial-icon">
              <i className="fa-solid fa-barcode"></i>
              <div className="admin-icon-badge"></div>
            </div>

            <div className="admin-card-info">
              <p className="admin-card-title">New serial numbers added</p>
              <h2 className="admin-card-number">{newSerialNumbers}</h2>
              <p style={{ fontSize: "12px", color: "#999", marginTop: "5px", marginBottom: "10px" }}>Last 7 days</p>
              <div className="bar-chart">
                <div className="bar" style={{ height: "60%", backgroundColor: "#f4b43c" }}></div>
                <div className="bar" style={{ height: "75%", backgroundColor: "#f4b43c" }}></div>
                <div className="bar" style={{ height: "45%", backgroundColor: "#f4b43c" }}></div>
                <div className="bar" style={{ height: "90%", backgroundColor: "#f4b43c" }}></div>
                <div className="bar" style={{ height: "55%", backgroundColor: "#f4b43c" }}></div>
                <div className="bar" style={{ height: "70%", backgroundColor: "#f4b43c" }}></div>
                <div className="bar" style={{ height: "85%", backgroundColor: "#f4b43c" }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* USER TABLE */}
        <div className="admin-table-card" style={{ marginTop: "30px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "24px", fontWeight: "700", color: "#333" }}>Users List</h2>
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Email</th>
                <th>Position</th>
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
                    <td>{u.email}</td>
                    <td>{u.account_type}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
