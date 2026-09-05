import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Droplet, Menu, X, User, Sun, Moon, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

export default function Navbar({ theme, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // Close mobile menu and dropdown on route change
  useEffect(() => {
    setIsOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const getAvatarColor = (name) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#795548'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="brand">
          <Droplet color="#d32f2f" size={28} fill="#d32f2f" />
          <span className="brand-text">UBMS</span>
        </Link>
        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          {!user ? (
            <>
              <Link to="/" className={isActive('/')}>Home</Link>
              <Link to="/about" className={isActive('/about')}>About</Link>
              <Link to="/contact" className={isActive('/contact')}>Contact</Link>
            </>
          ) : user.role === 'admin' ? (
            <>
              <Link to="/admin-dashboard" className={isActive('/admin-dashboard')}>Dashboard</Link>
              <Link to="/manage-donors" className={isActive('/manage-donors')}>Donors</Link>
              <Link to="/manage-requests" className={isActive('/manage-requests')}>Requests</Link>
            </>
          ) : (
            <>
              <Link to="/donor-dashboard" className={isActive('/donor-dashboard')}>Dashboard</Link>
              <Link to="/request-blood" className={isActive('/request-blood')}>Requests</Link>
              <Link to="/search-donor" className={isActive('/search-donor')}>Search Donor</Link>
              <Link to="/tracking" className={isActive('/tracking')}>My Activity</Link>
            </>
          )}
          
          <div className="auth-links">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {user ? (
              <>
            {user && <NotificationBell />}
                <div className="user-menu-container">
                <button className="avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <div className="nav-avatar-initials" style={{ 
                    background: getAvatarColor(user.username || user.name),
                    color: 'white'
                  }}>
                    {(user.username || user.name) 
                      ? (user.username || user.name).split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                      : <User size={18} />}
                  </div>
                </button>
                
                {dropdownOpen && (
                  <div className="avatar-dropdown">
                    <div className="dropdown-header">
                      <strong>{user.username || user.name || 'UBMS Admin'}</strong>
                      <span>{user.email || ''}</span>
                    </div>
                    {user.role === 'admin' ? (
                      <Link to="/admin-dashboard" className="dropdown-item">Admin Profile</Link>
                    ) : (
                      <Link to="/donor-profile" className="dropdown-item">Profile</Link>
                    )}
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-item text-red">Log Out</button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <>
                <Link to="/login" className={`nav-login ${isActive('/login')}`}>Login</Link>
                <Link to="/register" className="btn-login">Register</Link>
              </>
            )}
          </div>
        </div>
        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
