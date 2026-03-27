// ============================================================
//  Authentication & Session Middleware
// ============================================================

const VALID_CREDENTIALS = {
  wfm: "123456",
  tl: "123456",
  manager: "123456",
};

// Middle ware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized. Please login first." });
  }
  next();
};

// Login endpoint
const login = (req, res) => {
  try {
    const { role, password } = req.body;

    if (!role || !password) {
      return res.status(400).json({ error: "Role and password are required" });
    }

    if (!VALID_CREDENTIALS[role]) {
      return res.status(401).json({ error: "Invalid role" });
    }

    if (VALID_CREDENTIALS[role] !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session
    req.session.user = {
      role,
      loginTime: new Date(),
    };

    res.json({
      success: true,
      message: `Welcome ${role.toUpperCase()}`,
      user: req.session.user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Logout endpoint
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
};

// Get current session
const getSession = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.session.user,
  });
};

module.exports = {
  requireAuth,
  login,
  logout,
  getSession,
};
