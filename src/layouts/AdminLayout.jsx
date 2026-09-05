import { Link, useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck, Activity, LogOut, Users, BarChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  // Protection: Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login?tab=admin" replace />;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar glass-card">
        <div className="sidebar-header" style={{ borderBottomColor: 'rgba(255,255,255,0.1)' }}>
          <div className="admin-avatar">
            <ShieldCheck size={28} color="white" />
          </div>
          <div>
            <h3 style={{ color: 'white' }}>{user.username || 'UBMS Admin'}</h3>
            <span className="admin-badge">System Administrator</span>
          </div>
        </div>
        
        <nav className="sidebar-nav admin-nav">
          <Link to="/admin-dashboard" className={`nav-item ${isActive('/admin-dashboard')}`}>
            <BarChart size={20} /> Dashboard Overview
          </Link>
          <Link to="/manage-donors" className={`nav-item ${isActive('/manage-donors')}`}>
            <Users size={20} /> Manage Donors
          </Link>
          <Link to="/manage-requests" className={`nav-item ${isActive('/manage-requests')}`}>
            <Activity size={20} /> Manage Requests
          </Link>
        </nav>

        <div className="sidebar-footer" style={{ borderTopColor: 'rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} className="nav-item logout" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <LogOut size={20} /> Secure Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
