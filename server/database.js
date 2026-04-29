import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// MongoDB connection string - use environment variable in production
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/inventory_db";

let isConnected = false;

export async function initDb() {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[db] Connected to MongoDB");
    isConnected = true;

    // Create indexes for better performance
    await createIndexes();

    // Insert default data if collections are empty
    await insertDefaults();

  } catch (error) {
    console.error("[db] MongoDB connection error:", error);
    throw error;
  }
}

// Define Schemas
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  division: String,
  quantity: { type: Number, required: true },
  minQuantity: { type: Number, required: true },
  price: { type: Number, required: true },
  serviceable: String,
  accountablePerson: String,
  supplier: { type: String, required: true },
  description: String,
  notes: String,
  lastUpdated: { type: Date, default: Date.now }
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String
});

const historySchema = new mongoose.Schema({
  // New general equipment history fields
  date: { type: Date, default: Date.now },
  name: String, // Equipment name
  poNumber: String, // Purchase Order Number
  propertyNo: String, // Property Number
  action: { type: String, required: true, enum: ['waste', 'transferred', 'repair', 'added'] },
  quantity: { type: Number, required: true },
  notes: String,
  previousAssignedUser: String,
  newAssignedUser: String,

  // Legacy fields for backward compatibility
  productId: String, // Reference to product (for legacy records)
  productName: String, // Product name (for legacy records)
  sku: String, // SKU (for legacy records)
  quantityReturned: Number // Legacy quantity field
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Create Models
export const Product = mongoose.model('Product', productSchema);
export const Category = mongoose.model('Category', categorySchema);
export const History = mongoose.model('History', historySchema);
export const User = mongoose.model('User', userSchema);

async function createIndexes() {
  // Create indexes for frequently queried fields
  await Product.collection.createIndex({ sku: 1 });
  await Product.collection.createIndex({ category: 1 });
  await Product.collection.createIndex({ lastUpdated: -1 });
  await History.collection.createIndex({ date: -1 });
  await History.collection.createIndex({ productId: 1 });
}

async function insertDefaults() {
  // Check if data already exists
  const productCount = await Product.countDocuments();
  if (productCount > 0) return;

  const defaultProducts = [
    {
      name: "Wireless Mouse",
      sku: "WM-001",
      category: "IT Equipment",
      quantity: 45,
      minQuantity: 10,
      price: 29.99,
      supplier: "Tech Supplies Co.",
      description: "Ergonomic wireless mouse with USB receiver",
    },
    {
      name: "Office Chair",
      sku: "OC-002",
      category: "Furniture",
      quantity: 8,
      minQuantity: 5,
      price: 199.99,
      supplier: "Furniture Plus",
      description: "Adjustable office chair with lumbar support",
    },
    {
      name: "USB-C Cable",
      sku: "UC-003",
      category: "IT Equipment",
      quantity: 3,
      minQuantity: 15,
      price: 12.99,
      supplier: "Tech Supplies Co.",
      description: "2m USB-C charging cable",
    },
    {
      name: "Notebook A5",
      sku: "NB-004",
      category: "Stationery",
      quantity: 120,
      minQuantity: 30,
      price: 4.99,
      supplier: "Paper World",
      description: "Ruled notebook, 200 pages",
    },
    {
      name: "Desk Lamp",
      sku: "DL-005",
      category: "IT Equipment",
      quantity: 2,
      minQuantity: 8,
      price: 45.0,
      supplier: "Lighting Inc.",
      description: "LED desk lamp with adjustable brightness",
    },
  ];

  const defaultCategories = [
    { name: "IT Equipment", description: "Electronic devices and accessories" },
    { name: "Furniture", description: "Office and home furniture" },
    { name: "Stationery", description: "Paper products and writing supplies" },
    { name: "Hardware", description: "Tools and hardware items" },
  ];

  await Product.insertMany(defaultProducts);
  await Category.insertMany(defaultCategories);

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin", 10);
  await User.create({
    username: "admin",
    password: hashedPassword
  });

  console.log("[db] Default data inserted");
}

// Helper functions
export async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export function getDb() {
  return mongoose.connection;
}
