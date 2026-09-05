import { Link, Navigate } from 'react-router-dom';
import { Heart, Droplet, Activity, Info, Table, ShieldCheck, Zap, Users, Star, Award, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImage from '../assets/blood_donation_hero.png';
import './Home.css';

export default function Home() {
  const { user } = useAuth();

  // Redirect returning users directly to their dashboard
  if (user) {
    return <Navigate to={user.role === 'admin' ? "/admin-dashboard" : "/donor-dashboard"} replace />;
  }
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Donate Blood Save Lives</h1>
          <p>The University Blood Management System empowers our community to act fast in emergencies. Your one donation can save up to three lives.</p>
          <div className="hero-actions" style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Link to="/search-donor" className="btn-primary">Find Blood</Link>
            <Link to="/register" className="btn-secondary">Donate</Link>
          </div>
        </div>
      </section>

      {/* Onboarding Steps */}
      <section className="onboarding-steps" style={{ margin: '4rem 0' }}>
        <div className="section-header center">
          <h2>How UBMS Works</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Join the university network in three simple steps.</p>
        </div>
        <div className="grid-3">
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
              <ShieldCheck size={30} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>1. Register Securely</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Create your account using your university email. You can opt-in as a verified donor to receive emergency alerts.</p>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
              <Zap size={30} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>2. Search or Request</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Use the smart search to find compatible donors nearby, or broadcast an emergency request to the entire network instantly.</p>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
              <Users size={30} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>3. Connect & Save Lives</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Securely connect with matches through the platform and coordinate the donation at your local hospital.</p>
          </div>
        </div>
      </section>
      
      {/* Importance of Blood Donation */}
      <section className="importance-section">
        <div className="glass-card">
          <div className="section-header">
            <Heart size={36} color="#d32f2f" />
            <h2>Why Donate Blood?</h2>
          </div>
          <div className="grid-2" style={{ alignItems: 'center' }}>
            <div>
              <h3>Every Drop Counts</h3>
              <p>Blood is essential for surgeries, cancer treatment, chronic illnesses, and traumatic injuries. Whether a patient receives whole blood, red cells, platelets, or plasma, this lifesaving care starts with one person making a generous donation.</p>
              <ul className="benefits-list">
                <li><Droplet size={20} color="#d32f2f" style={{ flexShrink: 0 }} /> 1 donation can save up to 3 lives.</li>
                <li><Activity size={20} color="#d32f2f" style={{ flexShrink: 0 }} /> Blood cannot be manufactured – it can only come from volunteer donors.</li>
                <li><Info size={20} color="#d32f2f" style={{ flexShrink: 0 }} /> A single car accident victim can require as many as 100 units of blood.</li>
              </ul>
            </div>
            <div className="importance-image-wrapper hover-lift">
              <img src={heroImage} alt="Blood Donation Community" style={{ width: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Blood Group Compatibility Chart */}
      <section className="compatibility-section">
        <div className="section-header center">
          <Table size={36} color="#d32f2f" />
          <h2>Blood Group Compatibility Matrix</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Learn which blood types are compatible for emergencies.</p>
        </div>
        <div className="glass-card table-container">
          <table className="compatibility-table">
            <thead>
              <tr>
                <th>Blood Type</th>
                <th>Can Donate To</th>
                <th>Can Receive From</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><span className="type-badge">A+</span></td><td>A+, AB+</td><td>A+, A-, O+, O-</td></tr>
              <tr><td><span className="type-badge">O+</span></td><td>O+, A+, B+, AB+</td><td>O+, O-</td></tr>
              <tr><td><span className="type-badge">B+</span></td><td>B+, AB+</td><td>B+, B-, O+, O-</td></tr>
              <tr><td><span className="type-badge">AB+</span></td><td>AB+ <small>(Universal Recipient)</small></td><td>Everyone</td></tr>
              <tr><td><span className="type-badge">A-</span></td><td>A+, A-, AB+, AB-</td><td>A-, O-</td></tr>
              <tr><td><span className="type-badge">O-</span></td><td>Everyone <small>(Universal Donor)</small></td><td>O-</td></tr>
              <tr><td><span className="type-badge">B-</span></td><td>B+, B-, AB+, AB-</td><td>B-, O-</td></tr>
              <tr><td><span className="type-badge">AB-</span></td><td>AB+, AB-</td><td>AB-, A-, B-, O-</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Trust Building: Success Stories */}
      <section className="success-stories" style={{ margin: '4rem 0' }}>
        <div className="section-header center">
          <Star size={36} color="var(--primary)" fill="rgba(var(--primary-rgb), 0.2)" />
          <h2>Community Impact</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Real stories from verified donors and recipients in our university.</p>
        </div>
        <div className="grid-3">
          <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', color: '#fbbf24', marginBottom: '1rem' }}>
              <Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" />
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              "I received an emergency alert during my lunch break. Within 20 minutes, I was at the hospital donating. The platform made coordinating so fast and seamless."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>S</div>
              <div>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Sarah M. <ShieldCheck size={14} color="var(--primary)" /></h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified Donor (O-)</span>
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', color: '#fbbf24', marginBottom: '1rem' }}>
              <Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" />
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              "When my roommate was in an accident, we used UBMS to request blood. We found three matching donors on campus instantly. I can't thank this community enough."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>J</div>
              <div>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>James T. <ShieldCheck size={14} color="var(--primary)" /></h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Requester</span>
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', color: '#fbbf24', marginBottom: '1rem' }}>
              <Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" /><Star size={18} fill="#fbbf24" />
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              "I've donated 4 times this year through UBMS. The automated reminders and digital tracking make it incredibly easy to stay consistent."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
              <div>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Alex R. <ShieldCheck size={14} color="var(--primary)" /></h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Top Donor (A+)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Building: Partnerships */}
      <section className="partnerships" style={{ margin: '4rem 0', padding: '3rem', background: 'rgba(var(--primary-rgb), 0.03)', borderRadius: '16px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Award size={24} color="var(--primary)" /> Recognized & Supported By
          </h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3rem', opacity: 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '600' }}><Building2 size={28} /> University Hospital</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '600' }}><Activity size={28} /> National Red Cross</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '600' }}><ShieldCheck size={28} /> Campus Health Dept</div>
        </div>
      </section>

    </div>
  );
}
