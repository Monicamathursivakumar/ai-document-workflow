import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Department from "./models/Department.js";
import { sequelize } from "./config/database.js";

/**
 * Script to create an Admin user
 * Run: node createSuperAdmin.js
 */

async function createSuperAdmin() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Check if departments exist, create one if needed
    let department = await Department.findOne();
    
    if (!department) {
      console.log("No departments found. Creating default 'Administration' department...");
      department = await Department.create({
        name: "Administration",
        description: "Administrative Department"
      });
      console.log("✅ Department created:", department.name);
    } else {
      console.log("✅ Using existing department:", department.name);
    }

    // Admin credentials
    const superAdminData = {
      name: "Admin",
      email: "admin@kmrl.com",
      password: "Admin@123",
      role: "ADMIN",
      department_id: department.id
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      where: { email: superAdminData.email } 
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists!");
      console.log("\n📧 Email:", superAdminData.email);
      console.log("🔑 Use your existing password or reset it");
      
      // Ask if user wants to update password
      console.log("\nIf you want to reset the password, delete the user first or use forgot password.");
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 10);

    // Create Admin
    const superAdmin = await User.create({
      name: superAdminData.name,
      email: superAdminData.email,
      password: hashedPassword,
      role: superAdminData.role,
      department_id: superAdminData.department_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log("\n✅ Admin created successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:    ", superAdminData.email);
    console.log("🔑 Password: ", superAdminData.password);
    console.log("👤 Role:     ", superAdminData.role);
    console.log("🏢 Department:", department.name);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("⚠️  IMPORTANT: Change this password after first login!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating Admin:", error.message);
    process.exit(1);
  }
}

createSuperAdmin();
