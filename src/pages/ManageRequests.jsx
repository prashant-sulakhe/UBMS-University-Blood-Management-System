import { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Search, AlertTriangle, CheckCircle, Clock, XCircle, Users, Loader, ChevronDown, RefreshCw, Wifi, WifiOff, Trash2, ArrowRight } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import './ManageRequests.css';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_CONFIG = {
  Pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
  Approved:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: CheckCircle },
  Matched:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: Users },
  Completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
  Rejected:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
  Accepted:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
  Declined:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle }
};

const STATUS_OPTIONS = ['Pending', 'Matched', 'Completed'];

export default function ManageRequests() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const [requests, setRequests] = useState([]);
  const [directRequests, setDirectRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' or 'directs'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const getAvatarColor = (name) => {
    const palette = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#22c55e"];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  // ── Fetch standard broadcasts ─────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      // Use the dedicated admin broadcast-requests endpoint that includes completed ones
      const res = await fetch(`${API}/api/admin/broadcast-requests`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch standard requests');
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error('Fetch standard requests error:', err);
    }
  }, [authHeaders, statusFilter, activeTab]);

  // ── Fetch direct requests ─────────────────────────────────
  const fetchDirectRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/direct-request/admin/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch direct requests');
      const data = await res.json();
      setDirectRequests(data);
    } catch (err) {
      console.error('Fetch direct requests error:', err);
    }
  }, [authHeaders]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchDirectRequests()]);
    setLoading(false);
  }, [fetchRequests, fetchDirectRequests]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Socket.IO real-time listeners ──────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = (data) => {
      setRequests(prev => [data.request, ...prev]);
      showToast(`🩸 New blood request: ${data.request.blood_group} at ${data.request.location}`, 'warning', 6000);
    };

    const handleStatusUpdate = (data) => {
      setRequests(prev => prev.map(r =>
        r.request_id === data.request.request_id ? { ...data.request } : r
      ));
      showToast(`Request for ${data.request.requester_name}: ${data.old_status} → ${data.new_status}`, 'info');
    };

    const handleDeleted = (data) => {
      setRequests(prev => prev.filter(r => r.request_id !== data.request_id));
    };

    const handleNewDirect = () => {
      fetchDirectRequests();
    };

    socket.on('new_blood_request', handleNewRequest);
    socket.on('request_status_updated', handleStatusUpdate);
    socket.on('request_deleted', handleDeleted);
    socket.on('new_direct_request', handleNewDirect);
    socket.on('direct_request_accepted', handleNewDirect);
    socket.on('direct_request_declined', handleNewDirect);
    socket.on('direct_request_completed', handleNewDirect);

    return () => {
      socket.off('new_blood_request', handleNewRequest);
      socket.off('request_status_updated', handleStatusUpdate);
      socket.off('request_deleted', handleDeleted);
      socket.off('new_direct_request', handleNewDirect);
      socket.off('direct_request_accepted', handleNewDirect);
      socket.off('direct_request_declined', handleNewDirect);
      socket.off('direct_request_completed', handleNewDirect);
    };
  }, [socket, showToast, fetchDirectRequests]);

  // ── Update Status (Broadcasts) ──────────────────────────
  const updateStatus = async (requestId, newStatus) => {
    setUpdatingId(requestId);
    try {
      const res = await fetch(`${API}/api/blood-request/status/${requestId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRequests(prev => prev.map(r =>
        r.request_id === requestId ? { ...r, status: newStatus } : r
      ));
      showToast(`Status for ${data.request?.requester_name || 'Donor'} updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Permanent Delete (Broadcasts) ───────────────────────────
  const handlePermanentDelete = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch(`${API}/api/admin/requests/${requestToDelete.request_id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to delete');
      
      setRequests(prev => prev.filter(r => r.request_id !== requestToDelete.request_id));
      showToast('Blood request permanently deleted', 'success');
      
      // Notify other admins via socket
      if (socket) {
        socket.emit('request_deleted', { request_id: requestToDelete.request_id });
      }

      setRequestToDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete request', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Filter locally by search term (Memoized) ──────────────────
  const filtered = useMemo(() => {
    let list = [];
    if (activeTab === 'broadcasts') {
      list = requests.filter(r => ['Pending', 'Matched', 'Completed'].includes(r.status));
      if (statusFilter) {
        list = list.filter(r => r.status === statusFilter);
      }
    } else if (activeTab === 'directs') {
      list = directRequests.filter(r => r.status !== 'Completed');
      if (statusFilter) {
        list = list.filter(r => r.status === statusFilter);
      }
    } else {
      // Completed Requests Tab
      const completedBroadcasts = requests.filter(r => r.status === 'Completed');
      const completedDirects = directRequests.filter(r => r.status === 'Completed').map(dr => ({
        ...dr,
        request_id: dr.id,
        donor_name: dr.receiver_name
      }));
      list = [...completedBroadcasts, ...completedDirects];
    }

    // Ensure most recent items are always at the top
    const sorted = list.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.created_at || 0);
      const dateB = new Date(b.completedAt || b.created_at || 0);
      return dateB - dateA;
    });

    if (!searchTerm) return sorted;
    const q = searchTerm.toLowerCase();
    return sorted.filter(r => {
      return (
        r.blood_group?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.requester_name?.toLowerCase().includes(q) ||
        r.donor_name?.toLowerCase().includes(q) ||
        r.receiver_name?.toLowerCase().includes(q) ||
        String(r.request_id || r.id).includes(q)
      );
    });
  }, [requests, directRequests, activeTab, statusFilter, searchTerm]);

  return (
    <AdminLayout>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Manage Blood Requests</h1>
            <p>Monitor, approve, and track all blood requests from TiDB Cloud in real-time.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '20px',
              background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)',
              color: connected ? '#10b981' : 'var(--text-muted)',
              border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`
            }}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : 'Offline'}
            </span>
            <button onClick={loadAll} className="mr-refresh-btn" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="tab-switcher" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => { setActiveTab('broadcasts'); setStatusFilter(''); }}
          style={{ background: activeTab === 'broadcasts' ? 'var(--primary)' : 'none', color: activeTab === 'broadcasts' ? 'white' : 'var(--text-primary)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Broadcast Requests ({requests.filter(r => r.status !== 'Completed').length})
        </button>
        <button 
          onClick={() => { setActiveTab('directs'); setStatusFilter(''); }}
          style={{ background: activeTab === 'directs' ? 'var(--primary)' : 'none', color: activeTab === 'directs' ? 'white' : 'var(--text-primary)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Direct Requests ({directRequests.filter(r => r.status !== 'Completed').length})
        </button>
        <button 
          onClick={() => { setActiveTab('completed'); setStatusFilter(''); }}
          style={{ background: activeTab === 'completed' ? 'var(--primary)' : 'none', color: activeTab === 'completed' ? 'white' : 'var(--text-primary)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Completed Requests ({requests.filter(r => r.status === 'Completed').length + directRequests.filter(r => r.status === 'Completed').length})
        </button>
      </div>

      {/* Stats Bar for Broadcasts only */}
      {activeTab === 'broadcasts' && (
        <div className="mr-stats-bar" style={{ marginBottom: '1.5rem' }}>
          {STATUS_OPTIONS.map(s => {
            const count = requests.filter(r => r.status === s).length;
            const sc = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                className={`mr-stat-chip ${statusFilter === s ? 'mr-stat-chip-active' : ''}`}
                style={{
                  '--chip-color': sc.color,
                  '--chip-bg': sc.bg,
                }}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              >
                <span className="mr-stat-dot" style={{ background: sc.color }} />
                {s} <strong>{count}</strong>
              </button>
            );
          })}
          <button
            className={`mr-stat-chip ${!statusFilter ? 'mr-stat-chip-active' : ''}`}
            onClick={() => setStatusFilter('')}
            style={{ '--chip-color': 'var(--text-primary)', '--chip-bg': 'rgba(0,0,0,0.04)' }}
          >
            All <strong>{requests.filter(r => ['Pending', 'Matched', 'Completed'].includes(r.status)).length}</strong>
          </button>
        </div>
      )}

      {/* Search & Table */}
      <div className="glass-card" style={{ padding: 'var(--card-padding, 2.5rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: 0 }}>
            {activeTab === 'broadcasts' ? 'Broadcast Requests' : activeTab === 'directs' ? 'Direct Requests List' : 'Completed Requests List'} ({filtered.length})
          </h2>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={activeTab === 'broadcasts' ? "Search requests..." : "Search direct requests..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Loader size={40} className="spin" color="var(--primary)" />
            <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem' }}>Loading from TiDB Cloud...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {activeTab === 'broadcasts' ? (
              <table className="mr-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    {statusFilter === 'Completed' && <th>Donor Name</th>}
                    <th>Blood Group</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>{statusFilter === 'Completed' ? 'Date Completed' : 'Date'}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(req => {
                    const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={req.request_id}>
                        <td>
                          <div className="requester-info-cell">
                            <div 
                              className="requester-avatar" 
                              style={{ background: `linear-gradient(135deg, ${getAvatarColor(req.requester_name)}, ${getAvatarColor(req.requester_name)}dd)` }}
                            >
                              {getInitials(req.requester_name)}
                            </div>
                            <div className="requester-details">
                              <span className="requester-name">{req.requester_name || 'Unknown'}</span>
                              <Link 
                                to={`/admin/view-profile/${req.user_id}`} 
                                className="admin-profile-link"
                              >
                                View Profile record
                              </Link>
                            </div>
                          </div>
                        </td>
                        {statusFilter === 'Completed' && (
                          <td>
                            <div className="requester-info-cell">
                              <div 
                                className="requester-avatar" 
                                style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  fontSize: '0.8rem',
                                  background: `linear-gradient(135deg, ${getAvatarColor(req.donor_name)}, ${getAvatarColor(req.donor_name)}dd)` 
                                }}
                              >
                                {getInitials(req.donor_name)}
                              </div>
                              <div className="requester-details">
                                <span className="donor-name-text" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {req.donor_name || 'N/A'}
                                </span>
                                {req.donor_id && (
                                  <Link 
                                    to={`/admin/view-profile/${req.donor_id}`} 
                                    className="admin-profile-link"
                                  >
                                    View Profile
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        <td>
                          <span className="mr-blood-badge">{req.blood_group}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{req.location}</td>
                        <td>
                          <span className="mr-status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                            <StatusIcon size={14} /> {req.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {req.status === 'Completed' ? 
                            (req.completedAt ? new Date(req.completedAt).toLocaleDateString() : new Date(req.created_at).toLocaleDateString()) :
                            new Date(req.created_at).toLocaleDateString()
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                              onClick={() => setRequestToDelete(req)}
                              className="mr-delete-btn"
                              title="Delete Request"
                              style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No broadcast requests found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : activeTab === 'directs' ? (
              <table className="mr-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Receiver (Donor)</th>
                    <th>Blood Group</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(req => {
                    const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={req.id}>
                        <td>
                          <div className="requester-info-cell">
                            <div 
                              className="requester-avatar" 
                              style={{ background: `linear-gradient(135deg, ${getAvatarColor(req.requester_name)}, ${getAvatarColor(req.requester_name)}dd)` }}
                            >
                              {getInitials(req.requester_name)}
                            </div>
                            <div className="requester-details">
                              <span className="requester-name">{req.requester_name || 'Unknown'}</span>
                              <Link 
                                to={`/admin/view-profile/${req.requester_id}`} 
                                className="admin-profile-link"
                              >
                                View Profile
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="requester-info-cell">
                            <div 
                              className="requester-avatar" 
                              style={{ background: `linear-gradient(135deg, ${getAvatarColor(req.receiver_name)}, ${getAvatarColor(req.receiver_name)}dd)` }}
                            >
                              {getInitials(req.receiver_name)}
                            </div>
                            <div className="requester-details">
                              <span className="requester-name">{req.receiver_name || 'Unknown'}</span>
                              <Link 
                                to={`/admin/view-profile/${req.receiver_id}`} 
                                className="admin-profile-link"
                              >
                                View Profile
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mr-blood-badge">{req.blood_group}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <div>{req.location}</div>
                        </td>
                        <td>
                          <span className="mr-status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                            <StatusIcon size={14} /> {req.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No direct blood requests logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="mr-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Donor Name</th>
                    <th>Blood Group</th>
                    <th>Completed Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(req => {
                    return (
                      <tr key={req.request_id || req.id}>
                        <td>
                          <div className="requester-info-cell">
                            <div 
                              className="requester-avatar" 
                              style={{ background: `linear-gradient(135deg, ${getAvatarColor(req.requester_name)}, ${getAvatarColor(req.requester_name)}dd)` }}
                            >
                              {getInitials(req.requester_name)}
                            </div>
                            <div className="requester-details">
                              <span className="requester-name">{req.requester_name || 'Unknown'}</span>
                              <Link 
                                to={`/admin/view-profile/${req.user_id || req.requester_id}`} 
                                className="admin-profile-link"
                              >
                                View Profile
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="requester-info-cell">
                            <div 
                              className="requester-avatar" 
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                fontSize: '0.8rem',
                                background: `linear-gradient(135deg, ${getAvatarColor(req.donor_name || 'None')}, ${getAvatarColor(req.donor_name || 'None')}dd)` 
                              }}
                            >
                              {getInitials(req.donor_name || 'NA')}
                            </div>
                            <div className="requester-details">
                              <span className="donor-name-text" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {req.donor_name || 'None'}
                              </span>
                              {(req.donor_id || req.receiver_id) && (
                                <Link 
                                  to={`/admin/view-profile/${req.donor_id || req.receiver_id}`} 
                                  className="admin-profile-link"
                                >
                                  View Profile
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mr-blood-badge">{req.blood_group}</span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {req.completedAt ? new Date(req.completedAt).toLocaleString() : new Date(req.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No completed blood requests found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setRequestToDelete(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-wrap">
              <AlertTriangle size={32} />
            </div>
            <h2>Delete Blood Request</h2>
            <p>
              Are you sure you want to permanently delete blood request <strong>#{requestToDelete.request_id}</strong>? 
              This action cannot be undone and will remove all associated responses and notifications.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setRequestToDelete(null)} 
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={handlePermanentDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader size={18} className="spin" /> : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
