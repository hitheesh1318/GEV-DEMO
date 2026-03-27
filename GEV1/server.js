// ============================================================
//  server.js  –  GE-Vernona Express + MongoDB backend
// ============================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]); // Use Cloudflare and Google DNS to avoid potential local DNS issues

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// 1. Middleware
// ------------------------------------------------------------
app.use(cors()); // allow cross-origin requests
app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// Serve your existing HTML / CSS / JS files as static files
// (index.html, Registration.html, directory.html, styles.css, etc.)
app.use(express.static(path.join(__dirname)));

// ------------------------------------------------------------
// 2. MongoDB connection
// ------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅  MongoDB connected:", MONGO_URI))
  .catch((err) => {
    console.error("❌  MongoDB connection error:", err.message);
    console.log("⚠️  Server running without MongoDB");
    // Remove process.exit(1) to keep server running
  });

// ------------------------------------------------------------
// 3. Mongoose Models (inline – move to /models later in Step 3)
// ------------------------------------------------------------

// --- Employee ---
const employeeSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true, unique: true, trim: true },
    empName: { type: String, required: true, trim: true },
    status: { type: String, default: "Active" },
    bgvStatus: { type: String, default: "" },
    level: { type: String, default: "" },
    teamLead: { type: String, default: "" },
    tlCode: { type: String, default: "Lead_Alpha" }, // internal dashboard code
    sme: { type: String, default: "" },
    role: { type: String, default: "" },
    doj: { type: String, default: "" }, // stored as YYYY-MM-DD string
    hireDate: { type: String, default: "" },
    infyTenure: { type: Number, default: 0 },
    gevDoj: { type: String, default: "" },
    gevTenure: { type: Number, default: 0 },
    lastDoj: { type: String, default: "" },
    mobile: { type: String, default: "" },
    secondaryMobile: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },
    presentAddress: { type: String, default: "" },
    area: { type: String, default: "" },
    routeNo: { type: String, default: "" },
    domain: { type: String, default: "" },
    infyId: { type: String, default: "" },
    assetTag: { type: String, default: "" },
    laptopReceived: { type: String, default: "No" },
    domainExp: { type: Number, default: 0 },
    infyExp: { type: Number, default: 0 },
    overallExp: { type: Number, default: 0 },
    passport: { type: String, default: "No" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
const Employee = mongoose.model("Employee", employeeSchema);

// --- Attendance ---
// One document per employee per date
const attendanceSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, default: "" }, // Present | UPL | SL | ''
  },
  { timestamps: true },
);
attendanceSchema.index({ empId: 1, date: 1 }, { unique: true });
const Attendance = mongoose.model("Attendance", attendanceSchema);

// --- Attrition ---
const attritionSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true },
);
const Attrition = mongoose.model("Attrition", attritionSchema);

// ------------------------------------------------------------
// 4. API Routes
// ------------------------------------------------------------

// ── Employees ──────────────────────────────────────────────

// GET all employees (minimal fields for dashboard)
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find(
      {},
      { empId: 1, empName: 1, tlCode: 1, hireDate: 1, _id: 0 },
    );
    // Shape data to match what script.js expects: { id, name, tl, hireDate }
    const shaped = employees.map((e) => ({
      id: e.empId,
      name: e.empName,
      tl: e.tlCode,
      hireDate: e.hireDate,
    }));
    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single employee full profile
app.get("/api/employees/:empId", async (req, res) => {
  try {
    const emp = await Employee.findOne({ empId: req.params.empId });
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST – register new employee (called from reg_script.js)
app.post("/api/employees", async (req, res) => {
  try {
    const data = req.body;
    console.log("📨 POST /api/employees received:", {
      empId: data.empId,
      empName: data.empName,
      bodySize: JSON.stringify(data).length,
    });

    // Validate required fields
    if (!data.empId || !data.empName) {
      console.warn("❌ Missing required fields - empId or empName");
      return res
        .status(400)
        .json({ error: "Employee ID and Name are required" });
    }

    // Map friendly TL label → internal code (mirrors reg_script.js TL_MAP)
    const TL_MAP = {
      "Captain America": "Lead_Alpha",
      "Iron Man": "Lead_Beta",
      Marvels: "Lead_Marvels",
    };
    const tlCode = TL_MAP[data.teamLead] || data.teamLead || "Lead_Alpha";
    const hireDate = data.doj || new Date().toISOString().slice(0, 10);

    const employee = new Employee({ ...data, tlCode, hireDate });
    await employee.save();

    console.log("✅ Employee saved successfully:", employee.empId);
    res.status(201).json({ message: "Employee saved", empId: employee.empId });
  } catch (err) {
    if (err.code === 11000) {
      console.warn("❌ Duplicate Employee ID:", req.body.empId);
      return res.status(409).json({ error: "Employee ID already exists" });
    }
    console.error("❌ Server error saving employee:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT – edit employee (called from directory.html)
app.put("/api/employees/:empId", async (req, res) => {
  try {
    const { name, tl } = req.body; // directory sends { id, name, tl }
    const updated = await Employee.findOneAndUpdate(
      { empId: req.params.empId },
      { empName: name, tlCode: tl },
      { returnDocument: "after" },
    );
    if (!updated) return res.status(404).json({ error: "Employee not found" });
    res.json({ message: "Employee updated", employee: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE – remove employee (called from directory.html)
app.delete("/api/employees/:empId", async (req, res) => {
  try {
    const empId = req.params.empId;
    await Employee.findOneAndDelete({ empId });
    // Also clean up related attendance and attrition records
    await Attendance.deleteMany({ empId });
    await Attrition.deleteMany({ empId });
    res.json({ message: "Employee and related records deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attendance ─────────────────────────────────────────────

// GET attendance – returns flat array; script.js rebuilds att_db shape
app.get("/api/attendance", async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from && to) filter.date = { $gte: from, $lte: to };
    const records = await Attendance.find(filter, {
      empId: 1,
      date: 1,
      status: 1,
      _id: 0,
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST – mark / update attendance for one employee on one date
app.post("/api/attendance", async (req, res) => {
  try {
    const { empId, date, status } = req.body;
    // Upsert: update if exists, insert if not
    await Attendance.findOneAndUpdate(
      { empId, date },
      { status },
      { upsert: true, returnDocument: "after" },
    );
    res.json({ message: "Attendance saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attrition ──────────────────────────────────────────────

// GET all attrition records
app.get("/api/attrition", async (req, res) => {
  try {
    const records = await Attrition.find({}, { empId: 1, date: 1, _id: 0 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST – record attrition
app.post("/api/attrition", async (req, res) => {
  try {
    const { empId, date } = req.body;
    const exists = await Attrition.findOne({ empId, date });
    if (!exists) {
      await Attrition.create({ empId, date });
    }
    res.json({ message: "Attrition recorded" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catch-all: serve index.html for any non-API route ──────
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ------------------------------------------------------------
// 5. Start server
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀  Server running at http://localhost:${PORT}`);
});
