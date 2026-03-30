import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const result = await client.execute("SELECT id, name, email, password, role, tenant_id FROM User");
  console.log("Users in database:", result.rows);

  if (result.rows.length > 0) {
    const user = result.rows[0];
    const hash = user.password as string;
    const match = await bcrypt.compare("freshpath2025", hash);
    console.log("Password 'freshpath2025' matches:", match);
    console.log("Hash:", hash);
  } else {
    console.log("No users found! Seeding may have failed.");
  }
}

main();
