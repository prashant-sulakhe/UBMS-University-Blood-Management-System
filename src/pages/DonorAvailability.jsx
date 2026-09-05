import { useState, useEffect, useCallback } from 'react';
import { Activity, Droplet, Calendar, MapPin, HeartPulse, CheckCircle, XCircle, Loader, RefreshCw, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import './DonorAvailability.css';

const API = import.meta.env.VITE_API_URL || '';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function DonorAvailability() {
  const { user, getToken } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    blood_group: '',
    last_donation_date: '',
    city: '',
    health_status: 'Good'
  });

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/donor/profile`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData({
          blood_group: data.blood_group,
          last_donation_date: data.last_donation_date ? data.last_donation_date.split('T')[0] : '',
          city: data.city,
          health_status: data.health_status
        });
      } else if (res.status === 404) {
        // No profile yet, that's fine
        setProfile(null);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleProfileUpdate = () => {
      fetchProfile();
    };

    socket.on('availability_updated', (data) => {
      if (data.userId === user?.id) fetchProfile();
    });

    return () => {
      socket.off('availability_updated');
    };
  }, [socket, user, fetchProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/donor/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      showToast('Donor profile updated successfully!', 'success');
      fetchProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const currentStatus = profile.availability_status || 'OFF';
    const nextStatus = currentStatus === 'ON' ? 'OFF' : 'ON';
    
    try {
      const res = await fetch(`${API}/api/users/${user.id}/availability`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ availability_status: nextStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      showToast(`You are now ${nextStatus === 'ON' ? 'Available' : 'Unavailable'} for donation`, 'info');
      fetchProfile();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="donor-page flex-center">
        <Loader size={48} className="spin" color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="donor-page">
      <div className="donor-container">
        <header className="page-header text-center">
          <div className="header-icon-wrap">
            <Droplet size={36} color="var(--primary)" fill="var(--primary)" />
          </div>
          <h1>Donor Availability Management</h1>
          <p>Register as a donor and manage your availability status in real-time.</p>
          
          <div className={`connection-status ${connected ? 'active' : ''}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live Sync Active' : 'Offline'}
          </div>
        </header>

        <div className="donor-grid">
          {/* Status Overview */}
          <section className="glass-card status-section">
            <div className="card-header">
              <h2>My Status</h2>
              {profile && (
                <button onClick={toggleAvailability} className={`status-toggle-btn ${profile.availability_status === 'ON' ? 'active' : ''}`}>
                  {profile.availability_status === 'ON' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  {profile.availability_status === 'ON' ? 'Available' : 'Unavailable'}
                </button>
              )}
            </div>

            {profile ? (
              <div className="status-content">
                <div className={`eligibility-badge ${profile.is_eligible ? 'eligible' : 'ineligible'}`}>
                  {profile.is_eligible ? 'Eligible to Donate' : 'Currently Ineligible'}
                </div>
                
                {!profile.is_eligible && profile.days_remaining > 0 && (
                  <div className="eligibility-info">
                    <Clock size={18} />
                    <span>Next donation possible in <strong>{profile.days_remaining} days</strong></span>
                  </div>
                )}

                <div className="status-grid">
                  <div className="status-item">
                    <span className="label">Blood Group</span>
                    <span className="value blood-group">{profile.blood_group}</span>
                  </div>
                  <div className="status-item">
                    <span className="label">Last Donation</span>
                    <span className="value">{profile.last_donation_date ? new Date(profile.last_donation_date).toLocaleDateString() : 'Never'}</span>
                  </div>
                  <div className="status-item">
                    <span className="label">City</span>
                    <span className="value">{profile.city}</span>
                  </div>
                  <div className="status-item">
                    <span className="label">Health</span>
                    <span className="value">{profile.health_status}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-status text-center">
                <AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>You haven't registered as a donor yet.</p>
                <p className="small">Fill the form to join the UBMS donor network.</p>
              </div>
            )}
          </section>

          {/* Registration Form */}
          <section className="glass-card form-section">
            <div className="card-header">
              <h2>{profile ? 'Update Profile' : 'Donor Registration'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="donor-form">
              <div className="form-group">
                <label><Droplet size={16} /> Blood Group *</label>
                <select 
                  value={formData.blood_group} 
                  onChange={e => setFormData({...formData, blood_group: e.target.value})}
                  required
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label><MapPin size={16} /> Current City *</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g. Mumbai"
                  required
                />
              </div>

              <div className="form-group">
                <label><Calendar size={16} /> Last Donation Date</label>
                <input 
                  type="date" 
                  value={formData.last_donation_date}
                  onChange={e => setFormData({...formData, last_donation_date: e.target.value})}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label><HeartPulse size={16} /> Health Status</label>
                <input 
                  type="text" 
                  value={formData.health_status}
                  onChange={e => setFormData({...formData, health_status: e.target.value})}
                  placeholder="e.g. Fit and Healthy"
                />
              </div>

              <div className="form-info">
                <p>* You must wait 90 days between donations for eligibility.</p>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <><RefreshCw size={18} className="spin" /> Saving...</> : <><CheckCircle size={18} /> {profile ? 'Update Profile' : 'Register Now'}</>}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
