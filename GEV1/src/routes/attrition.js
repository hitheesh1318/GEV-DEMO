// ============================================================
//  Attrition Routes
// ============================================================

const express = require("express");
const router = express.Router();
const Attrition = require("../models/attrition");

// GET all attrition records
router.get("/", async (req, res) => {
  try {
    const records = await Attrition.find({}, { empId: 1, date: 1, _id: 0 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Record attrition
router.post("/", async (req, res) => {
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

module.exports = router;
