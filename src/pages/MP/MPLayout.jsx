// MPLayout.jsx - Admin-styled layout for Management Partners
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './MP_Styles.css';
import sidebarLogo from '../../assets/logo1.png';
import topLogo from '../../assets/2.png';

const MPLayout = ({ children, title = 'Dashboard' }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userRole } = useApp();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const mpMenuItems = [
        {
            path: '/mp/dashboard',
            label: 'Dashboard',
            icon: <i className="fa-solid fa-chart-line"></i>
        },
        {
            path: '/mp/al-performance',
            label: 'Agent Leaders',
            icon: <i className="fa-solid fa-users"></i>
        },
        {
            path: '/mp/ap-performance',
            label: 'Agent Partners',
            icon: <i className="fa-solid fa-user-group"></i>
        }
    ];

    const handleLogout = async () => {
        localStorage.removeItem('mpData');
        navigate('/');
    };

    return (
        <div className="mp-layout">
            {/* SIDEBAR */}
            <aside className={`mp-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                <button
                    className="mp-sidebar-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <i className="fa-solid fa-bars"></i>
                </button>

                <div className="sidebar-header">
                    <Link to="/mp/dashboard" className="sidebar-logo" title="MP Dashboard">
                        {sidebarOpen ? (
                            <img src={sidebarLogo} alt="Caelum Logo" className="sidebar-logo-img" />
                        ) : (
                            <img src={sidebarLogo} alt="C" className="sidebar-logo-img collapsed" />
                        )}
                    </Link>
                </div>

                <div className="sidebar-menu">
                    {mpMenuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <div className="sidebar-icon">{item.icon}</div>
                            {sidebarOpen && <span>{item.label}</span>}
                        </Link>
                    ))}
                </div>

                <div className="sidebar-footer">
                    {/* Optional footer content if needed */}
                </div>
            </aside>

            {/* HEADER */}
            <header className={`mp-header ${sidebarOpen ? '' : 'expanded'}`}>
                <div className="mp-header-content">
                    <div className="header-left">
                        {sidebarOpen && <h1 className="header-title-inline">{title}</h1>}
                    </div>

                    <div className="header-center-logo">
                        {!sidebarOpen && (
                            <img src={topLogo} alt="Logo" className="header-logo-img" />
                        )}
                    </div>

                    <div className="mp-header-user">
                        <button
                            className="mp-user-profile-btn"
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <div className="mp-user-avatar">
                                {currentUser?.name ? (
                                    <span>{currentUser.name.charAt(0).toUpperCase()}</span>
                                ) : (
                                    <i className="fa-solid fa-user"></i>
                                )}
                            </div>
                            <span>{currentUser?.name || 'Management Partner'} - {userRole || 'MP'}</span>
                        </button>

                        {showProfileMenu && (
                            <div className="mp-profile-dropdown">
                                <div className="mp-dropdown-item">
                                    <i className="fa-solid fa-user"></i> Profile
                                </div>
                                <hr className="mp-dropdown-divider" />
                                <button onClick={handleLogout} className="mp-dropdown-item mp-logout-item">
                                    <i className="fa-solid fa-right-from-bracket"></i> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
                <div className="container">
                    {/* Page Title - Only when Sidebar Closed */}
                    {!sidebarOpen && (
                        <div className="mp-dashboard-header">
                            <h1>{title}</h1>
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MPLayout;