// ============================================================
//  Database Configuration - MongoDB Connection
// ============================================================

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected:", MONGO_URI);
    return conn;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.log("⚠️  Server running without MongoDB");
    throw err;
  }
};

module.exports = connectDB;
