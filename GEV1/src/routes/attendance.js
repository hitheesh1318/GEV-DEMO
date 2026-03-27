// ============================================================
//  Attendance Routes
// ============================================================

const express = require("express");
const router = express.Router();
const Attendance = require("../models/attendance");

// GET attendance records
router.get("/", async (req, res) => {
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

// POST - Mark/update attendance
router.post("/", async (req, res) => {
  try {
    const { empId, date, status } = req.body;

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

module.exports = router;
