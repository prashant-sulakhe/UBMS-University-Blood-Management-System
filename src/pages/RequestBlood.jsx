import { useState, useEffect, useCallback } from 'react';
import { Activity, CheckCircle, HeartPulse, MapPin, Clock, Eye, ArrowLeft, Users, Loader, AlertTriangle, Send, Wifi, WifiOff, Phone, FileText, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import './RequestBlood.css';

const API = import.meta.env.VITE_API_URL || '';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STATUS_CONFIG = {
  Pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending Review' },
  Approved:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Approved' },
  Matched:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'Donor Matched' },
  Completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Completed' },
  Rejected:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Rejected' },
};

export default function RequestBlood() {
  const { user, getToken } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();
  const locationState = useLocation().state;
  
  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds <= 5) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds} secs ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState({
    blood_group: locationState?.donor?.blood_group || '', 
    location: locationState?.donor?.location || locationState?.donor?.city || '', 
    units_required: 1,
    contact_number: '', urgency: 'Normal', notes: locationState?.donor ? `Requesting specifically from donor: ${locationState.donor.name}` : ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matchedDonors, setMatchedDonors] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API}/api/blood-request`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      setRequests(await res.json());
    } catch (err) {
      showToast('Failed to load your requests', 'error');
    } finally { setLoadingHistory(false); }
  }, [user, authHeaders, showToast]);

  const fetchDetail = useCallback(async (requestId) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/blood-request/${requestId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setSelectedRequest(data.request);
      setMatchedDonors(data.matched_donors);
      setActiveTab('detail');
    } catch (err) {
      showToast('Failed to load request details', 'error');
    } finally { setLoadingDetail(false); }
  }, [authHeaders, showToast]);

  useEffect(() => { if (activeTab === 'history') fetchRequests(); }, [activeTab, fetchRequests]);

  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (data) => {
      setRequests(prev => prev.map(r =>
        r.request_id === data.request.request_id ? { ...r, status: data.new_status } : r
      ));
      if (selectedRequest?.request_id === data.request.request_id) {
        setSelectedRequest(prev => prev ? { ...prev, status: data.new_status } : prev);
      }
      showToast(`Request #${data.request.request_id}: ${data.old_status} → ${data.new_status}`, 'info');
    };
    socket.on('request_status_updated', handleStatusUpdate);
    return () => socket.off('request_status_updated', handleStatusUpdate);
  }, [socket, selectedRequest, showToast]);

  // Pre-fill contact from user profile
  useEffect(() => {
    if (user?.phone) setFormData(f => ({ ...f, contact_number: user.phone }));
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!user) { showToast('Please log in to submit a blood request', 'error'); return; }
    if (!formData.blood_group) { showToast('Please select a blood group', 'error'); return; }
    if (!formData.location || formData.location.trim().length < 2) { showToast('Please enter a valid location', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/blood-request/create`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          blood_group: formData.blood_group,
          location: formData.location.trim(),
          units_required: parseInt(formData.units_required) || 1,
          contact_number: formData.contact_number.trim(),
          urgency: formData.urgency,
          notes: formData.notes.trim() || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit');
      setSubmitResult(data);
      showToast('🩸 Blood request submitted! Emails being sent to all users.', 'success');
      setFormData({ blood_group: '', location: '', units_required: 1, contact_number: user?.phone || '', urgency: 'Normal', notes: '' });
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error');
    } finally { setSubmitting(false); }
  };

  if (!user) {
    return (
      <div className="request-page flex-center-screen">
        <div className="glass-card success-card text-center">
          <div className="success-icon-wrapper" style={{ background: 'rgba(var(--primary-rgb), 0.08)' }}>
            <AlertTriangle size={56} color="var(--primary)" />
          </div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '2rem' }}>Authentication Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            You must be logged in to submit blood requests and view your request history.
          </p>
          <div className="action-buttons">
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '0.8rem 2rem' }}>Log In</Link>
            <Link to="/register" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.8rem 2rem' }}>Register</Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitResult) {
    return (
      <div className="request-page flex-center-screen">
        <div className="glass-card success-card text-center">
          <div className="success-icon-wrapper"><CheckCircle size={56} color="#10b981" /></div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '2.2rem' }}>Request Submitted!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: '1.6' }}>
            Your blood request for <strong>{submitResult.request?.blood_group}</strong> at <strong>{submitResult.request?.location}</strong> has been saved.
          </p>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: '#10b981', fontWeight: 600 }}>
              📧 Email notifications are being sent to {submitResult.notifications_sent || 'all'} registered users.
            </p>
          </div>
          {submitResult.matched_donors?.length > 0 && (
            <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', marginBottom: '0.8rem' }}>
                <Users size={22} color="#8b5cf6" />
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                  {submitResult.matched_donors.length} Compatible Donor{submitResult.matched_donors.length !== 1 ? 's' : ''} Found
                </strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {submitResult.matched_donors.slice(0, 5).map(d => (
                  <span key={d.id || d.user_id} style={{ background: 'rgba(139,92,246,0.12)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {d.name} • {d.city || d.location}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => setSubmitResult(null)}>Submit Another</button>
            <button className="btn-primary" onClick={() => { setSubmitResult(null); setActiveTab('history'); }}>View My Requests</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-page">
      <div className="request-container" style={{ maxWidth: '1000px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Live Updates Active' : 'Connecting...'}
        </div>

        <div className="rb-tabs">
          <button className={`rb-tab ${activeTab === 'create' ? 'rb-tab-active' : ''}`} onClick={() => setActiveTab('create')}>
            <Send size={18} /> New Request
          </button>
          <button className={`rb-tab ${activeTab === 'history' ? 'rb-tab-active' : ''}`} onClick={() => setActiveTab('history')}>
            <Clock size={18} /> My Requests
          </button>
        </div>

        {/* ── CREATE TAB ── */}
        {activeTab === 'create' && (
          <>
            <header className="page-header text-center" style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(211,47,47,0.1)', padding: '1.2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Activity size={36} color="var(--primary)" />
              </div>
              <h1 style={{ fontSize: '2.4rem' }}>Request Blood</h1>
              <p style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                Submit your blood requirement. All registered UBMS users will be notified via email instantly.
              </p>
            </header>

            <div className="glass-card form-wrapper">
              <form onSubmit={handleSubmit} className="request-form">
                <div className="form-section-title">
                  <HeartPulse size={22} color="var(--primary)" />
                  <h3>Request Details</h3>
                </div>

                <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="rb-blood-group">Required Blood Group *</label>
                    <select id="rb-blood-group" value={formData.blood_group} onChange={(e) => setFormData(f => ({ ...f, blood_group: e.target.value }))} required className="full-width-select">
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rb-units">Units Required *</label>
                    <input id="rb-units" type="number" min="1" max="20" value={formData.units_required} onChange={(e) => setFormData(f => ({ ...f, units_required: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="rb-location">Location / Hospital *</label>
                    <div className="input-with-icon">
                      <MapPin size={18} color="var(--text-secondary)" />
                      <input id="rb-location" type="text" value={formData.location} onChange={(e) => setFormData(f => ({ ...f, location: e.target.value }))} placeholder="e.g. City Hospital, Ward 3" required minLength={2} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rb-contact">Contact Number</label>
                    <div className="input-with-icon">
                      <Phone size={18} color="var(--text-secondary)" />
                      <input id="rb-contact" type="tel" value={formData.contact_number} onChange={(e) => setFormData(f => ({ ...f, contact_number: e.target.value }))} placeholder="e.g. +91 9876543210" />
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="rb-urgency">Urgency Level *</label>
                    <div className="urgency-selector">
                      {['Normal', 'Urgent', 'Critical'].map(level => (
                        <button key={level} type="button"
                          className={`urgency-btn ${formData.urgency === level ? 'urgency-active' : ''} urgency-${level.toLowerCase()}`}
                          onClick={() => setFormData(f => ({ ...f, urgency: level }))}>
                          <Zap size={14} />
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rb-notes">Additional Notes</label>
                    <textarea id="rb-notes" rows="3" value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Any medical details, patient condition, etc." style={{ resize: 'vertical', minHeight: '80px' }} />
                  </div>
                </div>

                <div className="form-disclaimer">
                  <input type="checkbox" required id="rb-consent" />
                  <label htmlFor="rb-consent">I verify that this is a legitimate medical requirement and I consent to sharing my details with verified donors and sending email alerts to all UBMS members.</label>
                </div>

                <button type="submit" className="btn-primary submit-btn" disabled={submitting} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? <><Loader size={20} className="spin" /> Submitting &amp; Sending Emails...</> : <><Send size={20} /> Submit Blood Request</>}
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <>
            <header className="page-header" style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem' }}>My Blood Requests</h1>
              <p style={{ fontSize: '1rem' }}>Track the status of all your blood requests in real-time.</p>
            </header>
            {loadingHistory ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Loader size={40} className="spin" color="var(--primary)" />
                <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem' }}>Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Activity size={40} style={{ opacity: 0.4 }} color="var(--text-muted)" />
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '1rem' }}>No Requests Yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Create one to get started.</p>
                <button className="btn-primary" onClick={() => setActiveTab('create')}>Create New Request</button>
              </div>
            ) : (
              <div className="rb-request-list">
                {requests.map(req => {
                  const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
                  return (
                    <div key={req.request_id} className="glass-card rb-request-card" onClick={() => fetchDetail(req.request_id)}>
                      <div className="rb-request-card-header">
                        <div className="rb-request-id">
                          <span className="rb-request-blood-badge">{req.blood_group}</span>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{req.requester_name || user?.name}</h3>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{req.location}
                              {req.urgency && req.urgency !== 'Normal' && (
                                <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: req.urgency === 'Critical' ? '#ffcdd2' : '#ffe0b2', color: req.urgency === 'Critical' ? '#b71c1c' : '#e65100' }}>
                                  {req.urgency}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="rb-status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>{sc.label}</span>
                      </div>
                      <div className="rb-request-card-footer">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <Clock size={14} />{formatRelativeTime(req.created_at)}
                          {req.units_required > 1 && <span style={{ marginLeft: '8px' }}>• {req.units_required} units</span>}
                        </span>
                        <button className="rb-view-btn" onClick={(e) => { e.stopPropagation(); fetchDetail(req.request_id); }}>
                          <Eye size={16} /> View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── DETAIL VIEW ── */}
        {activeTab === 'detail' && (
          <>
            <button className="rb-back-btn" onClick={() => setActiveTab('history')}><ArrowLeft size={18} /> Back to My Requests</button>
            {loadingDetail ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Loader size={40} className="spin" color="var(--primary)" />
              </div>
            ) : selectedRequest && (
              <>
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                  <div className="rb-detail-header">
                    <div>
                      <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.6rem' }}>{selectedRequest.requester_name || user?.name}</h2>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Submitted {formatRelativeTime(selectedRequest.created_at)}
                      </p>
                    </div>
                    <span className="rb-status-badge rb-status-badge-lg" style={{
                      background: (STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Pending).bg,
                      color: (STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Pending).color,
                      border: `1px solid ${(STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Pending).color}30`
                    }}>
                      {(STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Pending).label}
                    </span>
                  </div>
                  <div className="rb-detail-grid">
                    <div className="rb-detail-item"><span className="rb-detail-label">Blood Group</span><span className="rb-detail-value rb-blood-lg">{selectedRequest.blood_group}</span></div>
                    <div className="rb-detail-item"><span className="rb-detail-label">Units</span><span className="rb-detail-value">{selectedRequest.units_required || 1}</span></div>
                    <div className="rb-detail-item"><span className="rb-detail-label">Location</span><span className="rb-detail-value">{selectedRequest.location}</span></div>
                    <div className="rb-detail-item"><span className="rb-detail-label">Urgency</span><span className="rb-detail-value">{selectedRequest.urgency || 'Normal'}</span></div>
                    <div className="rb-detail-item"><span className="rb-detail-label">Contact</span><span className="rb-detail-value">{selectedRequest.contact_number || 'N/A'}</span></div>
                    <div className="rb-detail-item"><span className="rb-detail-label">Date</span><span className="rb-detail-value">{new Date(selectedRequest.created_at).toLocaleDateString()}</span></div>
                  </div>
                  {selectedRequest.notes && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes:</strong>
                      <p style={{ margin: '0.3rem 0 0', color: 'var(--text-primary)' }}>{selectedRequest.notes}</p>
                    </div>
                  )}
                </div>

                <div className="glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <Users size={24} color="var(--primary)" />
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Matched Donors ({matchedDonors.length})</h2>
                  </div>
                  {matchedDonors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <Users size={36} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                      <p>No available donors found in {selectedRequest.location} yet.</p>
                    </div>
                  ) : (
                    <div className="rb-donors-grid">
                      {matchedDonors.map(d => (
                        <div key={d.user_id || d.id} className="rb-donor-card">
                          <div className="rb-donor-avatar">{d.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                          <div className="rb-donor-info">
                            <h4 style={{ margin: '0 0 0.2rem 0' }}>{d.name}</h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{d.city || d.location}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                            <span className="rb-donor-blood">{d.blood_group}</span>
                            <Link to={`/profile/${d.user_id || d.id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>View Profile</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
