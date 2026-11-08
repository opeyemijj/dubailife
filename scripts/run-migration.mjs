import { readFileSync } from "node:fs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const rawEnv = dotenv.parse(readFileSync(".env"));
const url = new URL(rawEnv.DATABASE_URL);
const password = decodeURIComponent(url.password);
const projectRef = "ybrsakmnmeyvrqhustrs";

// Supabase pooler host for ap-southeast-2 (session mode on 5432, transaction on 6543)
const client = new pg.Client({
  host: "aws-0-ap-southeast-2.pooler.supabase.com",
  port: 6543,
  user: `postgres.${projectRef}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(file, "utf8");
console.log(`Executing migration ${file} on Supabase (ap-southeast-2)...`);

try {
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");
  await client.query(sql);
  console.log("✅ Migration applied successfully!");
} catch (err) {
  console.error("❌ Migration failed:", err);
  process.exit(1);
} finally {
  await client.end();
}
