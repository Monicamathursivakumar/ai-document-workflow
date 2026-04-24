import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

/**
 * Sequelize instance initialization.
 * Configures the connection to the PostgreSQL database using environment variables.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || "document_processor",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "postgres",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // Set to console.log to see raw SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const migrateUserRolesIfNeeded = async () => {
  const [roleTypeRows] = await sequelize.query(`
    SELECT t.typname AS type_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    WHERE c.relname = 'users' AND a.attname = 'role'
    LIMIT 1;
  `);

  const roleTypeName = roleTypeRows?.[0]?.type_name;
  if (!roleTypeName) {
    return;
  }

  const [enumRows] = await sequelize.query(
    `
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = :roleTypeName;
    `,
    { replacements: { roleTypeName } }
  );

  const enumLabels = new Set(enumRows.map((row) => row.enumlabel));
  const hasLegacyRoles = enumLabels.has("SUPER_ADMIN") || enumLabels.has("EMPLOYEE");

  if (!hasLegacyRoles) {
    return;
  }

  const targetTypeName = "enum_users_role";

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${targetTypeName}') THEN
          CREATE TYPE "${targetTypeName}" AS ENUM ('ADMIN', 'DEPARTMENT_HEAD', 'STAFF');
        END IF;
      END
      $$;
      `,
      { transaction }
    );

    // Important: drop old enum-typed default before changing column type.
    await sequelize.query(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT;`, { transaction });

    await sequelize.query(
      `
      ALTER TABLE users
      ALTER COLUMN role TYPE "${targetTypeName}"
      USING (
        CASE role::text
          WHEN 'SUPER_ADMIN' THEN 'ADMIN'
          WHEN 'ADMIN' THEN 'DEPARTMENT_HEAD'
          WHEN 'EMPLOYEE' THEN 'STAFF'
          WHEN 'DEPARTMENT_HEAD' THEN 'DEPARTMENT_HEAD'
          WHEN 'STAFF' THEN 'STAFF'
          ELSE 'STAFF'
        END
      )::"${targetTypeName}";
      `,
      { transaction }
    );

    // Restore a valid default in the new enum type.
    await sequelize.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STAFF';`, { transaction });

    // Optional cleanup: remove previous enum type if no longer referenced.
    if (roleTypeName !== targetTypeName) {
      const [dependencyRows] = await sequelize.query(
        `
        SELECT 1
        FROM pg_depend d
        JOIN pg_type t ON t.oid = d.refobjid
        WHERE t.typname = :roleTypeName
        LIMIT 1;
        `,
        { replacements: { roleTypeName }, transaction }
      );

      if (!dependencyRows.length) {
        await sequelize.query(`DROP TYPE IF EXISTS "${roleTypeName}";`, { transaction });
      }
    }
  });

  console.log("✅ Role migration completed: SUPER_ADMIN→ADMIN, ADMIN→DEPARTMENT_HEAD, EMPLOYEE→STAFF");
};

const ensureDocumentHashIndex = async () => {
  try {
    const [duplicateRows] = await sequelize.query(
      `
        SELECT file_hash
        FROM documents
        WHERE file_hash IS NOT NULL AND file_hash <> ''
        GROUP BY file_hash
        HAVING COUNT(*) > 1;
      `
    );

    for (const row of duplicateRows) {
      const [orderedRows] = await sequelize.query(
        `
          SELECT id
          FROM documents
          WHERE file_hash = :fileHash
          ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC;
        `,
        { replacements: { fileHash: row.file_hash } }
      );

      const ids = orderedRows.map((item) => Number.parseInt(item.id, 10)).filter((value) => Number.isInteger(value));
      if (ids.length <= 1) continue;

      const [keepId, ...duplicateIds] = ids;
      if (!duplicateIds.length) continue;

      await sequelize.query(
        `DELETE FROM documents WHERE id IN (:duplicateIds);`,
        { replacements: { duplicateIds } }
      );

      console.log(`🧹 Removed ${duplicateIds.length} duplicate document row(s) for hash ${row.file_hash}; kept document ${keepId}.`);
    }

    await sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "documents_file_hash_unique" ON "documents" ("file_hash");'
    );
    console.log("✅ Unique document hash index ensured.");
  } catch (error) {
    console.warn("⚠️ Could not create unique file_hash index automatically:", error?.message || error);
  }
};

/**
 * Establishes the database connection and synchronizes models.
 *
 * @description
 * 1. Authenticates with the database.
 * 2. Syncs models using `alter: true` (updates schema without dropping data).
 * 3. Exits the process if the connection fails.
 *
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("🔌 Database authentication successful.");

    await migrateUserRolesIfNeeded();

    // Sync models with the database
    // Note: { alter: true } checks current state of tables and adds/removes columns to match the model.
    await sequelize.sync({ alter: true });

    await ensureDocumentHashIndex();

    console.log("✅ PostgreSQL Connection established & Models Synced.");
  } catch (error) {
    console.error("❌ Unable to connect to PostgreSQL:", error);
    process.exit(1); // Fatal error: Exit app if DB fails to connect on startup
  }
};

/**
 * Closes the database connection gracefully.
 * Should be called during server shutdown to prevent hanging connections.
 *
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await sequelize.close();
    console.log("🛑 PostgreSQL Connection closed.");
  } catch (error) {
    console.error("❌ Error closing PostgreSQL connection:", error);
  }
};

export { sequelize };
