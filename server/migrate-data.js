// migrate-data.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import mongoose from "mongoose";
import { Product, Category, History, User } from "./database.js";
import bcrypt from "bcryptjs";

async function migrateData() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/inventory_db");

  // Connect to SQLite
  const sqliteDb = await open({
    filename: "inventory.db",
    driver: sqlite3.Database,
  });

  try {
    console.log("Starting data migration...");

    // Migrate products
    const products = await sqliteDb.all("SELECT * FROM products");
    if (products.length > 0) {
      const bulkOps = products.map(p => ({
        updateOne: {
          filter: { sku: p.sku },
          update: {
            _id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            quantity: p.quantity,
            minQuantity: p.minQuantity,
            price: p.price,
            serviceable: p.serviceable,
            accountablePerson: p.accountablePerson,
            supplier: p.supplier,
            description: p.description,
            lastUpdated: new Date(p.lastUpdated)
          },
          upsert: true
        }
      }));
      await Product.bulkWrite(bulkOps);
      console.log(`Migrated ${products.length} products`);
    }

    // Migrate categories
    const categories = await sqliteDb.all("SELECT * FROM categories");
    if (categories.length > 0) {
      const bulkOps = categories.map(c => ({
        updateOne: {
          filter: { name: c.name },
          update: {
            _id: c.id,
            name: c.name,
            description: c.description
          },
          upsert: true
        }
      }));
      await Category.bulkWrite(bulkOps);
      console.log(`Migrated ${categories.length} categories`);
    }

    // Migrate history
    const history = await sqliteDb.all("SELECT * FROM history");
    if (history.length > 0) {
      // filter out delivered/returned entries since those actions are no
      // longer supported
      const filtered = history.filter(
        (h) => h.action !== "delivered" && h.action !== "returned"
      );
      if (filtered.length > 0) {
        const bulkOps = filtered.map(h => ({
          updateOne: {
            filter: { _id: h.id },
            update: {
              _id: h.id,
              productId: h.productId,
              productName: h.productName,
              sku: h.sku,
              action: h.action,
              quantityReturned: h.quantityReturned,
              date: new Date(h.date),
              name: h.name,
              notes: h.notes
            },
            upsert: true
          }
        }));
        await History.bulkWrite(bulkOps);
      }
      console.log(`Migrated ${filtered.length} history records (filtered)`);
    }

    // Migrate users
    const users = await sqliteDb.all("SELECT * FROM users");
    if (users.length > 0) {
      const bulkOps = [];
      for (const user of users) {
        // Ensure password is hashed
        let password = user.password;
        if (!password.startsWith("$2")) {
          password = await bcrypt.hash(password, 10);
        }

        bulkOps.push({
          updateOne: {
            filter: { username: user.username },
            update: {
              _id: user.id,
              username: user.username,
              password: password
            },
            upsert: true
          }
        });
      }
      await User.bulkWrite(bulkOps);
      console.log(`Migrated ${users.length} users`);
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sqliteDb.close();
    await mongoose.connection.close();
  }
}

migrateData();