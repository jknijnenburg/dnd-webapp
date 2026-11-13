import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";
import {
  MAX_FAILURES_PER_CLIENT,
  RETENTION_MS,
  WINDOW_MS,
  beginLoginAttempt,
  completeLoginAttempt,
  hashClientIp,
} from "@/lib/auth/rate-limit";
import { closeTestDb, hasTestDb, resetTestDb, setupTestDb } from "../helpers/db";

const SECRET = "test-secret-test-secret-test-secret-1234";

describe.skipIf(!hasTestDb)("login rate limiting (PostgreSQL integration)", () => {
  let db: Db;
  const ip = hashClientIp("203.0.113.7", SECRET);
  const otherIp = hashClientIp("203.0.113.8", SECRET);
  const T0 = new Date("2026-01-01T12:00:00Z");

  beforeAll(async () => {
    db = await setupTestDb();
  });
  beforeEach(resetTestDb);
  afterAll(closeTestDb);

  it("does not store the raw IP address", () => {
    expect(ip).not.toContain("203.0.113.7");
    expect(ip).toBe(hashClientIp("203.0.113.7", SECRET));
    expect(ip).not.toBe(otherIp);
  });

  it("locks a client after too many failures, per scope and per client", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_CLIENT; i++) {
      const ticket = await beginLoginAttempt(db, "player", ip, new Date(T0.getTime() + i * 1000));
      expect(ticket.allowed).toBe(true);
      await completeLoginAttempt(db, "player", ip, false, T0);
    }
    const blocked = await beginLoginAttempt(db, "player", ip, new Date(T0.getTime() + 60_000));
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(WINDOW_MS / 1000);
    }
    // Blocked attempts are not recorded and therefore do not extend the lockout.
    expect(await db.select().from(loginAttempts)).toHaveLength(MAX_FAILURES_PER_CLIENT);
    // Other clients and the other scope are unaffected.
    expect((await beginLoginAttempt(db, "player", otherIp, T0)).allowed).toBe(true);
    expect((await beginLoginAttempt(db, "admin", ip, T0)).allowed).toBe(true);
  });

  it("unlocks after the window has passed", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_CLIENT; i++) await beginLoginAttempt(db, "admin", ip, T0);
    expect((await beginLoginAttempt(db, "admin", ip, new Date(T0.getTime() + WINDOW_MS - 1000))).allowed).toBe(false);
    expect((await beginLoginAttempt(db, "admin", ip, new Date(T0.getTime() + WINDOW_MS + 1000))).allowed).toBe(true);
  });

  it("parallel attempts cannot overshoot the limit", async () => {
    const tickets = await Promise.all(Array.from({ length: 20 }, () => beginLoginAttempt(db, "player", ip, T0)));
    expect(tickets.filter((t) => t.allowed).length).toBeLessThanOrEqual(MAX_FAILURES_PER_CLIENT);
    expect((await db.select().from(loginAttempts)).length).toBeLessThanOrEqual(MAX_FAILURES_PER_CLIENT);
  });

  it("a successful login clears the client's failures; old rows are pruned", async () => {
    await beginLoginAttempt(db, "player", otherIp, new Date(T0.getTime() - RETENTION_MS - 60_000));
    for (let i = 0; i < 3; i++) await beginLoginAttempt(db, "player", ip, T0);
    await completeLoginAttempt(db, "player", ip, true, T0);
    expect(await db.select().from(loginAttempts)).toHaveLength(0);
  });
});
