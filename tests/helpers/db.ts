import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";
import { createDb, type Db } from "@/lib/db";

/**
 * Integration tests need a real PostgreSQL (15+) database that may be wiped:
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/hub_test npm test
 * Without it these suites are skipped (and reported as skipped).
 * NEVER point TEST_DATABASE_URL at a database with real data – tables are truncated.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = Boolean(TEST_DATABASE_URL);

let handle: { db: Db; pool: Pool } | undefined;

export async function setupTestDb(): Promise<Db> {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  if (!handle) {
    handle = createDb(TEST_DATABASE_URL, 10);
    await migrate(handle.db, { migrationsFolder: "./drizzle" });
  }
  return handle.db;
}

export async function resetTestDb(): Promise<void> {
  if (!handle) return;
  await handle.db.execute(
    sql`TRUNCATE TABLE campaign_events, inventory_list_items, inventory_lists, items, shops, campaign_themes, campaigns, login_attempts RESTART IDENTITY CASCADE`,
  );
}

export async function closeTestDb(): Promise<void> {
  await handle?.pool.end();
  handle = undefined;
}
