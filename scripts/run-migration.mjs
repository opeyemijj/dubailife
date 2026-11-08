import { readFileSync } from "node:fs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DIRECT_URL or DATABASE_URL found in .env");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
console.log(`Running migration from: ${file}`);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected to database.");
  await client.query(sql);
  console.log("✅ Migration applied successfully!");
} catch (err) {
  console.error("❌ Migration failed:", err);
  process.exit(1);
} finally {
  await client.end();
}
