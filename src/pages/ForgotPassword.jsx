import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send OTP.');
        return;
      }

      setSuccess('OTP sent successfully to your email.');
      setTimeout(() => {
        navigate('/verify-otp', { state: { email } });
      }, 1500);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Network error or backend server is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ maxWidth: '450px', margin: '4rem auto', animation: 'fadeIn 0.4s ease-out' }}>
      <div className="glass-card" style={{ borderTop: '4px solid var(--primary)', padding: '3rem 2rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(211,47,47,0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <KeyRound size={36} color="var(--primary)" />
          </div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '2.2rem' }}>Forgot Password?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Enter your registered email to receive an OTP.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#16a34a', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <CheckCircle size={20} />
            <span style={{ fontWeight: '500' }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>Email Address</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
              placeholder="student@university.edu"
              required
              disabled={loading || success}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || success}
            style={{ width: '100%', marginBottom: '1.5rem', marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: (loading || success) ? 0.7 : 1 }}
          >
            {loading ? <><Loader2 size={20} className="spin" /> Sending OTP...</> : 'Send OTP'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '1.05rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <p style={{ margin: 0 }}>Remember your password? <Link to="/login" style={{ fontWeight: '700', color: 'var(--primary)' }}>Log in here</Link></p>
        </div>
      </div>
    </div>
  );
}
