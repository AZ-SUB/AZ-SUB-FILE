// MPLayout.jsx - MP-specific layout wrapper
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './MP_Styles.css';

const MPLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userRole } = useApp();
    const isMPPage = location.pathname.startsWith('/mp');

    const mpMenuItems = [
        {
            path: '/mp/dashboard',
            label: 'Dashboard',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            )
        },
        {
            path: '/mp/al-performance',
            label: 'Agent Leaders',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            )
        },
        {
            path: '/mp/ap-performance',
            label: 'Agent Partners',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            )
        }
    ];

    const handleLogout = async () => {
        // Clear MP-specific data
        localStorage.removeItem('mpData');
        navigate('/');
    };

    return (
        <div className="mp-layout">
            <div className="app-layout-wrapper">
                {/* MP Sidebar */}
                <div className="mp-sidebar">
                    <div className="sidebar-header">
                        <Link to="/mp/dashboard" className="sidebar-logo" title="MP Dashboard">
                            CAELUM
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
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="sidebar-footer">
                        <div className="mp-user-info">
                            <div className="mp-user-avatar">
                                {currentUser?.name?.charAt(0) || 'M'}
                            </div>
                            <div className="mp-user-details">
                                <div className="mp-user-name">
                                    {currentUser?.name || 'Management Partner'}
                                </div>
                                <div className="mp-user-role">
                                    {userRole || 'MP'}
                                </div>
                            </div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="main-content">
                    <div className="container">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MPLayout;