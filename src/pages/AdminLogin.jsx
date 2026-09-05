import { Navigate } from 'react-router-dom';

/**
 * AdminLogin is now a redirect to the unified Login page with `` tab=admin.
 * This preserves any bookmarked /admin-login URLs.
 */
export default function AdminLogin() {
  return <Navigate to="/login?tab=admin" replace />;
}
