import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthLogin.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  // Toggle state: 'user' or 'admin'
  const [mode, setMode] = useState(() => {
    return searchParams.get('tab') === 'admin' ? 'admin' : 'user';
  });

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when switching tabs
  useEffect(() => {
    setFormData({ email: '', password: '' });
    setError('');
  }, [mode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError(mode === 'admin'
        ? 'Please fill in both admin email and password.'
        : 'Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'admin' ? '/admin/login' : '/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (mode === 'admin' ? 'Invalid Admin Credentials' : 'Login failed.'));
      }

      // Store token and user data in context
      login(data.token, data.user);

      // Redirect based on role
      if (data.user.role === 'admin' || mode === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/donor-dashboard');
      }
    } catch (err) {
      console.error(`${mode} login error:`, err);
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        setError('Connection refused. Is the backend server running?');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = mode === 'admin';

  return (
    <div className="auth-page-unified">
      <div className="auth-card">

        {/* ── Toggle Tabs ─────────────────────────────── */}
        <div className="auth-toggle-wrapper">
          <div className="auth-toggle">
            <button
              type="button"
              className={`auth-toggle-btn user-hover ${!isAdmin ? 'active user-active' : ''}`}
              onClick={() => setMode('user')}
            >
              <LogIn size={18} />
              User Login
            </button>
            <button
              type="button"
              className={`auth-toggle-btn admin-hover ${isAdmin ? 'active admin-active' : ''}`}
              onClick={() => setMode('admin')}
            >
              <ShieldCheck size={18} />
              Admin Login
            </button>
          </div>
        </div>

        {/* ── Auth Body ──────────────────────────────── */}
        <div className="auth-body">

          {/* Header with icon */}
          <div className="auth-header" key={mode}>
            <div className={`auth-icon-circle ${isAdmin ? 'admin-theme' : 'user-theme'}`}>
              {isAdmin
                ? <ShieldCheck size={36} color="#1f2937" />
                : <LogIn size={36} color="var(--primary)" />
              }
            </div>
            <h2>{isAdmin ? 'Admin Portal' : 'Welcome Back'}</h2>
            <p>{isAdmin
              ? 'Secure access for system administrators.'
              : 'Log in to access your donor dashboard.'
            }</p>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <div className="auth-forms-slider">
            <form onSubmit={handleSubmit} className="auth-form-panel" key={`form-${mode}`}>
              <div className="auth-field">
                <label>{isAdmin ? 'Admin Email Address' : 'Email Address'}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isAdmin ? 'admin@example.com' : 'student@university.edu'}
                  required
                  disabled={loading}
                  className={`auth-input ${isAdmin ? 'admin-focus' : ''}`}
                />
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label>{isAdmin ? 'Admin Password' : 'Password'}</label>
                  {!isAdmin && (
                    <Link to="/forgot-password" className="auth-forgot-link">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className={`auth-input ${isAdmin ? 'admin-focus' : ''}`}
                />
              </div>

              <button
                type="submit"
                className={`auth-submit ${isAdmin ? 'admin-btn' : 'user-btn'}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="auth-spinner" />
                    {isAdmin ? 'Authenticating...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {isAdmin ? <ShieldCheck size={20} /> : <LogIn size={20} />}
                    {isAdmin ? 'Authorize Login' : 'Sign In'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        {!isAdmin && (
          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
