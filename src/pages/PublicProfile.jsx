import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, MapPin, Activity, Calendar, Droplet, Phone, Mail, Loader, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './PublicProfile.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { getToken, user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Direct Request Modal State
  const [showModal, setShowModal] = useState(false);
  const [bloodGroup, setBloodGroup] = useState(user?.blood_group || '');
  const [units, setUnits] = useState(1);
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState(user?.phone || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error(err);
      setError('Profile not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    // Update prefilled values when user data is available
    if (user) {
      if (!bloodGroup) setBloodGroup(user.blood_group || '');
      if (!contact) setContact(user.phone || '');
    }
  }, [user]);

  const getAvatarColor = (name) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#795548'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!bloodGroup || !location || !contact) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/direct-request/send/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          blood_group: bloodGroup,
          units: parseInt(units),
          hospital: location, // satisfy DB NOT NULL constraint with location
          location,
          contact,
          message
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send request');

      showToast('Direct Request Sent Successfully!', 'success');
      setShowModal(false);
      // Reset form
      setLocation('');
      setMessage('');
      setUnits(1);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send direct request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-profile-page flex-center" style={{ minHeight: '80vh' }}>
        <Loader size={48} className="spin" color="var(--primary)" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="public-profile-page flex-center" style={{ minHeight: '80vh', textAlign: 'center' }}>
        <AlertTriangle size={64} color="var(--error)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h2>{error || 'Profile not found'}</h2>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>Go Back</button>
      </div>
    );
  }

  const isSelf = user?.id === profile.user_id;

  return (
    <div className="public-profile-page">
      <div className="profile-header-card glass-card">
        <div className="profile-avatar-large" style={{ backgroundColor: getAvatarColor(profile.name), color: 'white' }}>
          {profile.profile_pic ? (
            <img src={profile.profile_pic} alt={profile.name} />
          ) : (
            profile.name[0].toUpperCase()
          )}
        </div>
        
        <h1 className="profile-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          {profile.name}
          <ShieldCheck size={24} color="var(--primary)" />
        </h1>
        
        <div className="profile-blood-badge">
          {profile.blood_group}
        </div>

        {profile.bio && (
          <p className="profile-bio">
            "{profile.bio}"
          </p>
        )}

        <div className="profile-actions">
          {!isSelf && (
            <button className="btn-request" onClick={() => setShowModal(true)}>
              <Droplet size={18} /> Request Blood
            </button>
          )}
          {isSelf && (
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>This is your public profile view</span>
          )}
        </div>
      </div>

      <div className="profile-stats-grid">
        <div className="stat-box">
          <Droplet size={32} color="var(--primary)" className="stat-icon" />
          <span className="stat-value">{profile.donation_count || 0}</span>
          <span className="stat-label">Donations</span>
        </div>
        <div className="stat-box">
          <MapPin size={32} color="#2196f3" className="stat-icon" />
          <span className="stat-value">{profile.location || 'Unknown'}</span>
          <span className="stat-label">Location</span>
        </div>
        <div className="stat-box">
          <Activity size={32} color={profile.availability_status === 'ON' ? '#10b981' : '#ef4444'} className="stat-icon" />
          <span className="stat-value" style={{ color: profile.availability_status === 'ON' ? '#10b981' : '#ef4444' }}>
            {profile.availability_status === 'ON' ? 'Available' : 'Unavailable'}
          </span>
          <span className="stat-label">Status</span>
        </div>
      </div>

      <div className="profile-details-card glass-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} color="var(--primary)" /> Contact & Profile Details
        </h3>
        
        <div className="detail-row">
          <div className="detail-label"><Mail size={16} /> Gmail ID</div>
          <div className="detail-value">{profile.email || 'Not specified'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label"><Phone size={16} /> Contact Number</div>
          <div className="detail-value">{profile.phone || 'Not specified'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label"><User size={16} /> Gender</div>
          <div className="detail-value">{profile.gender || 'Not specified'}</div>
        </div>
        
        <div className="detail-row">
          <div className="detail-label"><Calendar size={16} /> Member Since</div>
          <div className="detail-value">{new Date(profile.created_at).toLocaleDateString()}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label"><Calendar size={16} /> Last Donation</div>
          <div className="detail-value">
            {profile.last_donation_date ? new Date(profile.last_donation_date).toLocaleDateString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Direct Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3><Droplet size={20} color="var(--primary)" /> Direct Blood Request</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRequestSubmit}>
              <div className="form-group">
                <label>Blood Group Needed</label>
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required>
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Units Required</label>
                <input type="number" min="1" max="10" value={units} onChange={(e) => setUnits(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Location / Address</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hubli, Karnataka" required />
              </div>

              <div className="form-group">
                <label>Your Contact Number</label>
                <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Your phone number" required />
              </div>

              <div className="form-group">
                <label>Message / Notes (Optional)</label>
                <textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Any special instructions or urgency details..."></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? <Loader className="spin" size={16} /> : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
