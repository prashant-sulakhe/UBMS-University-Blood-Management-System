import { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

const TOKEN_KEY = 'ubms_token';
const USER_KEY  = 'ubms_user';

/**
 * Decode a JWT payload to check its expiry (no signature verification).
 * Returns true if the token is still valid, false otherwise.
 */
function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 > Date.now() : true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    // Restore session only if the token hasn't expired
    if (token && savedUser && isTokenValid(token)) {
      return JSON.parse(savedUser);
    }

    // Clean up any stale data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  });

  /**
   * Call after a successful POST /login response.
   * @param {string} token    - JWT from the backend
   * @param {object} userData - Full user object from the backend (id, name, email, role, …)
   */
  const login = (token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  /** Returns the stored JWT for authenticated API calls (Authorization header). */
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
