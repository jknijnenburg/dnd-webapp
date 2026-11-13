import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

/**
 * One small pool per serverless instance, reused across invocations (and across
 * HMR reloads in development). Use Neon's *pooled* connection string
 * (host contains "-pooler") as DATABASE_URL: PgBouncer in transaction mode
 * supports the interactive transactions and row locks used here; no
 * session-level features (advisory session locks, LISTEN, prepared statements
 * across transactions) are used anywhere.
 */
const globalForDb = globalThis as unknown as { __hubPool?: Pool; __hubDb?: Db };

export function createDb(connectionString: string, max = 5): { db: Db; pool: Pool } {
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client erroring (e.g. Neon suspending compute) must not crash the process.
  pool.on("error", () => {});
  return { db: drizzle(pool, { schema }), pool };
}

export function getDb(): Db {
  if (!globalForDb.__hubDb) {
    const { DATABASE_URL } = getEnv("DATABASE_URL");
    const { db, pool } = createDb(DATABASE_URL);
    globalForDb.__hubDb = db;
    globalForDb.__hubPool = pool;
  }
  return globalForDb.__hubDb;
}

export { schema };
