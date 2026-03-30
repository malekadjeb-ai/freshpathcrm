import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { cache } from "react";
import * as schema from "./schema";

export const getDb = cache(() => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
});

export const getDbAsync = cache(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
});
