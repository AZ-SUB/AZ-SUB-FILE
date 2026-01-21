import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import "./Style/AdminLayout.css";
import "./Style/SerialNumber.css?v=2.3";
import LogoImage from "../../assets/logo1.png";


const AdminSe1rialNumber = () => {
  const navigate = useNavigate();

  const [totalUsers, setTotalUsers] = useState(0);
  const [serial_numbers, setserial_numbers] = useState([]);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  // ===== CARD COUNTS =====
  const [unusedDefault, setUnusedDefault] = useState(0);
  const [unusedAllianz, setUnusedAllianz] = useState(0);
  const [usedSerials, setUsedSerials] = useState(0);
// Add this with your other useState hooks
  const [filterType, setFilterType] = useState("All");
  // ===== IMPORT =====
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [serial_type, setserial_type] = useState("Default");

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState(null);
  // ===== SORTING =====
  const [sortField, setSortField] = useState(null); // 'is_issued' or 'serial_type'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("You need to login first");
        navigate("/");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", session.user.id)
        .single();

      if (error || profile?.account_type?.toLowerCase() !== "admin") {
        alert("Access denied");
        navigate("/");
        return;
      }

      setUser(session.user);
      await fetchTotalUsers();
      await fetchserial_numbers();
      await fetchSerialCardCounts();
    };

    checkAdmin();
  }, [navigate]);

  /* ================= COUNTS ================= */
  const fetchTotalUsers = async () => {
    const { count, error } = await supabase
      .from("serial_number")
      .select("*", { count: "exact", head: true });

    if (error) console.error(error);
    setTotalUsers(count || 0);
  };

  const fetchSerialCardCounts = async () => {
    const { count: defaultUnused } = await supabase
      .from("serial_number")
      .select("*", { count: "exact", head: true })
      .is("Confirm", null)
      .eq("serial_type", "Default");

    const { count: allianzUnused } = await supabase
      .from("serial_number")
      .select("*", { count: "exact", head: true })
      .is("Confirm", null)
      .eq("serial_type", "Allianz Well");

    const { count: used } = await supabase
      .from("serial_number")
      .select("*", { count: "exact", head: true })
      .eq("is_issued", true);

    setUnusedDefault(defaultUnused || 0);
    setUnusedAllianz(allianzUnused || 0);
    setUsedSerials(used || 0);
  };

  /* ================= TABLE ================= */
  const fetchserial_numbers = async () => {
    const { data, error } = await supabase
      .from("serial_number")
      .select("*")
      .order("date", { ascending: false });

    if (error) console.error(error);
  else setserial_numbers(data || []);

  };

  /* ================= IMPORT ================= */
  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true)
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const lines = e.target.result.split("\n").filter(line => line.trim());
        if (lines.length <= 1) throw new Error("CSV is empty or invalid");

        const { data: existingData } = await supabase
          .from("serial_number")
          .select("serial_number");

        const existingSerials = existingData
          ? existingData.map(d => Number(d.serial_number))
          : [];

        const payload = lines.slice(1)
          .map(row => {
            const [serial] = row.split(",");
            const serialNum = Number(serial);

            if (!serialNum || existingSerials.includes(serialNum)) return null;

            return {
              serial_number: serialNum,
              is_issued: null,
              Confirm: null,
              ResponseID: null,
              serial_type: serial_type,
              date: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (!payload.length) {
          alert("All serial numbers already exist.");
          return;
        }

        const { error } = await supabase
          .from("serial_number")
          .insert(payload);

        if (error) throw error;

        await fetchserial_numbers();
        await fetchTotalUsers();
        await fetchSerialCardCounts();

        setShowImportModal(false);
        setSelectedFile(null);
        setserial_type("Default");
        alert("Import successful ✅");

      } catch (err) {
        alert(err.message || "Import failed ❌");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsText(selectedFile);
  };

/* ================= VIEW MODAL LOGIC ================= */  const handleView = (serial) => {
  setSelectedSerial(serial);
   setShowViewModal(true);
  }
  /* ================= LOGOUT ================= */
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    
    <div className="admin-container">
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
          <li className="active" onClick={() => navigate("/admin/SerialNumber")}>
            <i className="fa-solid fa-barcode"></i> {sidebarOpen && <span>Serial Numbers</span>}
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

      <main className={`admin-main-content ${sidebarOpen ? '' : 'expanded'}`}>

        {/* ================= CARDS ================= */}
        <div className="admin-cards-grid">
          <div className="admin-card">
            <p>Total Serial Numbers</p>
            <h2>{totalUsers}</h2>
          </div>

          <div className="admin-card">
            <p>Unused (Default)</p>
            <h2>{unusedDefault}</h2>
          </div>

          <div className="admin-card">
            <p>Unused (Allianz Well)</p>
            <h2>{unusedAllianz}</h2>
          </div>

          <div className="admin-card used">
            <p>Used Serials</p>
            <h2>{usedSerials}</h2>
          </div>
        </div>

        {/* ================= TABLE ================= */}
<div className="table-header">
          <h3>Serial Numbers</h3>
          <button className="import-btn" onClick={() => setShowImportModal(true)}>
            Import CSV
          </button>
        </div>

        {/* ================= FILTER CONTROLS ================= */}
        {/* Removed redundant nested divs and reduced bottom margin */}
        <div className="filter-button-group" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          {["All", "Default", "Allianz Well", "Manual"].map((type) => (
            <button
              key={type}
              className={`filter-btn ${filterType === type ? "active" : ""}`}
              onClick={() => {
                setFilterType(type);
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                borderRadius: "4px",
                border: "1px solid #ddd",
                backgroundColor: filterType === type ? "#003266" : "#fff",
                color: filterType === type ? "#fff" : "#333",
                fontWeight: filterType === type ? "600" : "normal",
                transition: "all 0.3s ease",
                boxShadow: filterType === type ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
              }}
            >
              {type === "All" ? "Show All" : type}
            </button>
          ))}
        </div>
        <div className="table-container">
          <table className="serial-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Serial Number</th>
                <th>Confirm</th>
                <th>Issued</th>
                <th>Response ID</th>
                <th>Serial Type</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
<tbody>
  {(() => {
    // 1. First, Filter the data based on your buttons (All, Default, Allianz, etc.)
    const filteredData = serial_numbers.filter((item) => {
      if (filterType === "All") return true;
      return item.serial_type === filterType;
    });

    // 2. Second, Sort the filtered data
    const sortedData = [...filteredData].sort((a, b) => {
      if (!sortField) return 0;
      let aValue, bValue;
      if (sortField === "is_issued") {
        aValue = a.is_issued ? 1 : 0;
        bValue = b.is_issued ? 1 : 0;
      } else if (sortField === "serial_type") {
        aValue = (a.serial_type || "").toLowerCase();
        bValue = (b.serial_type || "").toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // 3. Third, Calculate Pagination for the 10 records
    const recordsPerPage = 10;
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRecords = sortedData.slice(firstIndex, lastIndex);

    // 4. Render Logic
    if (currentRecords.length === 0) {
      return (
        <tr>
          <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No records found for "{filterType}"
          </td>
        </tr>
      );
    }

    return currentRecords.map((item, index) => (
      <tr key={item.serial_id || index}>
        {/* We use firstIndex + index + 1 so that Page 2 starts at 17, 18, etc. */}
        <td>{firstIndex + index + 1}</td>
        <td>{item.serial_number}</td>
        <td>{item.Confirm ? "Yes" : "-"}</td>
        <td>{item.is_issued ? "Yes" : "-"}</td>
        <td>{item.ResponseID || "-"}</td>
        <td>
          <span className={`type-badge ${item.serial_type?.replace(/\s+/g, '-').toLowerCase()}`}>
            {item.serial_type}
          </span>
        </td>
        <td>{new Date(item.date).toLocaleString()}</td>
        <td>
          <button className="view-btn" onClick={() => handleView(item)}>
            View
          </button>
        </td>
      </tr>
    ));
  })()}
</tbody>
          </table>
        </div>
        {/* ================= PAGINATION CONTROLS ================= */}
<div className="pagination-wrapper">
  {/* Previous Button */}
  <button 
    className="pagination-arrow-btn" 
    disabled={currentPage === 1}
    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
  >
    <i className="fa-solid fa-chevron-left">Back</i>
  </button>

  <div className="pagination-info">
    <span className="current-page-text">Page {currentPage}</span>
    <span className="total-pages-text">of {Math.ceil(
      serial_numbers.filter(i => filterType === "All" || i.serial_type === filterType).length / 16
    ) || 1}</span>
  </div>

  {/* Next Button */}
  <button 
    className="pagination-arrow-btn"
    disabled={currentPage >= Math.ceil(
      serial_numbers.filter(i => filterType === "All" || i.serial_type === filterType).length / 16
    )}
    onClick={() => setCurrentPage(prev => prev + 1)}
  >
    {/* This adds the arrow icon */}
    <i className="fa-solid fa-chevron-right">Next</i>
  </button>
</div>
        {/* ================= MODAL ================= */}
        {showViewModal && selectedSerial && (
  <div className="modal-overlay">
    <div className="modal" style={{ width: "450px" }}> {/* Slightly wider for better table fit */}
      <h2>Serial Tracking</h2>
      <div style={{ marginBottom: "15px", fontSize: "14px", lineHeight: "1.6" }}>
        <p><strong>Serial Number:</strong> {selectedSerial.serial_number}</p>
        <p><strong>Serial Type:</strong> {selectedSerial.serial_type}</p>
        <p><strong>Requested by:</strong> {selectedSerial.ResponseID || "Not yet taken"}</p>
        <p><strong>Request Date:</strong> {new Date(selectedSerial.date).toLocaleDateString()}</p>
      </div>
      <hr style={{ border: "0.5px solid #eee", margin: "15px 0" }} />
      <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Tracking Status</h3>
      <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "14px" }}>
        <li style={{ marginBottom: "8px" }}>
          <span style={{ color: "var(--success-color)", marginRight: "10px" }}>●</span>
          <strong>Serial Created:</strong> {new Date(selectedSerial.date).toLocaleString()}
        </li>
        <li style={{ marginBottom: "8px" }}>
          <span style={{ color: selectedSerial.is_issued ? "var(--success-color)" : "#ccc", marginRight: "10px" }}>●</span>
          <strong>Serial confirm:</strong> {selectedSerial.is_issued ? "Confirmed" : "In Progress"}
        </li>
        <li style={{ marginBottom: "8px" }}>
          <span style={{ color: selectedSerial.ResponseID ? "var(--success-color)" : "#ccc", marginRight: "10px" }}>●</span>
          <strong>Serial Issued:</strong> {selectedSerial.ResponseID ? "Completed" : "Pending"}
        </li>
      </ul>
      <hr style={{ border: "0.5px solid #eee", margin: "15px 0" }} />
      <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Submitted File</h3>
      <table className="serial-table" style={{ fontSize: "13px" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>File Name</th>
            <th style={{ textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              <i className="fa-solid fa-file-pdf" style={{ color: "#e74c3c", marginRight: "8px" }}></i>
              {`Attachment_${selectedSerial.serial_number}.pdf`}
            </td>
            <td style={{ textAlign: "right" }}>
              <button className="view-btn" style={{ padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="modal-buttons" style={{ marginTop: "20px" }}>
        <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

        {showImportModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Import CSV</h2>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />

              <label>Serial Type</label>
              <select
                value={serial_type}
                onChange={(e) => setserial_type(e.target.value)}
                className="file-type-select"
              >
                <option value="Default">Default</option>
                <option value="Allianz Well">Allianz Well</option>
              </select>

              <div className="modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
};



export default AdminSe1rialNumber;