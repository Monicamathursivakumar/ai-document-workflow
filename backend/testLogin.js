import bcrypt from "bcryptjs";
import User from "./models/User.js";
import { sequelize } from "./config/database.js";

async function testLogin() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    const email = "admin@kmrl.com";
    const testPassword = "Admin@123";

    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("User found:");
    console.log("  Email:", user.email);
    console.log("  Role:", user.role);
    console.log("  Name:", user.name);
    console.log();

    const isMatch = await bcrypt.compare(testPassword, user.password);
    
    console.log("Password Test:");
    console.log("  Testing password:", testPassword);
    console.log("  Result:", isMatch ? "✅ MATCH" : "❌ NO MATCH");
    console.log("  Hash in DB:", user.password);
    
    if (isMatch) {
      console.log("\n✅ Login should work with these credentials!");
    } else {
      console.log("\n❌ Password does not match. There may be an issue with the hash.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

testLogin();
