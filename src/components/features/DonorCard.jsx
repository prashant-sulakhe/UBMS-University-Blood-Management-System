import { MapPin, CheckCircle, Phone, ShieldCheck, Clock, XCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function DonorCard({ donor, onContact }) {
  const isAvailable = donor.availability_status === 'ON';
  
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const palette = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#22c55e"];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  };

  // Format last active time
  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Offline';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000 / 60);
    if (diff < 1) return 'Active Now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff/60)}h ago`;
  };

  return (
    <div className={`donor-card glass-card hover-lift ${!isAvailable ? 'offline-dim' : ''}`}>
      <div className="donor-card-header">
        <div 
          className="donor-avatar-med" 
          style={{ background: `linear-gradient(135deg, ${getAvatarColor(donor.name)}, ${getAvatarColor(donor.name)}dd)`, color: 'white' }}
        >
          {getInitials(donor.name)}
        </div>
        <div className="donor-info-top">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {donor.name}
            <ShieldCheck size={16} color="var(--primary)" fill="rgba(var(--primary-rgb), 0.1)" title="Verified Donor" />
          </h4>
          <span className="donor-id" style={{ color: isAvailable ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
             ● {formatLastActive(donor.last_active_at)}
          </span>
        </div>
        <div className="blood-group-badge-large">{donor.blood_group}</div>
      </div>
      
      <div className="donor-card-body">
        <div className="donor-detail">
          <MapPin size={16} color="var(--text-muted)" />
          <span>{(!donor.city?.includes('@') && donor.city) || (!donor.location?.includes('@') && donor.location) || 'Location not specified'}</span>
        </div>
        <div className="donor-detail">
          {isAvailable ? (
            <>
              <CheckCircle size={16} color="var(--success)" />
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>Available for Donation</span>
            </>
          ) : (
            <>
              <XCircle size={16} color="var(--error)" />
              <span style={{ color: 'var(--error)', fontWeight: 500 }}>Currently Unavailable</span>
            </>
          )}
        </div>
        <div className="donor-detail">
          <Clock size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem' }}>
            Last Donation: {donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'Never'}
          </span>
        </div>
      </div>
      
      <div style={{ marginTop: '1.5rem' }}>
        <Link to={`/profile/${donor.user_id || donor.donor_id}`} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', textDecoration: 'none', padding: '0.8rem', borderRadius: '10px' }}>
          <User size={18} /> View Full Profile
        </Link>
      </div>
    </div>
  );
}
