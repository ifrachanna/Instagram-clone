import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware: validates Bearer token and attaches authenticated user to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header (Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'instagram_clone_super_secret_jwt_key_2026'
      );

      // Fetch user from DB excluding password
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'The user belonging to this token no longer exists.',
        });
      }

      // Attach user object to request
      req.user = user;
      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Your session has expired. Please log in again.',
        });
      }

      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization token. Access denied.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. No authorization token was provided.',
    });
  }
};

/**
 * Optional Auth middleware: checks token if provided, but does not block if omitted
 */
export const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'instagram_clone_super_secret_jwt_key_2026'
      );
      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      // Ignore token failure on public routes
      req.user = null;
    }
  }
  next();
};

