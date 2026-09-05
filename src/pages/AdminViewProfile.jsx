import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, 
  Droplet, Activity, User, Shield, Trash2, 
  AlertTriangle, Loader, 
  CheckCircle, XCircle, Clock, Map 
} from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './AdminViewProfile.css';

const API = import.meta.env.VITE_API_URL || '';

export default function AdminViewProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}`, { headers: authHeaders() });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');
      
      setData(result.user);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, authHeaders, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete user');
      
      showToast('User deleted successfully', 'success');
      navigate('/manage-donors');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="profile-loading">
          <Loader size={48} className="spin" color="var(--primary)" />
          <p>Fetching full donor profile record...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="profile-error">
          <AlertTriangle size={64} color="#ef4444" />
          <h2>User Profile Not Found</h2>
          <p>{error || "We couldn't find the profile you're looking for or it may have been removed."}</p>
          <Link to="/manage-donors" className="btn-back">
            <ArrowLeft size={18} /> Back to Donor List
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { stats, donor_info } = data;
  const avatarColor = getAvatarColor(data.name);

  return (
    <AdminLayout>
      <div className="admin-profile-container">
        {/* Top Header */}
        <div className="profile-header-nav">
          <button onClick={() => navigate(-1)} className="btn-icon-back">
            <ArrowLeft size={20} />
          </button>
          <h1>User Record: #{data.id}</h1>
          <div className="badge-row">
            <span className={`status-pill ${data.status === 'active' ? 'active' : 'blocked'}`}>
              {data.status === 'active' ? 'Account Active' : 'Account Blocked'}
            </span>
            <span className="role-badge">{data.role.toUpperCase()}</span>
          </div>
        </div>

        <div className="profile-grid">
          {/* Main Info Card */}
          <div className="profile-card main-info">
            <div className="profile-cover" style={{ background: `linear-gradient(135deg, ${avatarColor}, #1e293b)` }} />
            <div className="profile-main-content">
              <div className="profile-avatar-wrap">
                <div 
                  className="profile-large-avatar"
                  style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
                >
                  {getInitials(data.name)}
                </div>
                <div className={`availability-dot ${data.availability_status === 'ON' ? 'online' : 'offline'}`} />
              </div>

              <div className="profile-names">
                <h2>{data.name}</h2>
                <p>Registered as: {data.role === 'donor' ? 'Blood Donor' : 'Basic User'}</p>
                <div className="profile-badges">
                  <div className="blood-type-badge">
                    <Droplet size={18} />
                    <span>{data.blood_group}</span>
                  </div>
                  <div className={`availability-badge ${data.availability_status === 'ON' ? 'on' : 'off'}`}>
                    {data.availability_status === 'ON' ? <CheckCircle size={16} /> : <Clock size={16} />}
                    {data.availability_status === 'ON' ? 'Available to Donate' : 'Currently Unavailable'}
                  </div>
                </div>
              </div>

              <div className="profile-quick-stats">
                <div className="stat-item">
                  <strong>{stats.donation_count}</strong>
                  <span>Donations</span>
                </div>
                <div className="divider" />
                <div className="stat-item">
                  <strong>{stats.request_count}</strong>
                  <span>Requests</span>
                </div>
                <div className="divider" />
                <div className="stat-item">
                  <strong>{donor_info?.health_status || 'Good'}</strong>
                  <span>Health</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="profile-card info-section">
            <h3><User size={18} /> Personal & Contact Info</h3>
            <div className="info-list">
              <div className="info-item">
                <Mail size={16} />
                <div className="info-val">
                  <label>Email Address</label>
                  <span>{data.email}</span>
                </div>
              </div>
              <div className="info-item">
                <Phone size={16} />
                <div className="info-val">
                  <label>Phone Number</label>
                  <span>{data.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <Calendar size={16} />
                <div className="info-val">
                  <label>Age & Gender</label>
                  <span>{data.age || 'N/A'} Yrs • {data.gender || 'Not specified'}</span>
                </div>
              </div>
              <div className="info-item">
                <MapPin size={16} />
                <div className="info-val">
                  <label>Service Area/Location</label>
                  <span>{data.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Address & Geography */}
          <div className="profile-card info-section">
            <h3><Map size={18} /> Detailed Address</h3>
            <div className="info-list">
              <div className="info-item">
                <MapPin size={16} />
                <div className="info-val">
                  <label>Street Address</label>
                  <span>{data.address || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <Map size={16} />
                <div className="info-val">
                  <label>State & Pincode</label>
                  <span>{data.state || 'N/A'} - {data.pincode || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <Activity size={16} />
                <div className="info-val">
                  <label>Emergency Contact</label>
                  <span>{data.emergency_contact || 'None added'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="profile-card info-section">
            <h3><Shield size={18} /> Account System Data</h3>
            <div className="info-list">
              <div className="info-item">
                <Clock size={16} />
                <div className="info-val">
                  <label>Member Since</label>
                  <span>{new Date(data.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                </div>
              </div>
              <div className="info-item">
                <Clock size={16} />
                <div className="info-val">
                  <label>Last Activity</label>
                  <span>{data.last_active_at ? new Date(data.last_active_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>
              <div className="info-item">
                <Activity size={16} />
                <div className="info-val">
                  <label>Last Donation Date</label>
                  <span>{donor_info?.last_donation_date ? new Date(donor_info.last_donation_date).toLocaleDateString() : 'No record found'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="profile-card actions-panel">
            <h3>Quick Administrative Actions</h3>
            <p>Modify user access or perform maintenance tasks.</p>
            <div className="action-buttons">
              <a href={`mailto:${data.email}`} className="btn-action mail">
                <Mail size={18} /> Send Official Email
              </a>
              <button 
                className="btn-action delete" 
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
              >
                {deleting ? <Loader size={18} className="spin" /> : <Trash2 size={18} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-wrap">
              <AlertTriangle size={32} />
            </div>
            <h2>Delete User</h2>
            <p>
              Are you sure you want to permanently delete <strong>{data.name}</strong>? 
              This action cannot be undone and will remove all related requests and history.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowDeleteModal(false)} 
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader size={18} className="spin" /> : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
