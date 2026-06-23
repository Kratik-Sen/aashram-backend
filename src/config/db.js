const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing from environment variables");
    }

    const connection = await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || "aashram_inventory"
    });
    console.log(`MongoDB connected`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
