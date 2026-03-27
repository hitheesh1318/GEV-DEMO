// ============================================================
//  Attrition Model
// ============================================================

const mongoose = require("mongoose");

const attritionSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attrition", attritionSchema);
