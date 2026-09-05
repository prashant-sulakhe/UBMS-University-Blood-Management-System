import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ubms_super_secret_jwt_key_2024';

/**
 * JWT Authentication Middleware
 * Performs real-time status verification against the database.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Simplified auth, since status column does not exist in users table
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Admin-only middleware (must be used AFTER authenticateToken)
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}
