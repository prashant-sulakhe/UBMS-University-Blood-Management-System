import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Mail, Clock, CheckCircle, Info, AlertTriangle, X, ShieldAlert, Droplet, ThumbsUp, ThumbsDown, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import './NotificationBell.css';

const API = import.meta.env.VITE_API_URL || '';

export default function NotificationBell() {
  const { user, getToken } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  }), [getToken]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: authHeaders() });
      if (res.ok) setNotifications(await res.json());
    } catch (err) { console.error('Fetch notifications error:', err); }
  }, [authHeaders]);

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notif) => {
      setNotifications(prev => {
        // Prevent duplicates
        if (notif.notification_id && prev.some(n => n.notification_id === notif.notification_id)) return prev;
        return [{ ...notif, is_read: false }, ...prev];
      });
      showToast(`🔔 ${notif.title}`, 'info');
    };
    const handleDonationAccepted = (data) => {
      showToast(`✅ ${data.donor_name} accepted your blood request!`, 'success');
      fetchNotifications();
    };
    const handleResponseSaved = () => fetchNotifications();
    
    const handleDirectRequestAccepted = (data) => {
      showToast(`✅ ${data.donorName || 'Donor'} accepted your direct blood request!`, 'success');
      fetchNotifications();
    };
    const handleDirectRequestDeclined = (data) => {
      showToast(`❌ Your direct request was declined.`, 'info');
      fetchNotifications();
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('donation_accepted', handleDonationAccepted);
    socket.on('donation_response_saved', handleResponseSaved);
    socket.on('direct_request_accepted', handleDirectRequestAccepted);
    socket.on('direct_request_declined', handleDirectRequestDeclined);
    // Refresh notification list whenever any request is completed
    socket.on('request_completed', fetchNotifications);
    socket.on('direct_request_completed', fetchNotifications);
    socket.on('request_status_updated', fetchNotifications);
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('donation_accepted', handleDonationAccepted);
      socket.off('donation_response_saved', handleResponseSaved);
      socket.off('direct_request_accepted', handleDirectRequestAccepted);
      socket.off('direct_request_declined', handleDirectRequestDeclined);
      socket.off('request_completed', fetchNotifications);
      socket.off('direct_request_completed', fetchNotifications);
      socket.off('request_status_updated', fetchNotifications);
    };
  }, [socket, showToast, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API}/api/notifications/read/${id}`, { method: 'PUT', headers: authHeaders() });
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers: authHeaders() });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) { console.error(err); }
  };

  // Accept or Decline a blood request
  const handleRespond = async (requestId, response, notifId, notifType) => {
    if (respondingId) return; // Prevent double-clicks / multiple calls
    setRespondingId(notifId);
    try {
      const endpoint = response === 'Accepted' ? 'accept' : 'decline';
      const apiPath = notifType === 'direct_request' ? 'direct-request' : 'blood-request';
      const res = await fetch(`${API}/api/${apiPath}/${endpoint}/${requestId}`, {
        method: 'POST',
        headers: authHeaders()
      });
      let data = {};
      try { data = await res.json(); } catch(e) {}
      if (!res.ok) throw new Error(data.message || 'Failed to respond');

      // Update local notification state
      setNotifications(prev => prev.map(n =>
        n.notification_id === notifId
          ? { ...n, action_status: response === 'Accepted' ? 'accepted' : 'declined', is_read: true }
          : n
      ));
      showToast(response === 'Accepted' ? '✅ You accepted the donation request!' : '❌ Request declined.', response === 'Accepted' ? 'success' : 'info');
    } catch (err) {
      showToast(err.message || 'Failed to respond', 'error');
    } finally { 
      setRespondingId(null); 
    }
  };

  const handleMarkCompleted = async (requestId, type, notifId) => {
    if (completingId) return;
    setCompletingId(notifId);
    try {
      const apiPath = type === 'direct_request_accepted' ? 'direct-request' : 'blood-request';
      const res = await fetch(`${API}/api/${apiPath}/complete/${requestId}`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to mark as completed');
      
      showToast('Donation marked as completed successfully', 'success');
      // Update local state directly
      setNotifications(prev => prev.map(n =>
        n.notification_id === notifId ? { ...n, request_status: 'Completed' } : n
      ));
      fetchNotifications();
    } catch (err) {
      showToast(err.message || 'Failed to mark completed', 'error');
    } finally {
      setCompletingId(null);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BloodRequest': return <Droplet size={16} color="#d32f2f" />;
      case 'direct_request': return <Droplet size={16} color="#d32f2f" />;
      case 'DonationAccepted': return <CheckCircle size={16} color="#10b981" />;
      case 'direct_request_accepted': return <CheckCircle size={16} color="#10b981" />;
      case 'direct_request_declined': return <X size={16} color="#ef4444" />;
      case 'Match': return <Droplet size={16} color="#8b5cf6" />;
      case 'Status': return <CheckCircle size={16} color="#10b981" />;
      case 'Admin': return <ShieldAlert size={16} color="#f59e0b" />;
      case 'Inventory': return <AlertTriangle size={16} color="#ef4444" />;
      default: return <Info size={16} color="var(--primary)" />;
    }
  };

  const getUrgencyFromMessage = (msg) => {
    if (msg?.includes('CRITICAL')) return 'Critical';
    if (msg?.includes('URGENT')) return 'Urgent';
    return null;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="bell-trigger" onClick={() => setIsOpen(!isOpen)} id="notification-bell-btn">
        <Bell size={22} />
        {unreadCount > 0 && <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown glass-card">
          <div className="dropdown-header">
            <h3>🔔 Notifications</h3>
            {unreadCount > 0 && <button onClick={markAllAsRead}>Mark all read</button>}
          </div>

          <div className="notifications-list">
            {notifications.length > 0 ? (
              notifications.map(n => {
                const urgency = getUrgencyFromMessage(n.title);
                const isBloodRequest = n.type === 'BloodRequest' || n.type === 'direct_request';
                const isCompleted = n.request_status?.toUpperCase() === 'COMPLETED' || n.message === 'This donation was completed';
                const hasActions = isBloodRequest && n.action_status === 'none' && !isCompleted;
                const isAnyBusy = respondingId !== null || completingId !== null;
                const isThisResponding = respondingId === n.notification_id;
                const isThisCompleting = completingId === n.notification_id;

                return (
                  <div
                    key={n.notification_id || Math.random()}
                    className={`notification-item ${!n.is_read ? 'unread' : ''} ${isBloodRequest ? 'notif-blood-request' : ''}`}
                    onClick={() => !n.is_read && markAsRead(n.notification_id)}
                  >
                    <div className="notif-icon">{getTypeIcon(n.type)}</div>
                    <div className="notif-content">
                      <div className="notif-title-row">
                        <p className="notif-title">{n.title}</p>
                        {urgency && (
                          <span className={`notif-urgency-badge urgency-${urgency.toLowerCase()}`}>{urgency}</span>
                        )}
                      </div>
                      <p className="notif-message">{n.message}</p>
                      <span className="notif-time">
                        <Clock size={10} /> {formatTime(n.created_at)}
                      </span>

                      {/* Accept / Decline Buttons */}
                      {hasActions && n.request_id && (
                        <div className="notif-actions">
                          <button
                            className="notif-accept-btn"
                            disabled={isAnyBusy}
                            onClick={(e) => { e.stopPropagation(); handleRespond(n.request_id, 'Accepted', n.notification_id, n.type); }}
                          >
                            {isThisResponding ? <Loader size={14} className="spin" /> : <ThumbsUp size={14} />} Accept
                          </button>
                          <button
                            className="notif-decline-btn"
                            disabled={isAnyBusy}
                            onClick={(e) => { e.stopPropagation(); handleRespond(n.request_id, 'Declined', n.notification_id, n.type); }}
                          >
                            <ThumbsDown size={14} /> Decline
                          </button>
                        </div>
                      )}

                      {/* Status badge after response */}
                      {n.action_status === 'accepted' && !isCompleted && (
                        <div className="notif-response-badge accepted"><CheckCircle size={12} /> You Accepted</div>
                      )}
                      {n.action_status === 'declined' && (
                        <div className="notif-response-badge declined"><X size={12} /> Declined</div>
                      )}
                      {/* Completed badge — shown when request is marked done */}
                      {isCompleted && (
                        <div className="notif-response-badge completed">
                          <CheckCircle size={12} /> Completed
                        </div>
                      )}

                      {/* Requester View for Accepted Donation */}
                      {(n.type === 'DonationAccepted' || n.type === 'direct_request_accepted') && n.sender_id && (
                        <div className="notif-actions" style={{ marginTop: '0.5rem' }}>
                          <a 
                            href={`/profile/${n.sender_id}`} 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'var(--primary)', color: 'white', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            View Profile
                          </a>
                          {((n.request_status?.toUpperCase() === 'ACCEPTED' || n.request_status?.toUpperCase() === 'MATCHED') && n.request_status?.toUpperCase() !== 'COMPLETED') && (
                            <button
                              disabled={isAnyBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCompleted(n.request_id, n.type, n.notification_id);
                              }}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.7rem',
                                background: '#2563eb',
                                color: 'white',
                                borderRadius: '4px',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: isAnyBusy ? 'not-allowed' : 'pointer',
                                opacity: isAnyBusy ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              {isThisCompleting ? <Loader size={12} className="spin" /> : null}
                              Completed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {!n.is_read && <div className="unread-dot" />}
                  </div>
                );
              })
            ) : (
              <div className="empty-notifications">
                <Mail size={32} />
                <p>No notifications yet</p>
              </div>
            )}
          </div>

          <div className="dropdown-footer">
            <button onClick={() => setIsOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
