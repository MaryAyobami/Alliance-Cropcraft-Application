const jwt = require("jsonwebtoken");

// JWT authentication middleware (matches existing server.js implementation)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Admin guard middleware
function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === 'Admin User' || role === 'Admin') {
    return next();
  }
  return res.status(403).json({ 
    success: false,
    message: 'Admin access required' 
  });
}

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }

    next();
  };
};

// Enhanced role checking for new roles
const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
    });
  };
};

// Check if user can access specific livestock (for pen assignments)
const checkLivestockAccess = async (req, res, next) => {
  try {
    const { pool } = require("../pool");
    const userId = req.user.userId;
    const userRole = req.user.role;
    const livestockId = req.params.id;

    // Admin and Farm Manager have access to everything
    if (['Admin', 'Admin User', 'Farm Manager'].includes(userRole)) {
      return next();
    }

    // For attendants, check if they're assigned to the pen containing this livestock
    if (userRole === 'Farm Attendant') {
      const accessQuery = `
        SELECT l.id 
        FROM livestock l
        JOIN pens p ON l.pen_id = p.id
        JOIN pen_assignments pa ON p.id = pa.pen_id
        WHERE l.id = $1 AND pa.attendant_id = $2 AND pa.is_active = true
      `;
      
      const result = await pool.query(accessQuery, [livestockId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this livestock record'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Livestock access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Access verification failed'
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  authorize,
  requireRole,
  checkLivestockAccess
};