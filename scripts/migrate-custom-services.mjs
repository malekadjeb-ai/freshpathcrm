import { createClient } from "@libsql/client";

const client = createClient({
  url: "https://fresh-path-crm-malekadjeb.aws-us-east-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ2OTE3MDEsImlkIjoiMDE5ZDMzZGQtODgwMS03Y2Q5LWIxMjgtZWE4ZmExZjg0NDgxIiwicmlkIjoiMDJhNmU3MjYtNzYzYS00NjJkLWE2NWEtMGQxOTE0MGIxOWQ1In0.qqjzZoJp9pZa7w0SEScwgKa7AMPu5LbJky93mRhDgTPpvleWXBdJ03gOgMXUyMdV_nYmz6h7s1winFpElYHnDg",
});

const stmts = [
  "PRAGMA foreign_keys=OFF",
  `CREATE TABLE "__new_JobService" (
    "id" text PRIMARY KEY NOT NULL,
    "job_id" text NOT NULL,
    "service_item_id" text,
    "name" text,
    "price" real NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("service_item_id") REFERENCES "ServiceItem"("id") ON UPDATE no action ON DELETE restrict
  )`,
  `INSERT INTO "__new_JobService"("id", "job_id", "service_item_id", "price", "quantity") SELECT "id", "job_id", "service_item_id", "price", "quantity" FROM "JobService"`,
  `DROP TABLE "JobService"`,
  `ALTER TABLE "__new_JobService" RENAME TO "JobService"`,
  "PRAGMA foreign_keys=ON",
  `CREATE INDEX "JobService_jobId_idx" ON "JobService" ("job_id")`,
  `CREATE INDEX "JobService_serviceItemId_idx" ON "JobService" ("service_item_id")`,
];

for (const sql of stmts) {
  console.log("Running:", sql.substring(0, 80) + "...");
  await client.execute(sql);
  console.log("OK");
}
console.log("Migration complete!");
