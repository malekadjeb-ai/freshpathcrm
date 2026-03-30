// Re-export Drizzle database helpers as the primary DB access layer.
export { getDb, getDbAsync } from "../src/db";

// Re-export schema and all drizzle operators for convenience
export * from "../src/db/schema";
export { eq, and, or, gt, gte, lt, lte, like, ne, not, inArray, notInArray, isNull, isNotNull, between, desc, asc, count, sum, avg, min, max, sql, exists } from "drizzle-orm";
