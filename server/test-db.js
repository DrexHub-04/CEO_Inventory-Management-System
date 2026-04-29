import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("Testing MongoDB connection...");
console.log("URI:", MONGODB_URI);

try {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected successfully!");
  await mongoose.connection.close();
  console.log("✅ Connection closed.");
} catch (error) {
  console.error("❌ MongoDB connection failed:");
  console.error(error.message);
}