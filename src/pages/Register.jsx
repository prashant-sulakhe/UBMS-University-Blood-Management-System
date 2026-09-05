import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bloodGroup: '',
    location: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.location.includes('@')) {
      setError('Location / Address cannot be an email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          blood_group: formData.bloodGroup,
          location: formData.location,
          role: 'donor',            // all self-registrations are donors
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ maxWidth: '650px', margin: '3rem auto', animation: 'fadeIn 0.4s ease-out' }}>
      <div className="glass-card" style={{ borderTop: '4px solid var(--primary)', padding: '3rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <UserPlus size={56} color="var(--primary)" strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.8rem', fontSize: '2.2rem' }}>Donor Registration</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Join our community today. One donation can save up to three lives.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: '500' }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              required
              disabled={loading}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@university.edu"
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Blood Group</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Address / Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Engineering Block"
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', marginTop: '1.5rem', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass-bg)' }}>
            <input type="checkbox" required style={{ width: 'auto', marginTop: '0.2rem', transform: 'scale(1.2)' }} />
            <label style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 'normal', margin: 0, lineHeight: '1.6' }}>
              I agree to the privacy policy and consent to my contact information being shared securely with verified requesters in emergency situations.
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginBottom: '1.5rem', marginTop: '2rem', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <><Loader2 size={20} className="spin" /> Creating Account...</> : 'Register Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '1.05rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <p style={{ margin: 0 }}>Already a registered donor? <Link to="/login" style={{ fontWeight: '700', color: 'var(--primary)' }}>Login here</Link></p>
        </div>
      </div>
    </div>
  );
}
