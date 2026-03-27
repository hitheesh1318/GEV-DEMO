// ============================================================
//  Employee Routes
// ============================================================

const express = require("express");
const router = express.Router();
const Employee = require("../models/employee");
const Attendance = require("../models/attendance");
const Attrition = require("../models/attrition");

// TL_MAP for friendly name conversion
const TL_MAP = {
  "Captain America": "Lead_Alpha",
  "Iron Man": "Lead_Beta",
  Marvels: "Lead_Marvels",
};

// GET all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find(
      {},
      { empId: 1, empName: 1, tlCode: 1, hireDate: 1, _id: 0 },
    );

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

// GET single employee by ID
router.get("/:empId", async (req, res) => {
  try {
    const emp = await Employee.findOne({ empId: req.params.empId });
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Register new employee
router.post("/", async (req, res) => {
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

// PUT - Update employee
router.put("/:empId", async (req, res) => {
  try {
    const { name, tl } = req.body;
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

// DELETE - Remove employee (and related records)
router.delete("/:empId", async (req, res) => {
  try {
    const empId = req.params.empId;
    await Employee.findOneAndDelete({ empId });
    await Attendance.deleteMany({ empId });
    await Attrition.deleteMany({ empId });
    res.json({ message: "Employee and related records deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
