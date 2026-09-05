import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Droplet, CheckCircle, Activity, Bell, Loader, RefreshCw, Clock, XCircle, AlertTriangle, ShieldCheck, Box, UserCheck, Mail, ThumbsUp, ThumbsDown, MailCheck, MailX } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import './AdminDashboard.css';

const API = import.meta.env.VITE_API_URL || '';

// ── Helper: Counter Animation ────────────────────────
const useCountUp = (end, duration = 1000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * (end || 0)));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);
  return count;
};

const StatCard = ({ icon, label, value, colorClass, customStyle, loading }) => {
  const displayValue = useCountUp(value);
  
  if (loading) {
    return (
      <div className="admin-stat-card skeleton">
        <div className="stat-icon-skeleton" />
        <div className="stat-content-skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line label" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-stat-card">
      <div className={`stat-icon ${colorClass || ''}`} style={customStyle}>{icon}</div>
      <div className="stat-content">
        <h3>{displayValue}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentResponses, setRecentResponses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [completedNotifications, setCompletedNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState('requests'); // 'requests' | 'responses' | 'emails'

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, requestsRes, emailRes, respRes, directsRes] = await Promise.all([
        fetch(`${API}/api/blood-request/stats`, { headers: authHeaders() }),
        fetch(`${API}/api/blood-request?status=`, { headers: authHeaders() }),
        fetch(`${API}/api/blood-request/email-logs`, { headers: authHeaders() }),
        fetch(`${API}/api/blood-request/recent-responses`, { headers: authHeaders() }),
        fetch(`${API}/api/direct-request/admin/all`, { headers: authHeaders() })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      
      let allBroadcasts = [];
      if (requestsRes.ok) {
        allBroadcasts = await requestsRes.json();
        setRecentRequests(allBroadcasts.slice(0, 8));
      }

      if (emailRes.ok) setEmailLogs((await emailRes.json()).slice(0, 8));
      if (respRes.ok) setRecentResponses((await respRes.json()).slice(0, 8));

      let allDirects = [];
      if (directsRes.ok) {
        allDirects = await directsRes.json();
      }

      // Consolidate completed notifications from broadcasts and directs
      const completedBroadcasts = allBroadcasts.filter(r => r.status === 'Completed');
      const completedDirects = allDirects.filter(d => d.status === 'Completed');
      
      const combinedCompleted = [...completedBroadcasts, ...completedDirects].sort(
        (a, b) => new Date(b.completedAt || b.created_at) - new Date(a.completedAt || a.created_at)
      );
      
      setCompletedNotifications(combinedCompleted.slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchDashboardData();
    socket.on('request_stats_updated', handleRefresh);
    socket.on('availability_updated', handleRefresh);
    socket.on('user_status_updated', handleRefresh);
    socket.on('request_status_updated', handleRefresh);
    socket.on('direct_request_completed', handleRefresh);
    socket.on('new_user', handleRefresh);
    socket.on('user_deleted', handleRefresh);
    socket.on('donation_response_update', (data) => {
      showToast(`🤝 ${data.donor_name} ${data.response.toLowerCase()} a blood request`, 'info');
      fetchDashboardData();
    });
    socket.on('new_blood_request', (data) => {
      showToast(`🩸 New request for ${data.request.blood_group} in ${data.request.location}`, 'warning');
      fetchDashboardData();
    });
    return () => {
      socket.off('request_stats_updated', handleRefresh);
      socket.off('availability_updated', handleRefresh);
      socket.off('user_status_updated', handleRefresh);
      socket.off('request_status_updated', handleRefresh);
      socket.off('direct_request_completed', handleRefresh);
      socket.off('new_user', handleRefresh);
      socket.off('user_deleted', handleRefresh);
      socket.off('donation_response_update');
      socket.off('new_blood_request');
    };
  }, [socket, fetchDashboardData, showToast]);

  const STATUS_COLORS = {
    Pending: '#f59e0b', Approved: '#3b82f6', Matched: '#8b5cf6',
    Completed: '#10b981', Rejected: '#ef4444',
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading-screen">
          <Loader size={48} className="spin" color="var(--primary)" />
          <p>Initializing real-time admin control center...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <header className="dashboard-header">
        <div className="header-flex">
          <div>
            <h1>Admin Control Center</h1>
            <p>Complete real-time overview of the University Blood Management System.</p>
          </div>
          <div className="live-controls">
            <span className={`live-tag ${connected ? 'active' : ''}`}>
              {connected ? <ShieldCheck size={14} /> : <XCircle size={14} />}
              {connected ? 'Real-Time Sync Active' : 'Connecting to TiDB...'}
            </span>
            <button onClick={fetchDashboardData} className="admin-refresh-btn">
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid — Extended with donation & email stats */}
      <section className="admin-stats-grid">
        <StatCard 
          icon={<Users size={24} />} 
          label="Total Users" 
          value={stats?.totalUsers} 
          colorClass="purple" 
          loading={loading}
        />
        <StatCard 
          icon={<Droplet size={24} />} 
          label="Active Donors" 
          value={stats?.activeDonors} 
          colorClass="red" 
          loading={loading}
        />
        <StatCard 
          icon={<Activity size={24} />} 
          label="Pending Requests" 
          value={stats?.pendingRequests} 
          colorClass="orange" 
          loading={loading}
        />
        <StatCard 
          icon={<CheckCircle size={24} />} 
          label="Completed" 
          value={stats?.completedRequests} 
          colorClass="green" 
          loading={loading}
        />
        <StatCard 
          icon={<ThumbsUp size={24} />} 
          label="Accepted Donors" 
          value={stats?.acceptedDonors} 
          customStyle={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
          loading={loading}
        />
        <StatCard 
          icon={<ThumbsDown size={24} />} 
          label="Declined" 
          value={stats?.declinedDonors} 
          customStyle={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          loading={loading}
        />
        <StatCard 
          icon={<MailCheck size={24} />} 
          label="Emails Sent" 
          value={stats?.emailsSent} 
          customStyle={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
          loading={loading}
        />
        <StatCard 
          icon={<MailX size={24} />} 
          label="Emails Failed" 
          value={stats?.emailsFailed} 
          customStyle={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          loading={loading}
        />
      </section>

      <div className="admin-content-grid">
        <div className="grid-left">
          <section className="glass-card panel-card">
            <div className="panel-header"><h2><Box size={20} /> Management Modules</h2></div>
            <div className="quick-nav-grid">
              <Link to="/manage-donors" className="nav-box"><UserCheck size={28} /><span>Manage Donors</span><p>Track availability</p></Link>
              <Link to="/manage-requests" className="nav-box"><Activity size={28} /><span>Manage Requests</span><p>Approve/Reject flow</p></Link>
            </div>
          </section>

          <section className="glass-card panel-card inventory-summary">
            <div className="panel-header"><h2><AlertTriangle size={20} /> System Alerts</h2></div>
            <div className="alerts-placeholder">
              <div className="alert-item info"><ShieldCheck size={18} /><span>TiDB Cloud Database is healthy and connected.</span></div>
              {stats?.pendingRequests > 0 && (
                <div className="alert-item warning"><Bell size={18} /><span>You have {stats.pendingRequests} pending requests awaiting review.</span></div>
              )}
              {completedNotifications.map((notif, index) => (
                <div key={notif.request_id || notif.id || index} className="alert-item success" style={{ animation: 'slideIn 0.3s ease' }}>
                  <CheckCircle size={18} />
                  <span>Blood request completed by {notif.requester_name || 'User'}</span>
                </div>
              ))}
              <div className="alert-item success"><CheckCircle size={18} /><span>{stats?.completedRequests} successful donations facilitated.</span></div>
              {stats?.emailsSent > 0 && (
                <div className="alert-item info"><Mail size={18} /><span>{stats.emailsSent} notification emails delivered successfully.</span></div>
              )}
              {stats?.acceptedDonors > 0 && (
                <div className="alert-item success"><ThumbsUp size={18} /><span>{stats.acceptedDonors} donors have accepted blood requests.</span></div>
              )}
            </div>
          </section>
        </div>

        {/* Activity Panel with Tab Toggle */}
        <section className="glass-card panel-card activity-section">
          <div className="panel-header">
            <div className="tab-switcher">
              <button 
                onClick={() => setActivePanel('requests')} 
                className={`tab-btn ${activePanel === 'requests' ? 'active' : ''}`}
              >
                <Clock size={20} />
                <span>Requests</span>
              </button>
              <button 
                onClick={() => setActivePanel('responses')} 
                className={`tab-btn ${activePanel === 'responses' ? 'active' : ''}`}
              >
                <ThumbsUp size={20} />
                <span>Responses</span>
              </button>
              <button 
                onClick={() => setActivePanel('emails')} 
                className={`tab-btn ${activePanel === 'emails' ? 'active' : ''}`}
              >
                <Mail size={20} />
                <span>Email Logs</span>
              </button>
            </div>
          </div>

          {activePanel === 'requests' ? (
            <div className="activity-log">
              {recentRequests.length > 0 ? recentRequests.map(req => (
                <div key={req.request_id} className="activity-item">
                  <div className="activity-dot" style={{ background: STATUS_COLORS[req.status] || '#999' }} />
                  <div className="activity-details">
                    <div className="activity-top">
                      <h4>{req.requester_name || 'User'}</h4>
                      <span className="blood-tag">{req.blood_group}</span>
                      {req.urgency && req.urgency !== 'Normal' && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 700, background: req.urgency === 'Critical' ? '#ffcdd2' : '#ffe0b2', color: req.urgency === 'Critical' ? '#b71c1c' : '#e65100' }}>{req.urgency}</span>
                      )}
                    </div>
                    <p>{req.location} • <span style={{ color: STATUS_COLORS[req.status], fontWeight: 700 }}>{req.status}</span>
                      {req.units_required > 1 && <span> • {req.units_required} units</span>}
                    </p>
                    <span className="activity-time">{new Date(req.created_at).toLocaleString()}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-activity"><Activity size={32} /><p>No recent activity detected.</p></div>
              )}
            </div>
          ) : activePanel === 'responses' ? (
            <div className="activity-log">
              {recentResponses.length > 0 ? recentResponses.map(resp => (
                <div key={resp.id} className="activity-item">
                  <div className="activity-dot" style={{ background: resp.response === 'Accepted' ? '#10b981' : '#ef4444' }} />
                  <div className="activity-details">
                    <div className="activity-top">
                      <h4 style={{ fontSize: '0.9rem' }}>Donor: {resp.donor_name}</h4>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, background: resp.response === 'Accepted' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: resp.response === 'Accepted' ? '#10b981' : '#ef4444' }}>
                        {resp.response}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem' }}>
                      Request by <strong style={{color: 'var(--text-primary)'}}>{resp.requester_name}</strong> • <strong style={{color: '#d32f2f'}}>{resp.blood_group}</strong>
                    </p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Status: {resp.request_status}</p>
                    <span className="activity-time">{new Date(resp.created_at).toLocaleString()}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-activity"><Activity size={32} /><p>No recent responses.</p></div>
              )}
            </div>
          ) : (
            <div className="activity-log">
              {emailLogs.length > 0 ? emailLogs.slice(0, 15).map(log => (
                <div key={log.id} className="activity-item">
                  <div className="activity-dot" style={{ background: log.status === 'sent' ? '#10b981' : log.status === 'failed' ? '#ef4444' : '#f59e0b' }} />
                  <div className="activity-details">
                    <div className="activity-top">
                      <h4 style={{ fontSize: '0.85rem' }}>{log.recipient_email}</h4>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, background: log.status === 'sent' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: log.status === 'sent' ? '#10b981' : '#ef4444' }}>
                        {log.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem' }}>{log.subject?.substring(0, 60)}...</p>
                    {log.error_message && <p style={{ fontSize: '0.75rem', color: '#ef4444' }}>Error: {log.error_message}</p>}
                    <span className="activity-time">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-activity"><Mail size={32} /><p>No email activity yet.</p></div>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
