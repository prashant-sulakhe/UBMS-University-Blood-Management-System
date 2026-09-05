import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, MapPin, Droplet, Calendar, Hospital, History, Activity, Loader, AlertCircle, ChevronRight, Info, Wifi, WifiOff, Send, Inbox, ArrowUpRight, ArrowDownLeft, Phone, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import './DonationTracking.css';

const API = import.meta.env.VITE_API_URL || '';

const TIMELINE_STEPS = ['Pending', 'Approved', 'Matched', 'Completed'];

export default function DonationTracking() {
  const { user, getToken } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [directSent, setDirectSent] = useState([]);
  const [directReceived, setDirectReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores requestId being updated
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'donations', 'direct_sent', 'direct_received'

  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [donationsRes, requestsRes, directSentRes, directReceivedRes] = await Promise.all([
        fetch(`${API}/api/donation/history`, { headers: authHeaders() }),
        fetch(`${API}/api/blood-request`, { headers: authHeaders() }),
        fetch(`${API}/api/direct-request/user/sent`, { headers: authHeaders() }),
        fetch(`${API}/api/direct-request/user/received`, { headers: authHeaders() })
      ]);

      if (donationsRes.ok) setDonations(await donationsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
      if (directSentRes.ok) setDirectSent(await directSentRes.json());
      if (directReceivedRes.ok) setDirectReceived(await directReceivedRes.json());
    } catch (err) {
      console.error('Fetch tracking data error:', err);
      showToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => fetchData();
    
    socket.on('request_status_updated', handleUpdate);
    socket.on('donation_history_updated', handleUpdate);
    socket.on('new_blood_request', (data) => {
      if (data.request.user_id === user?.id) fetchData();
    });
    socket.on('new_direct_request', handleUpdate);
    socket.on('direct_request_accepted', handleUpdate);
    socket.on('direct_request_declined', handleUpdate);

    return () => {
      socket.off('request_status_updated', handleUpdate);
      socket.off('donation_history_updated', handleUpdate);
      socket.off('new_blood_request');
      socket.off('new_direct_request', handleUpdate);
      socket.off('direct_request_accepted', handleUpdate);
      socket.off('direct_request_declined', handleUpdate);
    };
  }, [socket, user, fetchData]);

  const handleDirectAction = async (requestId, action) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`${API}/api/direct-request/${action}/${requestId}`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      
      showToast(`Request ${action}ed successfully!`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getTimelineProgress = (status) => {
    const index = TIMELINE_STEPS.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / TIMELINE_STEPS.length) * 100;
  };

  const getStepStatus = (requestStatus, step) => {
    const currentIdx = TIMELINE_STEPS.indexOf(requestStatus);
    const stepIdx = TIMELINE_STEPS.indexOf(step);
    
    if (requestStatus === 'Rejected') return 'rejected';
    if (currentIdx >= stepIdx) return 'completed';
    if (currentIdx === stepIdx - 1) return 'active';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="tracking-page flex-center">
        <Loader size={48} className="spin" color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <header className="page-header">
          <div className="header-top">
            <div>
              <h1>History & Tracking</h1>
              <p>Track your blood requests and view your donation contribution history.</p>
            </div>
            <div className={`live-sync-pill ${connected ? 'active' : ''}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? 'Live Tracking Active' : 'Connecting...'}
            </div>
          </div>

          <div className="tab-switcher">
            <button 
              className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <Activity size={18} /> My Broadcasts
            </button>
            <button 
              className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
              onClick={() => setActiveTab('donations')}
            >
              <History size={18} /> Donation History
            </button>
            <button 
              className={`tab-btn ${activeTab === 'direct_sent' ? 'active' : ''}`}
              onClick={() => setActiveTab('direct_sent')}
            >
              <ArrowUpRight size={18} /> Direct Sent ({directSent.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'direct_received' ? 'active' : ''}`}
              onClick={() => setActiveTab('direct_received')}
            >
              <ArrowDownLeft size={18} /> Direct Received ({directReceived.length})
            </button>
          </div>
        </header>

        <main className="tracking-content">
          {activeTab === 'requests' && (
            <div className="requests-list">
              {requests.length > 0 ? requests.map(req => (
                <div key={req.request_id} className="glass-card tracking-card">
                  <div className="card-header">
                    <div className="req-id">
                      <span className="blood-tag">{req.blood_group}</span>
                      <div>
                        <h3>{req.requester_name || 'My Blood Request'}</h3>
                        <span className="date-span">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status}
                    </div>
                  </div>

                  <div className="timeline-container">
                    <div className="timeline-bar">
                      <div 
                        className="timeline-progress" 
                        style={{ width: `${getTimelineProgress(req.status)}%` }} 
                      />
                    </div>
                    <div className="timeline-steps">
                      {TIMELINE_STEPS.map(step => {
                        const sStatus = getStepStatus(req.status, step);
                        return (
                          <div key={step} className={`step ${sStatus}`}>
                            <div className="step-circle">
                              {sStatus === 'completed' ? <CheckCircle size={14} /> : <div className="dot" />}
                            </div>
                            <span>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="info-item">
                      <MapPin size={16} />
                      <span>{req.location}</span>
                    </div>
                    {req.status === 'Matched' && (
                      <div className="match-alert">
                        <Info size={16} />
                        <span>Donors found! Check details.</span>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="empty-state glass-card">
                  <Activity size={48} />
                  <h3>No Broadcasts Found</h3>
                  <p>You haven't made any broadcast blood requests yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'donations' && (
            <div className="donations-list">
              {donations.length > 0 ? donations.map(don => (
                <div key={don.donation_id} className="glass-card donation-card">
                  <div className="don-icon">
                    <Droplet size={24} color="var(--primary)" fill="var(--primary)" />
                  </div>
                  <div className="don-details">
                    <div className="don-top">
                      <h4>{don.hospital_name}</h4>
                      <span className="don-units">{don.units_donated} Unit(s)</span>
                    </div>
                    <div className="don-meta">
                      <span><Calendar size={14} /> {new Date(don.donation_date).toLocaleDateString()}</span>
                      <span><Droplet size={14} /> {don.blood_group}</span>
                      <span className={`don-status ${don.status.toLowerCase()}`}>{don.status}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} color="var(--text-muted)" />
                </div>
              )) : (
                <div className="empty-state glass-card">
                  <History size={48} />
                  <h3>No Donations Yet</h3>
                  <p>Your contribution history will appear here once you donate blood.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'direct_sent' && (
            <div className="requests-list">
              {directSent.length > 0 ? directSent.map(req => (
                <div key={req.id} className="glass-card tracking-card">
                  <div className="card-header">
                    <div className="req-id">
                      <span className="blood-tag">{req.blood_group}</span>
                      <div>
                        <h3>Sent to {req.receiver_name}</h3>
                        <span className="date-span">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status}
                    </div>
                  </div>

                  <div className="direct-details-grid" style={{ padding: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ margin: 0 }}>📍 <strong>Location:</strong> {req.location}</p>
                    <p style={{ margin: 0 }}>💉 <strong>Units Required:</strong> {req.units}</p>
                    {req.message && <p style={{ margin: 0 }}>📝 <strong>Notes:</strong> <em>"{req.message}"</em></p>}
                  </div>

                  {req.status === 'Accepted' && (
                    <div className="accepted-donor-details" style={{ padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', marginTop: '1rem' }}>
                      <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.8rem 0' }}>
                        <CheckCircle size={18} /> Donor Details (Accepted)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <span>👤 <strong>Name:</strong> {req.receiver_name}</span>
                        <span>✉️ <strong>Email:</strong> {req.receiver_email}</span>
                        <span>📞 <strong>Phone:</strong> {req.receiver_phone}</span>
                        <span>🩸 <strong>Blood Group:</strong> {req.receiver_blood_group}</span>
                        <span>📍 <strong>Location:</strong> {req.receiver_location}</span>
                        <div style={{ marginTop: '0.5rem' }}>
                          <Link to={`/profile/${req.receiver_id}`} className="btn-secondary" style={{ padding: '0.4rem 1rem', textDecoration: 'none', display: 'inline-block', fontSize: '0.85rem' }}>
                            [ View Profile ]
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="empty-state glass-card">
                  <Send size={48} />
                  <h3>No Direct Requests Sent</h3>
                  <p>Send direct requests to specific donors from their public profiles.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'direct_received' && (
            <div className="requests-list">
              {directReceived.length > 0 ? directReceived.map(req => (
                <div key={req.id} className="glass-card tracking-card">
                  <div className="card-header">
                    <div className="req-id">
                      <span className="blood-tag">{req.blood_group}</span>
                      <div>
                        <h3>Received from {req.requester_name}</h3>
                        <span className="date-span">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status}
                    </div>
                  </div>

                  <div className="direct-details-grid" style={{ padding: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ margin: 0 }}>📍 <strong>Location:</strong> {req.location}</p>
                    <p style={{ margin: 0 }}>💉 <strong>Units Needed:</strong> {req.units}</p>
                    <p style={{ margin: 0 }}>📞 <strong>Requester Contact:</strong> {req.contact}</p>
                    {req.message && <p style={{ margin: 0 }}>📝 <strong>Notes:</strong> <em>"{req.message}"</em></p>}
                  </div>

                  {req.status === 'Pending' && (
                    <div className="direct-actions" style={{ display: 'flex', gap: '1rem', padding: '1rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-decline" 
                        onClick={() => handleDirectAction(req.id, 'decline')} 
                        disabled={actionLoading === req.id}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Decline
                      </button>
                      <button 
                        className="btn-accept" 
                        onClick={() => handleDirectAction(req.id, 'accept')} 
                        disabled={actionLoading === req.id}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {actionLoading === req.id ? <Loader className="spin" size={16} /> : 'Accept Request'}
                      </button>
                    </div>
                  )}

                  {req.status === 'Accepted' && (
                    <div className="accepted-alert" style={{ padding: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle size={18} /> You accepted this blood request!
                    </div>
                  )}
                  {req.status === 'Declined' && (
                    <div className="declined-alert" style={{ padding: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={18} /> You declined this request.
                    </div>
                  )}
                </div>
              )) : (
                <div className="empty-state glass-card">
                  <Inbox size={48} />
                  <h3>No Direct Requests Received</h3>
                  <p>You haven't received any personal blood requests yet.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
