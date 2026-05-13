const jwt = require('jsonwebtoken');

// ── Main auth middleware ──────────────────────────────
// Attach this to any route that requires login
const authenticateToken = (req, res, next) => {
  // Token must be sent in the Authorization header
  // Format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract after "Bearer "

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify the token using our JWT_SECRET from .env
    // If the token was tampered with, this throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user info to the request
    // Now any route handler can access req.user.id, req.user.role etc.
    req.user = decoded;
    next(); // Token is valid — continue to the route handler
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.'
    });
  }
};

// ── Role check middleware factory ─────────────────────
// Usage: requireRole('admin') or requireRole('editor', 'admin')
// Always use AFTER authenticateToken
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next(); // Role is allowed — continue
  };
};

module.exports = { authenticateToken, requireRole };