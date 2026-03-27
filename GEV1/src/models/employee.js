// ============================================================
//  Employee Model
// ============================================================

const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true, unique: true, trim: true },
    empName: { type: String, required: true, trim: true },
    status: { type: String, default: "Active" },
    bgvStatus: { type: String, default: "" },
    level: { type: String, default: "" },
    teamLead: { type: String, default: "" },
    tlCode: { type: String, default: "Lead_Alpha" },
    sme: { type: String, default: "" },
    role: { type: String, default: "" },
    doj: { type: String, default: "" },
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

module.exports = mongoose.model("Employee", employeeSchema);
