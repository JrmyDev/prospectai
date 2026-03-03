import path from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const { Client } = pg;

const sqlitePath = process.env.SQLITE_PATH || path.join(process.cwd(), "dev.db");
const postgresUrl = process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

if (!postgresUrl) {
  console.error("Missing POSTGRES_URL (or PRISMA_DATABASE_URL / DATABASE_URL)");
  process.exit(1);
}

const tables = [
  "BrandProfile",
  "Prospect",
  "Proposal",
  "ProposalVersion",
  "ProspectAnalysis",
  "GeneratedSite",
  "Email",
  "ProspectEvent",
  "ScrapingJob",
  "Settings",
];

const deleteOrder = [...tables].reverse();

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

function getTableColumns(sqlite, table) {
  const rows = sqlite.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all();
  return rows.map((r) => r.name);
}

function selectAll(sqlite, table, columns) {
  const sql = `SELECT ${columns.map(quoteIdent).join(", ")} FROM ${quoteIdent(table)}`;
  return sqlite.prepare(sql).all();
}

async function clearPostgres(client) {
  for (const table of deleteOrder) {
    await client.query(`DELETE FROM ${quoteIdent(table)}`);
  }
}

async function insertRows(client, table, columns, rows) {
  if (rows.length === 0) return;

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const groups = [];

    for (const row of chunk) {
      const placeholders = [];
      for (const col of columns) {
        values.push(row[col]);
        placeholders.push(`$${values.length}`);
      }
      groups.push(`(${placeholders.join(",")})`);
    }

    const sql = `INSERT INTO ${quoteIdent(table)} (${columns
      .map(quoteIdent)
      .join(",")}) VALUES ${groups.join(",")}`;

    await client.query(sql, values);
  }
}

async function main() {
  const sqlite = new Database(sqlitePath, { readonly: true });
  const client = new Client({ connectionString: postgresUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    const counts = {};
    for (const table of tables) {
      const [{ c }] = sqlite.prepare(`SELECT COUNT(*) as c FROM ${quoteIdent(table)}`).all();
      counts[table] = Number(c);
    }

    await client.query("BEGIN");
    await clearPostgres(client);

    for (const table of tables) {
      const columns = getTableColumns(sqlite, table);
      const rows = selectAll(sqlite, table, columns);
      await insertRows(client, table, columns, rows);
      console.log(`[migrate] ${table}: ${rows.length} rows`);
    }

    await client.query("COMMIT");
    console.log("[migrate] Done.");
    console.log("[migrate] Source row counts:", counts);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[migrate] Failed:", error);
    process.exit(1);
  } finally {
    sqlite.close();
    await client.end().catch(() => {});
  }
}

main();
