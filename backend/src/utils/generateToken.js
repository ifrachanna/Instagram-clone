import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token valid for 7 days
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {string} - Signed JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'instagram_clone_super_secret_jwt_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

export default generateToken;
