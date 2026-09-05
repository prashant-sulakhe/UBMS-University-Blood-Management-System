import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingEmergencyButton from './components/FloatingEmergencyButton';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';

import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import SearchDonor from './pages/SearchDonor';
import RequestBlood from './pages/RequestBlood';
import DonorDashboard from './pages/DonorDashboard';
import DonorProfile from './pages/DonorProfile';
import AdminDashboard from './pages/AdminDashboard';
import ManageDonors from './pages/ManageDonors';
import ManageRequests from './pages/ManageRequests';
import DonationTracking from './pages/DonationTracking';
import PublicProfile from './pages/PublicProfile';
import AdminViewProfile from './pages/AdminViewProfile';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ubms_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ubms_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AuthProvider>
      <ToastProvider>
      <SocketProvider>
      <Router>
        <div className="app-container">
          <Navbar theme={theme} toggleTheme={toggleTheme} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              
              <Route path="/search-donor" element={<SearchDonor />} />
              <Route path="/request-blood" element={<RequestBlood />} />
              <Route path="/tracking" element={<DonationTracking />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />              
              <Route path="/donor-dashboard" element={<DonorDashboard />} />
              <Route path="/donor-profile" element={<DonorProfile />} />
              
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/manage-donors" element={<ManageDonors />} />
              <Route path="/admin/view-profile/:userId" element={<AdminViewProfile />} />
              <Route path="/manage-requests" element={<ManageRequests />} />
            </Routes>
          </main>
          <Footer />
          <FloatingEmergencyButton />
        </div>
      </Router>
      </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
