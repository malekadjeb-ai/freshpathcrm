import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const seedSql = readFileSync(resolve(__dirname, "seed.sql"), "utf-8");

// Extract actual SQL statements (INSERT lines that end with ;)
const statements = seedSql
  .split("\n")
  .reduce<string[]>((acc, line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") return acc;

    if (acc.length === 0 || acc[acc.length - 1].endsWith(";")) {
      acc.push(trimmed);
    } else {
      acc[acc.length - 1] += " " + trimmed;
    }
    return acc;
  }, [])
  .filter(s => s.endsWith(";"));

async function main() {
  console.log(`Executing ${statements.length} statements...`);
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log("  ✓", stmt.substring(0, 80) + "...");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("  ✗", stmt.substring(0, 80), msg);
    }
  }
  console.log("Done!");
}

main();
