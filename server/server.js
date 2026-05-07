import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initDb, Product, Category, History, User, verifyPassword, hashPassword } from "./database.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import multer from "multer";

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for localhost development
}));
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Rate limiting - only apply to auth endpoints for better usability
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting disabled for localhost development
// In production, enable with: app.use(generalLimiter);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Multer setup for form data parsing
const upload = multer();

// Initialize DB and start server
async function start() {
  await initDb();

  // ========== PRODUCTS (Protected Routes) ==========
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const products = await Product.find().sort({ lastUpdated: -1 });
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", upload.none(), authenticateToken, async (req, res) => {
    try {
      const productData = {
        name: req.body.name,
        sku: req.body.sku,
        category: req.body.category,
        division: req.body.division,
        quantity: parseInt(req.body.quantity),
        minQuantity: parseInt(req.body.minQuantity),
        price: parseFloat(req.body.price),
        serviceable: req.body.serviceable,
        accountablePerson: req.body.accountablePerson,
        supplier: req.body.supplier,
        description: req.body.description,
        notes: req.body.notes
      };

      const product = new Product(productData);
      const savedProduct = await product.save();
      res.json(savedProduct);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/products/:id", upload.none(), authenticateToken, async (req, res) => {
    try {
      const updateData = {};

      // Only include fields that were provided
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.sku !== undefined) updateData.sku = req.body.sku;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.division !== undefined) updateData.division = req.body.division;
      if (req.body.quantity !== undefined) updateData.quantity = parseInt(req.body.quantity);
      if (req.body.minQuantity !== undefined) updateData.minQuantity = parseInt(req.body.minQuantity);
      if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
      if (req.body.serviceable !== undefined) updateData.serviceable = req.body.serviceable;
      if (req.body.accountablePerson !== undefined) updateData.accountablePerson = req.body.accountablePerson;
      if (req.body.supplier !== undefined) updateData.supplier = req.body.supplier;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      updateData.lastUpdated = new Date();

      const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!product) return res.status(404).json({ error: "Product not found" });

      res.json(product);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });

      await Product.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== EXPORT (Protected Routes) ==========
  app.get("/api/products/export/excel", authenticateToken, async (req, res) => {
    try {
      const products = await Product.find().sort({ lastUpdated: -1 });

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();

      const divisions = ["PDP", "Admin", "Motorpool", "Construction", "MQC", "Maintenance"];
      const columns = [
        { header: "P.O Number", key: "poNumber", width: 15 },
        { header: "Property No.", key: "propertyNo", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "User", key: "user", width: 15 },
        { header: "Equipment Name", key: "equipmentName", width: 25 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Accountable Person", key: "accountablePerson", width: 20 },
        { header: "Serviceable Status", key: "serviceableStatus", width: 15 },
      ];

      // Helper to style header row
      const styleHeader = (worksheet) => {
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF366092" },
        };
        worksheet.getRow(1).alignment = { horizontal: "center", vertical: "center" };
      };

      // Helper to style data rows
      const styleDataRows = (worksheet) => {
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          if (i % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          }
          row.alignment = { horizontal: "left", vertical: "center" };
        }
      };

      // Helper to add product rows to a worksheet
      const addProductRows = (worksheet, productList) => {
        productList.forEach((product) => {
          worksheet.addRow({
            poNumber: product.sku || "N/A",
            propertyNo: product.supplier || "N/A",
            category: product.category || "N/A",
            user: product.accountablePerson || "N/A",
            equipmentName: product.name || "N/A",
            quantity: product.quantity || 0,
            accountablePerson: product.accountablePerson || "N/A",
            serviceableStatus: product.serviceable || "N/A",
          });
        });
      };

      // Create a worksheet for each division
      divisions.forEach((division) => {
        const divisionProducts = products.filter((p) => p.division === division);
        const worksheet = workbook.addWorksheet(division);
        worksheet.columns = columns;
        styleHeader(worksheet);
        addProductRows(worksheet, divisionProducts);
        styleDataRows(worksheet);
      });

      // Create "Unassigned" sheet for products without a division
      const unassignedProducts = products.filter((p) => !p.division);
      const unassignedSheet = workbook.addWorksheet("Unassigned");
      unassignedSheet.columns = columns;
      styleHeader(unassignedSheet);
      addProductRows(unassignedSheet, unassignedProducts);
      styleDataRows(unassignedSheet);

      // Set response headers for file download
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="Equipment_Inventory_${new Date().toISOString().split("T")[0]}.xlsx"`);

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("[export] Excel export error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ========== EXPORT HISTORY (Protected Routes) ==========
  app.get("/api/history/export/excel", authenticateToken, async (req, res) => {
    try {
      const history = await History.find().sort({ date: -1 });

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();

      const actions = ["transferred", "repair", "waste"];
      const columns = [
        { header: "Date", key: "date", width: 20 },
        { header: "Equipment Name", key: "equipmentName", width: 25 },
        { header: "P.O Number", key: "poNumber", width: 15 },
        { header: "Property No.", key: "propertyNo", width: 15 },
        { header: "Action", key: "action", width: 12 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      // Helper functions (same as Equipment export)
      const styleHeader = (worksheet) => {
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF366092" },
        };
        worksheet.getRow(1).alignment = { horizontal: "center", vertical: "center" };
      };

      const styleDataRows = (worksheet) => {
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          if (i % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          }
          row.alignment = { horizontal: "left", vertical: "center" };
        }
      };

      const addHistoryRows = (worksheet, recordList) => {
        recordList.forEach((record) => {
          const recordDate = new Date(record.date).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          worksheet.addRow({
            date: recordDate,
            equipmentName: record.name || record.productName || "N/A",
            poNumber: record.poNumber || record.sku || "N/A",
            propertyNo: record.propertyNo || "N/A",
            action: record.action || "N/A",
            quantity: record.quantity ?? record.quantityReturned ?? 0,
            notes: record.notes || "—",
          });
        });
      };

      // Create worksheet for each action type
      actions.forEach((action) => {
        const actionRecords = history.filter((r) => r.action === action);
        const worksheet = workbook.addWorksheet(action.charAt(0).toUpperCase() + action.slice(1) + "s");
        worksheet.columns = columns;
        styleHeader(worksheet);
        addHistoryRows(worksheet, actionRecords);
        styleDataRows(worksheet);
      });

      // Create "Other" sheet for other actions
      const otherRecords = history.filter((r) => !actions.includes(r.action));
      const otherSheet = workbook.addWorksheet("Other");
      otherSheet.columns = columns;
      styleHeader(otherSheet);
      addHistoryRows(otherSheet, otherRecords);
      styleDataRows(otherSheet);

      // Set response headers for file download
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="History_Records_${new Date().toISOString().split("T")[0]}.xlsx"`);

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("[export] History export error:", err);
      res.status(500).json({ error: err.message });
    }
  });


  // ========== CATEGORIES (Protected Routes) ==========
  app.get("/api/categories", authenticateToken, async (req, res) => {
    try {
      const categories = await Category.find();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/categories", authenticateToken, async (req, res) => {
    try {
      const category = new Category(req.body);
      const savedCategory = await category.save();
      res.json(savedCategory);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      await Category.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== HISTORY (Protected Routes) ==========
  app.get("/api/history", authenticateToken, async (req, res) => {
    try {
      // return all history records for dashboard activity view
      const records = await History.find().sort({ date: -1 });
      
      // Log transferred records to debug
      const transferredRecords = records.filter(r => r.action === 'transferred');
      if (transferredRecords.length > 0) {
        console.log("[history GET] Latest transferred records:", 
          transferredRecords.slice(0, 3).map(r => ({
            id: r._id,
            previousAssignedUser: r.previousAssignedUser,
            newAssignedUser: r.newAssignedUser,
            productName: r.productName
          }))
        );
      }
      
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/history", authenticateToken, async (req, res) => {
    try {
      // validate action since schema enum has been tightened
      const allowed = ['waste', 'transferred', 'repair', 'added'];
      if (!allowed.includes(req.body.action)) {
        return res.status(400).json({ error: 'Invalid history action' });
      }
      
      if (req.body.action === 'transferred') {
        console.log("[history POST] Raw request body for transfer:", {
          previousAssignedUser: req.body.previousAssignedUser,
          newAssignedUser: req.body.newAssignedUser,
          name: req.body.name,
          productName: req.body.productName
        });
      }
      
      const historyData = {
        // New general equipment history fields
        name: req.body.name,
        poNumber: req.body.poNumber,
        propertyNo: req.body.propertyNo,
        action: req.body.action,
        quantity: req.body.quantity !== undefined ? parseInt(req.body.quantity) : (req.body.quantityReturned !== undefined ? parseInt(req.body.quantityReturned) : 0),
        notes: req.body.notes,

        // Legacy fields for backward compatibility
        productId: req.body.productId,
        productName: req.body.productName,
        sku: req.body.sku,
        quantityReturned: req.body.quantityReturned !== undefined ? parseInt(req.body.quantityReturned) : (req.body.quantity !== undefined ? parseInt(req.body.quantity) : 0),
        previousAssignedUser: req.body.previousAssignedUser,
        newAssignedUser: req.body.newAssignedUser
      };

      if (historyData.action === 'transferred') {
        console.log("[history POST] Processed historyData:", { previousAssignedUser: historyData.previousAssignedUser, newAssignedUser: historyData.newAssignedUser, productName: historyData.productName });
      }

      const history = new History(historyData);
      const savedHistory = await history.save();
      res.json(savedHistory);
    } catch (err) {
      console.error("[history POST] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/history/:id", authenticateToken, async (req, res) => {
    try {
      // validate action on update as well
      const allowed2 = ['waste', 'transferred', 'repair', 'added'];
      if (!allowed2.includes(req.body.action)) {
        return res.status(400).json({ error: 'Invalid history action' });
      }
      const updateData = {
        // New general equipment history fields
        name: req.body.name,
        poNumber: req.body.poNumber,
        propertyNo: req.body.propertyNo,
        action: req.body.action,
        quantity: req.body.quantity !== undefined ? parseInt(req.body.quantity) : (req.body.quantityReturned !== undefined ? parseInt(req.body.quantityReturned) : undefined),
        notes: req.body.notes,

        // Legacy fields for backward compatibility
        productId: req.body.productId,
        productName: req.body.productName,
        sku: req.body.sku,
        quantityReturned: req.body.quantityReturned !== undefined ? parseInt(req.body.quantityReturned) : (req.body.quantity !== undefined ? parseInt(req.body.quantity) : undefined),
        previousAssignedUser: req.body.previousAssignedUser,
        newAssignedUser: req.body.newAssignedUser
      };

      const history = await History.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!history) return res.status(404).json({ error: "History record not found" });
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/history/:id", authenticateToken, async (req, res) => {
    try {
      await History.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== AUTH ==========
  // Apply rate limiting to auth endpoints
  app.post("/api/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      const trimmedUsername = username?.trim() || "";
      const trimmedPassword = password?.trim() || "";

      if (!trimmedUsername || !trimmedPassword) {
        return res.status(400).json({ error: "Username and password required" });
      }

      console.log(`[auth] login attempt for '${trimmedUsername}'`);
      const user = await User.findOne({ username: trimmedUsername });
      if (!user) {
        console.log(`[auth] user not found: '${trimmedUsername}'`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(trimmedPassword, user.password);
      if (!isValidPassword) {
        console.log(`[auth] password mismatch for '${trimmedUsername}'`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { username: trimmedUsername, id: user._id.toString() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      console.log(`[auth] login success for '${trimmedUsername}'`);
      res.json({ token, username: trimmedUsername });
    } catch (err) {
      console.error(`[auth] login error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Forgot password: user sets a new password (with rate limiting)
  app.post("/api/forgot-password", authLimiter, async (req, res) => {
    try {
      const { username, newPassword } = req.body;
      const trimmedUsername = username?.trim() || "";
      const trimmedPassword = newPassword?.trim() || "";

      // Input validation
      if (!trimmedUsername || !trimmedPassword) {
        return res.status(400).json({ error: "Username and new password required" });
      }
      if (trimmedPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await User.findOne({ username: trimmedUsername });
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ success: true, message: "If the user exists, password has been reset" });
      }

      console.log(`[auth] resetting password for '${trimmedUsername}'`);

      // Hash the new password before storing
      const hashedPassword = await hashPassword(trimmedPassword);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });

      console.log(`[auth] password updated for '${trimmedUsername}'`);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      console.error(`[auth] password reset error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    const url = env === 'production' ? 'Deployed on Render' : `http://localhost:${PORT}`;
    console.log(`[server] Backend running on port ${PORT} (${url})`);
  });
}

start().catch(console.error);
