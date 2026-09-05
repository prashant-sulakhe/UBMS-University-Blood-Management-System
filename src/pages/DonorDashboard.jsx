import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Search, Activity, History, Bell, MapPin, LogOut, Droplet, CheckCircle, ShieldCheck, Wifi, WifiOff, Loader, AlertTriangle, Box, Compass, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import './DonorDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function DonorDashboard() {
  const { user, logout, getToken } = useAuth();
  const { socket, connected } = useSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const notifRes = await fetch(`${API_BASE}/api/notifications`, { headers: authHeaders() });
      if (notifRes.ok) setNotifications(await notifRes.json());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchDashboardData();
    
    socket.on('new_notification', handleRefresh);
    socket.on('availability_updated', handleRefresh);
    
    socket.on('blood_request_match', (data) => {
      showToast(`🚨 URGENT: Match found for ${data.request.blood_group}!`, 'error');
      fetchDashboardData();
    });

    return () => {
      socket.off('new_notification', handleRefresh);
      socket.off('availability_updated', handleRefresh);
      socket.off('blood_request_match');
    };
  }, [socket, fetchDashboardData, showToast]);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'D';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <Loader size={48} className="spin" color="var(--primary)" />
        <p style={{ marginTop: '1.5rem', fontWeight: 600 }}>Syncing donor network...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Side Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="donor-avatar-circle">{getInitials(user?.name)}</div>
          <div>
            <h3>{user?.name || 'Donor'}</h3>
            <span className="type-badge-pill">{user?.blood_group || '--'} Donor</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/donor-dashboard" className="nav-item active"><Activity size={20} /> Dashboard</Link>
          <Link to="/donor-profile" className="nav-item"><User size={20} /> My Profile</Link>
          <Link to="/search-donor" className="nav-item"><Search size={20} /> Search Donors</Link>
          <Link to="/tracking" className="nav-item"><History size={20} /> My Activity</Link>
          <Link to="/request-blood" className="nav-item"><Droplet size={20} /> Request Blood</Link>
        </nav>

        <div className="sidebar-footer">
          <div className={`live-sync-pill ${connected ? 'active' : ''}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live Network' : 'Disconnected'}
          </div>
          <button onClick={handleSignOut} className="logout-pill-btn">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="header-welcome">
          <h1>Welcome back, {user?.name.split(' ')[0]}!</h1>
          <p>Real-time overview of the blood management network in {user?.location || 'your area'}.</p>
        </header>

        {/* Status Section - Replacing Quick Actions with Stat Cards */}
        <section className="donor-stats-grid">
          <Link to="/request-blood" className="stat-box" style={{ textDecoration: 'none' }}>
            <div className="stat-icon-wrap primary"><Activity size={28} /></div>
            <div className="stat-data">
              <h4>Need Blood?</h4>
              <span>Submit live request</span>
            </div>
          </Link>
          
          <Link to="/search-donor" className="stat-box" style={{ textDecoration: 'none' }}>
            <div className="stat-icon-wrap blue"><Compass size={28} /></div>
            <div className="stat-data">
              <h4>Find Donors</h4>
              <span>Live donor search</span>
            </div>
          </Link>

          <Link to="/donor-profile" className="stat-box" style={{ textDecoration: 'none' }}>
            <div className="stat-icon-wrap purple"><ShieldCheck size={28} /></div>
            <div className="stat-data">
              <h4>My Status</h4>
              <span>Manage availability</span>
            </div>
          </Link>

          <Link to="/tracking" className="stat-box" style={{ textDecoration: 'none' }}>
            <div className="stat-icon-wrap orange"><Clock size={28} /></div>
            <div className="stat-data">
              <h4>Activity Log</h4>
              <span>View history</span>
            </div>
          </Link>
        </section>

        <section className="glass-card panel-card">
          <h2><Bell size={22} color="var(--primary)" /> Recent Smart Alerts</h2>
          <div className="alerts-scroll">
            {notifications.length > 0 ? notifications.slice(0, 8).map(n => (
              <div key={n.notification_id} className="alert-message-box">
                {!n.is_read && <div className="alert-indicator" />}
                <div className="alert-text">
                  <p>{n.message}</p>
                  <time>{new Date(n.created_at).toLocaleString()}</time>
                </div>
              </div>
            )) : (
              <div className="empty-state">
                <Bell size={32} opacity={0.3} />
                <p>No recent notifications yet.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
