import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import './Contact.css';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, sending, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong');

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="contact-page">
      <div className="page-header">
        <h1>Contact Us</h1>
        <p>We're here to help. Reach out to our team if you have any questions or need assistance.</p>
      </div>

      <div className="contact-grid">
        {/* Contact Form */}
        <div className="glass-card form-container">
          <h2 style={{ marginBottom: '2rem', color: 'var(--primary-dark)' }}>Send a Message</h2>
          
          {status === 'success' ? (
            <div className="success-message">
              <CheckCircle2 size={48} color="var(--success)" />
              <h3 style={{ margin: '1rem 0' }}>Message Sent!</h3>
              <p>Thank you for reaching out. Our team will get back to you shortly.</p>
              <button 
                onClick={() => setStatus('idle')} 
                className="btn-outline" 
                style={{ marginTop: '1.5rem' }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="Your Full Name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="Your University Email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea 
                  rows="6" 
                  placeholder="How can we help you?" 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                ></textarea>
              </div>

              {status === 'error' && (
                <div className="error-status">
                  <AlertCircle size={18} /> {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary contact-submit-btn" 
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending...' : (
                  <><Send size={18} /> Send Message</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Contact Information */}
        <div className="contact-info-panel">
          
          <div className="glass-card emergency-card">
            <div className="info-header">
              <Phone color="#fff" size={28} />
              <h3 style={{ margin: 0, color: '#fff' }}>Immediate Assistance</h3>
            </div>
            <p className="emergency-text">
              <strong>+1 (800) 123-4567</strong><br/>
              Call the 24/7 Emergency Resource hotline immediately if you require urgent guidance or system assistance.
            </p>
          </div>

          <div className="glass-card info-card">
            <div className="info-header">
              <MapPin color="#d32f2f" size={24} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>University Campus</h3>
            </div>
            <p className="info-text">
              Student Health Center, Building C<br/>
              Room 102<br/>
              Open Mon-Fri, 9:00 AM - 5:00 PM
            </p>
          </div>
          
          <div className="glass-card info-card">
            <div className="info-header">
              <Mail color="#d32f2f" size={24} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Email Support</h3>
            </div>
            <p className="info-text">
              General Inquiries: ubms.support@gmail.com<br/>
              System Admin: ubms.support@gmail.com
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
