import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "./config/database.js";
import Department from "./models/Department.js";
import User from "./models/User.js";

const DEPARTMENT_NAMES = [
  "Global Headquarters",
  "Metro Operations",
  "Rolling Stock (Maintenance)",
  "Signaling & Telecom (S&T)",
  "Civil Engineering",
  "Electrical (Traction)",
  "Human Resources (HR)",
  "Finance & Accounts",
  "IT & Systems",
  "Safety & Security",
  "Customer Service",
];

const ADMIN_CREDENTIAL = {
  name: "Admin",
  email: "admin@kmrl.com",
  password: "Admin@123",
  role: "ADMIN",
};

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureDepartment(name) {
  const existing = await Department.findOne({ where: { name } });
  if (existing) return existing;
  return Department.create({ name });
}

async function ensureUser({ name, email, password, role, department_id }) {
  const existing = await User.findOne({ where: { email } });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    await existing.update({
      name,
      password: hashedPassword,
      role,
      department_id,
      updated_at: new Date(),
    });
    return { user: existing, created: false };
  }

  const createdUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    department_id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return { user: createdUser, created: true };
}

async function seed() {
  await connectDB();

  try {
    const createdDepartments = [];
    const credentials = [];

    for (const deptName of DEPARTMENT_NAMES) {
      const dept = await ensureDepartment(deptName);
      createdDepartments.push({ id: dept.id, name: dept.name });

      const slug = toSlug(deptName);

      const deptHead = {
        name: `${deptName} Head`,
        email: `head.${slug}@kmrl.com`,
        password: "Head@123",
        role: "DEPARTMENT_HEAD",
        department_id: dept.id,
      };

      const deptStaff = {
        name: `${deptName} Staff`,
        email: `staff.${slug}@kmrl.com`,
        password: "Staff@123",
        role: "STAFF",
        department_id: dept.id,
      };

      const headResult = await ensureUser(deptHead);
      const staffResult = await ensureUser(deptStaff);

      credentials.push({
        department: dept.name,
        head: {
          email: deptHead.email,
          password: deptHead.password,
          status: headResult.created ? "created" : "updated",
        },
        staff: {
          email: deptStaff.email,
          password: deptStaff.password,
          status: staffResult.created ? "created" : "updated",
        },
      });
    }

    const adminDepartmentId = createdDepartments[0]?.id;
    const adminResult = await ensureUser({
      ...ADMIN_CREDENTIAL,
      department_id: adminDepartmentId,
    });

    console.log("\n✅ Departments in DB:");
    createdDepartments
      .sort((a, b) => a.id - b.id)
      .forEach((d) => console.log(`- ${d.id}: ${d.name}`));

    console.log("\n✅ Admin:");
    console.log(`- ${ADMIN_CREDENTIAL.email} / ${ADMIN_CREDENTIAL.password} (${adminResult.created ? "created" : "updated"})`);

    console.log("\n✅ Department head + staff credentials:");
    for (const item of credentials) {
      console.log(`\n[${item.department}]`);
      console.log(`- HEAD  : ${item.head.email} / ${item.head.password} (${item.head.status})`);
      console.log(`- STAFF : ${item.staff.email} / ${item.staff.password} (${item.staff.status})`);
    }
  } finally {
    await disconnectDB();
  }
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
