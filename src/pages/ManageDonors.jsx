import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, RefreshCw, Loader, CheckCircle, XCircle, Trash2, Shield, AlertTriangle, MapPin, Droplet, Wifi, WifiOff } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import './ManageDonors.css';

const API = import.meta.env.VITE_API_URL || '';

export default function ManageDonors() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null); // { id, name }

  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${getToken()}`
  }), [getToken]);

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

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/donor/admin/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch donors');
      const data = await res.json();
      setDonors(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  // Real-time listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('donor_profile_updated', fetchDonors);
    socket.on('availability_updated', fetchDonors);
    socket.on('donor_removed', fetchDonors);

    return () => {
      socket.off('donor_profile_updated');
      socket.off('availability_updated');
      socket.off('donor_removed');
    };
  }, [socket, fetchDonors]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingId(userToDelete.id);
    
    try {
      const res = await fetch(`${API}/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');

      showToast('User deleted successfully', 'success');
      
      // Update state instantly and fetch to be sure
      setDonors(prev => prev.filter(d => d.user_id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDonors = donors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <header className="dashboard-header">
        <div className="header-main">
          <div>
            <h1>Manage Donors</h1>
            <p>Monitor and manage all registered blood donors in real-time.</p>
          </div>
          <div className="header-actions">
            <span className={`live-badge ${connected ? 'active' : ''}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? 'Live Sync' : 'Reconnecting'}
            </span>
            <button onClick={fetchDonors} className="btn-refresh" title="Refresh">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M21 2v6h-6"></path>
                <path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="glass-card table-panel">
        <div className="panel-top">
          <div className="search-wrap">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by name, city, blood group..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="count-badge">
            <Users size={16} />
            <span>{filteredDonors.length} Donors Found</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="spin" />
            <p>Loading donors from TiDB Cloud...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="donor-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Contact</th>
                  <th>Blood Group</th>
                  <th>Location</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonors.length > 0 ? filteredDonors.map(donor => {
                  const daysSince = donor.last_donation_date 
                    ? Math.floor((new Date() - new Date(donor.last_donation_date)) / (1000 * 60 * 60 * 24))
                    : 999;
                  const isAvailable = donor.availability_status === 'ON';
                  const isEligible = daysSince >= 90 && isAvailable;

                  return (
                    <tr key={donor.donor_id}>
                      <td>
                        <div className="user-info">
                          <div className="avatar" style={{ 
                            background: `linear-gradient(135deg, ${getAvatarColor(donor.name)}, ${getAvatarColor(donor.name)}dd)`, 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '1rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}>
                            {getInitials(donor.name)}
                          </div>
                          <div className="details">
                            <strong style={{ fontSize: '1rem' }}>{donor.name}</strong>
                            <span>{donor.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{donor.phone}</td>
                      <td>
                        <span className="blood-badge">{donor.blood_group}</span>
                      </td>
                      <td>
                        <div className="location-info">
                          <MapPin size={14} />
                          <span>{donor.city}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`status-pill ${isAvailable ? 'available' : 'unavailable'}`}>
                          {isAvailable ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {isAvailable ? 'Available' : 'Not Available'}
                        </div>
                      </td>
                      <td>
                        <div className="action-row">
                          <Link 
                            to={`/admin/view-profile/${donor.user_id}`} 
                            className="btn-view-profile"
                            title="View Full Profile"
                          >
                            <Shield size={16} />
                            <span>View</span>
                          </Link>
                          <button 
                            className="btn-delete-donor" 
                            onClick={() => setUserToDelete({ id: donor.user_id, name: donor.name })} 
                            title="Permanently Delete User"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <AlertTriangle size={48} />
                        <p>No donors found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="modal-overlay" onClick={() => !deletingId && setUserToDelete(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-wrap">
              <AlertTriangle size={32} />
            </div>
            <h2>Delete User</h2>
            <p>
              Are you sure you want to permanently delete <strong>{userToDelete.name}</strong>? 
              This action cannot be undone and will remove all related requests and history.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setUserToDelete(null)} 
                disabled={deletingId !== null}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={handleDeleteUser}
                disabled={deletingId !== null}
              >
                {deletingId ? <Loader size={18} className="spin" /> : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
