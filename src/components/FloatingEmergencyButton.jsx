import { Link, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FloatingEmergencyButton() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide on admin routes or if user is admin
  const isAdminRoute = location.pathname.startsWith('/admin') || 
                       location.pathname.startsWith('/manage-');
                       
  const isAdmin = user?.role === 'admin';

  if (isAdminRoute || isAdmin) return null;

  return (
    <Link to="/request-blood" className="floating-emergency-btn">
      <AlertCircle size={20} /> Emergency Request
    </Link>
  );
}
