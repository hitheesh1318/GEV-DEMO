// ============================================================
//  GE-Vernona Express + MongoDB Backend Server
//  Production-ready configuration with modular structure
// ============================================================

const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

const dns=require("dns");
dns.setServers(["1.1.1.1","8.8.8.8"]);

// Import configuration and middleware
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const employeeRoutes = require("./routes/employees");
const attendanceRoutes = require("./routes/attendance");
const attritionRoutes = require("./routes/attrition");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - MUST come before routes
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
    },
  }),
);

// Serve static files from the public directory
const publicPath = path.resolve(__dirname, "../public");
app.use(express.static(publicPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(publicPath, "index.html"));
});


// ============================================================
// DATABASE CONNECTION
// ============================================================
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB");
  // Optionally exit or continue running
  // process.exit(1);
});

// ============================================================
// API ROUTES
// ============================================================

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "🚀 Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

// Valid credentials (in production, use a database and hash passwords with bcrypt)
const VALID_CREDENTIALS = {
  wfm: "123456",
  tl: "123456",
  manager: "123456",
};

// POST /api/auth/login - Authenticate user and create session
app.post("/api/auth/login", (req, res) => {
  const { role, password } = req.body;

  // Validate input
  if (!role || !password) {
    return res.status(400).json({ error: "Role and password are required" });
  }

  // Validate credentials
  if (!VALID_CREDENTIALS[role] || VALID_CREDENTIALS[role] !== password) {
    return res.status(401).json({ error: "Invalid role or password" });
  }

  // Create session
  req.session.user = {
    role,
    loginTime: new Date().toISOString(),
  };

  console.log(`✅ User logged in: ${role}`);
  res.json({
    authenticated: true,
    user: req.session.user,
    message: `Welcome, ${role}!`,
  });
});

// POST /api/auth/logout - Destroy session
app.post("/api/auth/logout", (req, res) => {
  const userRole = req.session.user?.role || "unknown";
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    console.log(`✅ User logged out: ${userRole}`);
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// GET /api/auth/session - Check current session status
app.get("/api/auth/session", (req, res) => {
  if (req.session.user) {
    return res.json({
      authenticated: true,
      user: req.session.user,
    });
  }
  res.json({
    authenticated: false,
    user: null,
  });
});

// ============================================================
// PROTECTED ROUTES MIDDLEWARE (Optional - for future use)
// ============================================================

// Example: Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized - please login first" });
  }
  next();
};

// ============================================================
// EMPLOYEE, ATTENDANCE, ATTRITION ROUTES
// ============================================================

// Employees API
app.use("/api/employees", employeeRoutes);

// Attendance API
app.use("/api/attendance", attendanceRoutes);

// Attrition API
app.use("/api/attrition", attritionRoutes);

// ============================================================
// CATCH-ALL ROUTE FOR SPA
// ============================================================
app.use((req, res, next) => {
  // If it's an API route not found, return 404
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  // Otherwise serve index.html for SPA routing
  res.sendFile(path.resolve(publicPath, "index.html"));
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🌐 Dashboard available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("⚠️  SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});
