import { Shield, Clock, Heart, Activity, CheckCircle } from 'lucide-react';
import './About.css';

export default function About() {
  return (
    <div className="about-page">
      <div className="page-header">
        <h1>About UBMS</h1>
        <p>Learn more about our mission to secure a stable blood supply for our university community.</p>
      </div>

      {/* Purpose and Emergency Platform Section */}
      <div className="about-grid">
        <div className="glass-card about-highlight">
          <div className="icon-wrapper primary"><Shield size={32} /></div>
          <h2>Our Purpose</h2>
          <p>
            The University Blood Management System (UBMS) was founded with a singular purpose: 
            to instantly connect staff and students in medical emergencies with willing blood donors 
            on campus. By leveraging our close-knit community, we eliminate critical delays associated 
            with traditional blood banks and ensure that everyone within our institution has 
            immediate access to life-saving transfusions.
          </p>
        </div>
        
        <div className="glass-card about-highlight">
          <div className="icon-wrapper secondary"><Clock size={32} /></div>
          <h2>Emergency Response Platform</h2>
          <p>
            In critical situations, every minute matters. Our platform features an <strong>Emergency Broadcast System</strong> that instantly notifies compatible donors across the university the second a request is placed. 
            By pinging donors by exact blood match and physical location, we ensure the fastest possible response times.
          </p>
          <ul className="action-list">
            <li><CheckCircle size={18} color="#d32f2f" /> <span>Instant matching and notifications</span></li>
            <li><CheckCircle size={18} color="#d32f2f" /> <span>Geo-located nearest donor alerts</span></li>
            <li><CheckCircle size={18} color="#d32f2f" /> <span>Secure and confidential patient requests</span></li>
          </ul>
        </div>
      </div>

      {/* Information and Benefits Section */}
      <div className="section-divider">
        <h2>The Power of Donating</h2>
      </div>
      
      <div className="grid-2">
        <div className="glass-card">
          <div className="card-heading">
            <Activity color="#d32f2f" size={28} />
            <h3>Understanding Blood Donation</h3>
          </div>
          <p className="description-text">
            Blood donation is a safe, simple procedure that takes only about 10-15 minutes. 
            An average adult has about 10 pints of blood in their body, and a typical donation is just 1 pint. 
            Your body quickly replaces the lost fluids within 24 hours, and the red blood cells within a few weeks. 
            By maintaining a strong donor network on campus, we can ensure that patients undergoing surgeries, 
            cancer treatments, or experiencing trauma always have a reliable, on-demand supply.
          </p>
        </div>

        <div className="glass-card">
          <div className="card-heading">
            <Heart color="#d32f2f" size={28} />
            <h3>Benefits of Donating</h3>
          </div>
          <ul className="benefits-details-list">
            <li>
              <strong>Saves Lives:</strong> The most significant benefit is saving up to 3 lives per single donation session.
            </li>
            <li>
              <strong>Free Health Check:</strong> Every donation includes a mini-physical checking pulse, blood pressure, body temperature, and hemoglobin levels.
            </li>
            <li>
              <strong>Community Bonding:</strong> Cultivates a culture of mutual support and solidarity across the entire university ecosystem.
            </li>
            <li>
              <strong>Personal Wellness:</strong> Regular blood donation can help reduce harmful excess iron levels in the blood, promoting better cardiovascular health.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
