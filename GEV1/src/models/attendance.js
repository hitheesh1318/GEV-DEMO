// ============================================================
//  Attendance Model
// ============================================================

const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, default: "" },
  },
  { timestamps: true },
);

// Unique index on empId + date
attendanceSchema.index({ empId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
