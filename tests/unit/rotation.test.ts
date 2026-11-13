import { describe, expect, it } from "vitest";
import {
  advanceActiveList,
  applyScheduledRotations,
  calculateRotationsDue,
  manualRotation,
  resolveActiveListAfterChange,
  scheduleFromDay,
} from "@/features/ingame-time/rotation";

const LISTS = ["l1", "l2", "l3"];
const shop = (over: Partial<Parameters<typeof applyScheduledRotations>[0]> = {}) => ({
  refreshIntervalDays: 7,
  nextRefreshDay: 8,
  listIds: LISTS,
  activeListId: "l1",
  ...over,
});

describe("calculateRotationsDue", () => {
  it("interval 7, next refresh on day 8: day 7 triggers nothing, day 8 exactly one", () => {
    expect(calculateRotationsDue(7, 8, 7)).toBe(0);
    expect(calculateRotationsDue(8, 8, 7)).toBe(1);
    expect(calculateRotationsDue(14, 8, 7)).toBe(1);
    expect(calculateRotationsDue(15, 8, 7)).toBe(2);
  });

  it("jump from day 1 to day 22 with interval 7 triggers 3 rotations (days 8, 15, 22)", () => {
    const result = applyScheduledRotations(shop(), 22);
    expect(result.rotationsDue).toBe(3);
    expect(result.rotationDays).toEqual([8, 15, 22]);
    expect(result.nextRefreshDay).toBe(29);
  });

  it("rejects non-positive or fractional intervals instead of dividing by zero", () => {
    expect(() => calculateRotationsDue(10, 8, 0)).toThrow(RangeError);
    expect(() => calculateRotationsDue(10, 8, -3)).toThrow(RangeError);
    expect(() => calculateRotationsDue(10, 8, 1.5)).toThrow(RangeError);
  });

  it("interval 1 rotates every day", () => {
    expect(calculateRotationsDue(10, 2, 1)).toBe(9);
  });
});

describe("applyScheduledRotations", () => {
  it("new shop on day 1 with interval 7 is scheduled for day 8", () => {
    expect(scheduleFromDay(1, 7)).toBe(8);
  });

  it("does nothing before the refresh day", () => {
    expect(applyScheduledRotations(shop(), 7)).toEqual({
      rotationsDue: 0,
      rotationDays: [],
      nextRefreshDay: 8,
      activeListId: "l1",
    });
  });

  it("rotates 1 -> 2 -> 3 -> 1 in order", () => {
    let state = shop();
    const seen: (string | null)[] = [];
    for (const day of [8, 15, 22, 29]) {
      const r = applyScheduledRotations(state, day);
      expect(r.rotationsDue).toBe(1);
      seen.push(r.activeListId);
      state = { ...state, nextRefreshDay: r.nextRefreshDay, activeListId: r.activeListId };
    }
    expect(seen).toEqual(["l2", "l3", "l1", "l2"]);
    expect(state.nextRefreshDay).toBe(36);
  });

  it("applies modulo for large jumps", () => {
    // 3 lists, 3 rotations -> back to the start; 4 rotations -> next list.
    expect(applyScheduledRotations(shop(), 22).activeListId).toBe("l1");
    expect(applyScheduledRotations(shop(), 29).activeListId).toBe("l2");
    // 1000 rotations due: (0 + 1000) % 3 = 1
    const big = applyScheduledRotations(shop(), 8 + 999 * 7);
    expect(big.rotationsDue).toBe(1000);
    expect(big.activeListId).toBe("l2");
    expect(big.nextRefreshDay).toBe(8 + 1000 * 7);
  });

  it("one big jump equals many single-day steps", () => {
    let stepped = shop({ refreshIntervalDays: 3, nextRefreshDay: 4 });
    for (let day = 2; day <= 100; day++) {
      const r = applyScheduledRotations(stepped, day);
      stepped = { ...stepped, nextRefreshDay: r.nextRefreshDay, activeListId: r.activeListId };
    }
    const jumped = applyScheduledRotations(shop({ refreshIntervalDays: 3, nextRefreshDay: 4 }), 100);
    expect(jumped.activeListId).toBe(stepped.activeListId);
    expect(jumped.nextRefreshDay).toBe(stepped.nextRefreshDay);
  });

  it("shops with intervals 3 and 7 rotate independently", () => {
    const fast = shop({ refreshIntervalDays: 3, nextRefreshDay: 4 });
    const slow = shop({ refreshIntervalDays: 7, nextRefreshDay: 8 });
    // Day 1 -> 7: fast rotated on days 4 and 7, slow not at all.
    expect(applyScheduledRotations(fast, 7)).toMatchObject({ rotationsDue: 2, activeListId: "l3", nextRefreshDay: 10 });
    expect(applyScheduledRotations(slow, 7)).toMatchObject({ rotationsDue: 0, activeListId: "l1", nextRefreshDay: 8 });
    // Day 1 -> 8: slow rotates once, fast still twice.
    expect(applyScheduledRotations(fast, 8).rotationsDue).toBe(2);
    expect(applyScheduledRotations(slow, 8)).toMatchObject({ rotationsDue: 1, activeListId: "l2", nextRefreshDay: 15 });
  });

  it("a single list stays visible while the schedule still advances", () => {
    const r = applyScheduledRotations(shop({ listIds: ["only"], activeListId: "only" }), 22);
    expect(r).toMatchObject({ rotationsDue: 3, activeListId: "only", nextRefreshDay: 29 });
  });

  it("a shop without lists does not fail and keeps an empty inventory", () => {
    const r = applyScheduledRotations(shop({ listIds: [], activeListId: null }), 22);
    expect(r).toMatchObject({ rotationsDue: 3, activeListId: null, nextRefreshDay: 29 });
  });

  it("treats a missing active list as the first list", () => {
    expect(applyScheduledRotations(shop({ activeListId: null }), 8).activeListId).toBe("l2");
    expect(applyScheduledRotations(shop({ activeListId: "gone" }), 7).activeListId).toBe("l1");
  });
});

describe("manual rotation and list maintenance", () => {
  it("advances exactly one list and wraps around", () => {
    expect(manualRotation(LISTS, "l1")).toBe("l2");
    expect(manualRotation(LISTS, "l3")).toBe("l1");
    expect(manualRotation(["only"], "only")).toBe("only");
    expect(manualRotation([], null)).toBeNull();
    expect(manualRotation(LISTS, null)).toBe("l1");
  });

  it("advanceActiveList never produces an out-of-range index", () => {
    for (let steps = 0; steps < 20; steps++) {
      expect(LISTS).toContain(advanceActiveList(LISTS, "l2", steps));
    }
    expect(advanceActiveList([], "l2", 5)).toBeNull();
  });

  it("keeps the active list id when lists are reordered", () => {
    expect(resolveActiveListAfterChange(LISTS, ["l3", "l1", "l2"], "l2")).toBe("l2");
  });

  it("moves to the following list when the active list is removed", () => {
    expect(resolveActiveListAfterChange(LISTS, ["l1", "l3"], "l2")).toBe("l3");
    expect(resolveActiveListAfterChange(LISTS, ["l1", "l2"], "l3")).toBe("l1");
    expect(resolveActiveListAfterChange(["l1"], [], "l1")).toBeNull();
    expect(resolveActiveListAfterChange(LISTS, LISTS, null)).toBe("l1");
  });
});
