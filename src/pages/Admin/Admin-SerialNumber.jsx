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



  // ===== CARD COUNTS =====

  const [unusedDefault, setUnusedDefault] = useState(0);

  const [unusedAllianz, setUnusedAllianz] = useState(0);

  const [usedSerials, setUsedSerials] = useState(0);



  // ===== IMPORT =====
  // ===== NEW POLICY MODAL STATES =====
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [newPolicyData, setNewPolicyData] = useState({
    serial_number: "",
    serial_type: ""
  });
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

        navigate("/login");

        return;

      }



      const { data: profile, error } = await supabase

        .from("profiles")

        .select("account_type")

        .eq("id", session.user.id)

        .single();



      if (error || profile?.account_type?.toLowerCase() !== "admin") {

        alert("Access denied");

        navigate("/login");

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

    setUploading(true);



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


/* ================= ADD NEW POLICY ================= */
  const handleAddPolicy = async () => {
    if (!newPolicyData.serial_number) {
      alert("Please enter a Serial Number");
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from("serial_number")
        .insert([
          {
            serial_number: Number(newPolicyData.serial_number),
            serial_type: newPolicyData.serial_type.trim() === "" ? "Default" : newPolicyData.serial_type,
            is_issued: null,
            Confirm: null,
            date: new Date().toISOString(),
          }
        ]);

      if (error) throw error;

      alert("Policy added successfully! ✅");
      setShowPolicyModal(false); // Close modal
      setNewPolicyData({ serial_number: "", serial_type: "" }); // Reset form
      
      // Refresh the list and counts
      await fetchserial_numbers();
      await fetchTotalUsers();
      await fetchSerialCardCounts();

    } catch (err) {
      alert(err.message || "Failed to add policy");
    } finally {
      setUploading(false);
    }
  };
  /* ================= LOGOUT ================= */

  const logout = async () => {

    await supabase.auth.signOut();

    navigate("/");

  };

  const handleView = (serial) => {

  setSelectedSerial(serial);

  setShowViewModal(true);

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

          <li className="active">

            <i className="fa-solid fa-barcode"></i> {sidebarOpen && <span>Serial Numbers</span>}

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
  <div style={{ display: "flex", gap: "10px" }}>
    {/* NEW ADD POLICY BUTTON */}
    <button 
      className="import-btn" 
      style={{ backgroundColor: "var(--success-color)" }} 
      onClick={() => setShowPolicyModal(true)}
    >
      Add New Policy
    </button>
    
    <button className="import-btn" onClick={() => setShowImportModal(true)}>
      Import CSV
    </button>
  </div>
</div>



        {/* ================= SORTING BUTTONS ================= */}

        <div className="table-controls" style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>

          <button onClick={() => handleSort("is_issued")}>

            Sort is_issued {sortField === "is_issued" ? (sortOrder === "asc" ? "↑" : "↓") : ""}

          </button>



          <button onClick={() => handleSort("serial_type")}>

            Sort Type {sortField === "serial_type" ? (sortOrder === "asc" ? "↑" : "↓") : ""}

          </button>

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

  {serial_numbers.length ?

    serial_numbers

      .sort((a, b) => {

        if (!sortField) return 0;

        let aValue, bValue;



        if (sortField === "is_issued") {

          aValue = a.is_issued ? 1 : 0;

          bValue = b.is_issued ? 1 : 0;

        } else if (sortField === "serial_type") {

          aValue = a.serial_type.toLowerCase();

          bValue = b.serial_type.toLowerCase();

        }



        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;

        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;

        return 0;

      })

      .map((item, index) => (

        <tr key={item.serial_id}>

          <td>{index + 1}</td>

          <td>{item.serial_number}</td>

          <td>{item.is_issued ? "Yes" : ""}</td>

          <td>{item.Confirm ? "Yes" : ""}</td>

          <td>{item.ResponseID || "-"}</td>

          <td>{item.serial_type}</td>

          <td>{new Date(item.date).toLocaleString()}</td>

          <td>

            <button className="view-btn" onClick={() => handleView(item)}>

              View

            </button>

          </td>

        </tr>

      ))

    :

    (

      <tr>

        <td colSpan="8">No data available</td>

      </tr>

    )

  }

</tbody>



          </table>

        </div>



        {/* ================= MODAL ================= */}





{/* ================= VIEW MODAL ================= */}

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
{/* ================= ADD NEW POLICY MODAL ================= */}
{showPolicyModal && (
  <div className="modal-overlay">
    <div className="modal">
      <h2>Add New Policy</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
          Policy / Serial Number
        </label>
        <input
          type="number"
          placeholder="Enter Serial Number"
          value={newPolicyData.serial_number}
          onChange={(e) => setNewPolicyData({ ...newPolicyData, serial_number: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
          Serial Type
        </label>
        <input
          type="text"
          placeholder="Leave blank for 'Default'"
          value={newPolicyData.serial_type}
          onChange={(e) => setNewPolicyData({ ...newPolicyData, serial_type: e.target.value })}
        />
        <small style={{ color: '#888' }}>If left blank, it will be saved as "Default"</small>
      </div>

      <div className="modal-buttons">
        <button 
          className="cancel-btn" 
          onClick={() => {
            setShowPolicyModal(false);
            setNewPolicyData({ serial_number: "", serial_type: "" });
          }}
        >
          Cancel
        </button>
        <button 
          className="submit-btn" 
          onClick={handleAddPolicy} 
          disabled={uploading}
        >
          {uploading ? "Saving..." : "Confirm"}
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