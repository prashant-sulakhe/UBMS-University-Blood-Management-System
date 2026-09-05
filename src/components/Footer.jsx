import { Link } from 'react-router-dom';
import { Droplet } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-col">
          <div className="footer-brand">
            <Droplet color="#ff6659" size={24} fill="#ff6659" />
            UBMS
          </div>
          <p className="footer-desc">
            University Blood Management System. Saving lives through seamless cooperation and rapid emergency response.
          </p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Blood Services</h4>
          <ul className="footer-links">
            <li><Link to="/search-donor">Find a Donor</Link></li>
            <li><Link to="/request-blood">Request Blood</Link></li>
            <li><Link to="/register">Register as Donor</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Admin</h4>
          <ul className="footer-links">
            <li><Link to="/login?tab=admin">Admin Portal</Link></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} University Blood Management System. All rights reserved.</p>
      </div>
    </footer>
  );
}
