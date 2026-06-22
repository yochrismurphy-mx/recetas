import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "pg";

const DB = process.env.DATABASE_URL;
if (!DB) {
  console.error("Set DATABASE_URL (Supabase connection string) before running.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "schema.sql"), "utf8");

const c = new Client({ connectionString: DB });
await c.connect();
await c.query(sql);
const t = await c.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name",
);
console.log("Tables:", t.rows.map((r) => r.table_name).join(", "));
await c.end();
