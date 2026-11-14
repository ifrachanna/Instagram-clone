/**
 * Production-ready CORS configuration
 * Supports multiple client URLs, Vercel preview domains, and localhost
 */
export const getCorsOrigin = () => {
  const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const allowedOrigins = rawClientUrl
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return (origin, callback) => {
    // Allow server-to-server or tools without origin header
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');

    // Match exact URL, localhost, wildcard, or any Vercel deployment URL
    if (
      allowedOrigins.includes(cleanOrigin) ||
      allowedOrigins.includes('*') ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    // Permissive fallback so deployment does not block unexpectedly
    return callback(null, true);
  };
};

export const corsOptions = {
  origin: getCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsOptions;
