import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guards below are what protects data even if proxy.ts is bypassed:
 * every data access function and every server action calls them first.
 */
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: async () => undefined,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  unstable_rethrow: () => undefined,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// No real database: any query attempt would throw – guards must reject before that.
const getDb = vi.fn(() => {
  throw new Error("DB must not be touched without authorization");
});
vi.mock("@/lib/db", () => ({ getDb }));
// React's request memoisation must not leak a session between test cases.
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const SECRET = "test-secret-test-secret-test-secret-1234";
process.env.SESSION_SECRET = SECRET;

import { AuthError } from "@/lib/errors";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session-token";

const now = () => Math.floor(Date.now() / 1000);
const playerToken = () => createSessionToken({ v: 1, exp: now() + 600, adminExp: 0 }, SECRET);
const adminToken = () => createSessionToken({ v: 1, exp: now() + 600, adminExp: now() + 600 }, SECRET);
const expiredAdminToken = () => createSessionToken({ v: 1, exp: now() + 600, adminExp: now() - 1 }, SECRET);

describe("server-side authorization guards", () => {
  beforeEach(() => {
    cookieJar.clear();
    getDb.mockClear();
  });

  it("assertPlayer / assertAdmin reject requests without a valid session", async () => {
    const { assertAdmin, assertPlayer } = await import("@/lib/auth/session");
    await expect(assertPlayer()).rejects.toMatchObject({ reason: "unauthenticated" });
    await expect(assertAdmin()).rejects.toBeInstanceOf(AuthError);

    cookieJar.set(SESSION_COOKIE, "forged.token");
    await expect(assertPlayer()).rejects.toMatchObject({ reason: "unauthenticated" });

    cookieJar.set(SESSION_COOKIE, createSessionToken({ v: 1, exp: now() + 600, adminExp: now() + 600 }, "x".repeat(40)));
    await expect(assertAdmin()).rejects.toMatchObject({ reason: "unauthenticated" });
  });

  it("a player session is not an admin session", async () => {
    const { assertAdmin, assertPlayer } = await import("@/lib/auth/session");
    cookieJar.set(SESSION_COOKIE, playerToken());
    await expect(assertPlayer()).resolves.toMatchObject({ role: "player" });
    await expect(assertAdmin()).rejects.toMatchObject({ reason: "forbidden" });

    cookieJar.set(SESSION_COOKIE, expiredAdminToken());
    await expect(assertAdmin()).rejects.toMatchObject({ reason: "forbidden" });

    cookieJar.set(SESSION_COOKIE, adminToken());
    await expect(assertAdmin()).resolves.toMatchObject({ role: "admin" });
  });

  it("page guards redirect to the right login", async () => {
    const { requireAdminPage, requirePlayerPage } = await import("@/lib/auth/session");
    await expect(requirePlayerPage()).rejects.toThrow("REDIRECT:/login");
    cookieJar.set(SESSION_COOKIE, playerToken());
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("player data access never reaches the database without a session", async () => {
    const dal = await import("@/lib/dal/player");
    await expect(dal.playerListCampaigns()).rejects.toBeInstanceOf(AuthError);
    await expect(dal.playerGetCampaign("asche-und-gold")).rejects.toBeInstanceOf(AuthError);
    await expect(dal.playerListShops("00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(AuthError);
    await expect(dal.playerGetShop("00000000-0000-4000-8000-000000000000", "00000000-0000-4000-8000-000000000001")).rejects.toBeInstanceOf(AuthError);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("admin data access rejects players before touching the database", async () => {
    const dal = await import("@/lib/dal/admin");
    cookieJar.set(SESSION_COOKIE, playerToken());
    await expect(dal.adminListCampaigns()).rejects.toMatchObject({ reason: "forbidden" });
    await expect(dal.adminGetShop("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ reason: "forbidden" });
    await expect(dal.adminExportCampaign("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ reason: "forbidden" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("every mutating server action refuses players and anonymous callers", async () => {
    const campaignActions = await import("@/features/campaigns/actions");
    const shopActions = await import("@/features/shops/actions");
    const itemActions = await import("@/features/items/actions");
    const id = "00000000-0000-4000-8000-000000000000";
    const form = new FormData();
    form.set("days", "1");
    form.set("expectedCurrentDay", "1");
    const idle = { status: "idle" as const };

    const calls: (() => Promise<{ status: string; message?: string }>)[] = [
      () => campaignActions.createCampaignAction(idle, form),
      () => campaignActions.updateCampaignAction(id, idle, form),
      () => campaignActions.deleteCampaignAction(id),
      () => campaignActions.updateThemeAction(id, idle, form),
      () => campaignActions.advanceDayAction(id, idle, form),
      () => shopActions.createShopAction(id, idle, form),
      () => shopActions.updateShopAction(id, idle, form),
      () => shopActions.deleteShopAction(id),
      () => shopActions.rotateShopAction(id, null),
      () => shopActions.createListAction(id, idle, form),
      () => shopActions.renameListAction(id, idle, form),
      () => shopActions.deleteListAction(id),
      () => shopActions.moveListAction(id, "up"),
      () => shopActions.setActiveListAction(id),
      () => shopActions.addListItemAction(id, idle, form),
      () => shopActions.updateListItemAction(id, idle, form),
      () => shopActions.removeListItemAction(id),
      () => shopActions.moveListItemAction(id, "down"),
      () => itemActions.createItemAction(id, idle, form),
      () => itemActions.updateItemAction(id, idle, form),
      () => itemActions.deleteItemAction(id),
    ];

    for (const session of [undefined, playerToken(), expiredAdminToken()]) {
      cookieJar.clear();
      if (session) cookieJar.set(SESSION_COOKIE, session);
      for (const call of calls) {
        const result = await call();
        expect(result.status).toBe("error");
        expect(result.message).toMatch(session ? /Keine Berechtigung/ : /Sitzung ist abgelaufen/);
      }
    }
    expect(getDb).not.toHaveBeenCalled();
  });

  it("the JSON export route answers 401 / 403 without an admin session", async () => {
    const { GET } = await import("@/app/api/admin/campaigns/[id]/export/route");
    const ctx = { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) };
    const request = new Request("http://localhost/api/admin/campaigns/x/export");
    expect((await GET(request, ctx)).status).toBe(401);
    cookieJar.set(SESSION_COOKIE, playerToken());
    expect((await GET(request, ctx)).status).toBe(403);
    expect(getDb).not.toHaveBeenCalled();
  });
});
