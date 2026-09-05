import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Droplet, Calendar, MapPin, HeartPulse, CheckCircle, XCircle, Loader, RefreshCw, AlertCircle, Wifi, WifiOff, Clock, User, Camera, Pencil, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import './DonorProfile.css';

const API = import.meta.env.VITE_API_URL || '';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function DonorProfile() {
  const { user, getToken, login } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    blood_group: '',
    location: '',
    gender: '',
    age: '',
    address: '',
    state: '',
    pincode: '',
    profile_pic: '',
    emergency_contact: '',
    medical_notes: '',
    last_donation_date: '',
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
        setFormData(prev => ({
          ...prev,
          ...data,
          location: data.location || data.city // sync compatibility
        }));
      } else if (res.status === 404) {
        setProfile(null);
        // Fallback to basic user data
        setFormData(prev => ({ 
          ...prev, 
          ...user,
          location: user?.location || ''
        }));
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, user]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = (data) => {
      // Sync if this user or relevant update
      if (data.userId === user?.id || data.userId === String(user?.id)) {
        setProfile(prev => prev ? { ...prev, availability_status: data.availability_status, updated_at: data.updated_at } : null);
      }
    };

    const handleProfileUpdate = (data) => {
      if (data.userId === user?.id) fetchProfile();
    };

    socket.on('availability_updated', handleUpdate);
    socket.on('donor_profile_updated', handleProfileUpdate);
    
    return () => {
      socket.off('availability_updated', handleUpdate);
      socket.off('donor_profile_updated', handleProfileUpdate);
    };
  }, [socket, user, fetchProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (formData.location && formData.location.includes('@')) {
      showToast('Location/Address cannot be an email address.', 'error');
      setSubmitting(false);
      return;
    }
    try {
      // 1. Update Core User Profile
      const userRes = await fetch(`${API}/api/users/update-profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(formData)
      });
      const userData = await userRes.json();
      if (!userRes.ok) throw new Error(userData.message);

      // 2. Sync with Auth Context to update Name/Email/Avatar globally
      if (userData.user) {
        login(getToken(), userData.user);
      }

      // 3. Update Donor-Specific Profile
      const donorRes = await fetch(`${API}/api/donor/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          blood_group: formData.blood_group,
          last_donation_date: formData.last_donation_date,
          city: formData.location || formData.city,
          health_status: formData.health_status || 'Good'
        })
      });
      if (!donorRes.ok) throw new Error('Failed to update donor details');

      showToast('Profile updated successfully!', 'success');
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#795548'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const toggleAvailability = async () => {
    const currentStatus = profile?.availability_status || user?.availability_status || 'OFF';
    const nextStatus = currentStatus === 'ON' ? 'OFF' : 'ON';
    
    // 🚀 Optimistic Update
    setProfile(prev => prev ? { ...prev, availability_status: nextStatus } : { availability_status: nextStatus });

    try {
      const res = await fetch(`${API}/api/users/${user.id}/availability`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ availability_status: nextStatus })
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      const updatedData = await res.json();
      setProfile(prev => ({ ...prev, ...updatedData }));
      
      // Update global user context as well
      login(getToken(), { ...user, availability_status: nextStatus });

      if (nextStatus === 'ON') {
        showToast('You are now Available for donation. You will appear in searches.', 'success');
      } else {
        showToast('You are now Unavailable. You are hidden from donor searches.', 'warning');
      }
    } catch (err) {
      // 🔄 Rollback on error
      setProfile(prev => ({ ...prev, availability_status: currentStatus }));
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="profile-page flex-center">
        <Loader size={48} className="spin" color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Page Header */}
        <div className="profile-header-top">
          <div className="title-section">
            <h1 className="page-title-red">Donor Profile</h1>
            <p className="page-subtitle">Manage your public availability and personal details.</p>
          </div>
          <button className="btn-edit-profile" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <XCircle size={18} /> : <Pencil size={18} />} {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {/* Main Profile Card */}
        <div className="glass-card main-profile-card">
          <div className="profile-card-header">
            <div className="user-info-section">
              <div className="profile-image-container">
                <div className="avatar-circle" style={{ backgroundColor: getAvatarColor(formData.name), color: 'white', fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {(formData.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="user-text">
                <h2 className="user-name">{formData.name}</h2>
                <span className="blood-tag">{formData.blood_group || 'Unset'} Donor</span>
              </div>
            </div>

            <div className={`availability-status-box ${(profile?.availability_status || user?.availability_status) === 'ON' ? 'active' : 'inactive'}`}>
              <div className="status-text">
                <strong className={(profile?.availability_status || user?.availability_status) === 'ON' ? 'text-green' : 'text-red'}>
                  {(profile?.availability_status || user?.availability_status) === 'ON' ? 'Available for Donation' : 'Currently Unavailable'}
                </strong>
                <p>
                  {(profile?.availability_status || user?.availability_status) === 'ON' ? 'You will receive emergency alerts.' : 'You are hidden from searches.'}
                  <span className="last-active-time">
                    {(profile?.last_active_at || user?.last_active_at) && ` (Last active: ${new Date(profile?.last_active_at || user?.last_active_at).toLocaleTimeString()})`}
                  </span>
                </p>
              </div>
              <label className="custom-switch">
                <input
                  type="checkbox"
                  checked={(profile?.availability_status || user?.availability_status) === 'ON'}
                  onChange={toggleAvailability}
                />
                <span className="custom-slider"></span>
              </label>
            </div>
          </div>

          <div className="profile-divider"></div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="edit-profile-form">
              <div className="form-sections-container">
                {/* Core Profile Section */}
                <div className="form-section">
                  <h3><User size={18} /> Basic Information</h3>
                  <div className="form-grid-3">
                    <div className="form-group span-2">
                      <label>Full Name</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Blood Group</label>
                      <select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})}>
                        {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Address / Location</label>
                      <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions-sticky">
                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn-save-large" disabled={submitting}>
                  {submitting ? 'Saving Changes...' : 'Update My Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-display-sections">
              <div className="details-grid-2x2">
                <div className="detail-box">
                  <div className="icon-wrap"><User size={20} color="#e53935" /></div>
                  <div className="info-wrap">
                    <label>PERSONAL INFO</label>
                    <p>{formData.name}</p>
                    <span className="sub-info">{formData.email}</span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="icon-wrap"><Phone size={20} color="#e53935" /></div>
                  <div className="info-wrap">
                    <label>CONTACT DETAILS</label>
                    <p>{formData.phone || 'No phone set'}</p>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="icon-wrap"><MapPin size={20} color="#e53935" /></div>
                  <div className="info-wrap">
                    <label>LOCATION / ADDRESS</label>
                    <p>{formData.location || 'No location set'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
