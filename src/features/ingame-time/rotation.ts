/**
 * Pure in-game time / inventory rotation logic (spec §6).
 * No database, no clock: everything is derived from the arguments, which makes
 * the rules independently testable.
 */

export interface ShopRotationState {
  refreshIntervalDays: number;
  nextRefreshDay: number;
  /** Inventory list ids in their fixed rotation order. */
  listIds: readonly string[];
  activeListId: string | null;
}

export interface RotationResult {
  rotationsDue: number;
  nextRefreshDay: number;
  activeListId: string | null;
  /** In-game days on which the scheduled rotations happened. */
  rotationDays: number[];
}

function assertPositiveInt(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

/** Number of scheduled rotations that are due once the campaign reaches `newDay`. */
export function calculateRotationsDue(
  newDay: number,
  nextRefreshDay: number,
  refreshIntervalDays: number,
): number {
  assertPositiveInt(refreshIntervalDays, "refreshIntervalDays");
  if (!Number.isInteger(newDay) || !Number.isInteger(nextRefreshDay)) {
    throw new RangeError("days must be integers");
  }
  return newDay < nextRefreshDay
    ? 0
    : Math.floor((newDay - nextRefreshDay) / refreshIntervalDays) + 1;
}

/** Id of the list `steps` positions after the active one (wrapping around). */
export function advanceActiveList(
  listIds: readonly string[],
  activeListId: string | null,
  steps: number,
): string | null {
  const count = listIds.length;
  if (count === 0) return null;
  // An unknown / missing active id is treated as "before the first list has rotated",
  // i.e. the first list is the baseline.
  const currentIndex = activeListId === null ? -1 : listIds.indexOf(activeListId);
  const baseIndex = currentIndex === -1 ? 0 : currentIndex;
  return listIds[(baseIndex + (steps % count)) % count];
}

/** Applies all scheduled rotations that are due when the campaign reaches `newDay`. */
export function applyScheduledRotations(shop: ShopRotationState, newDay: number): RotationResult {
  const rotationsDue = calculateRotationsDue(newDay, shop.nextRefreshDay, shop.refreshIntervalDays);
  const rotationDays = Array.from(
    { length: Math.min(rotationsDue, 50) },
    (_, i) => shop.nextRefreshDay + i * shop.refreshIntervalDays,
  );
  return {
    rotationsDue,
    rotationDays,
    nextRefreshDay: shop.nextRefreshDay + rotationsDue * shop.refreshIntervalDays,
    activeListId:
      shop.listIds.length === 0
        ? null
        : advanceActiveList(shop.listIds, shop.activeListId, rotationsDue),
  };
}

/** Manual rotation: exactly one list forward; the schedule is untouched by the caller. */
export function manualRotation(listIds: readonly string[], activeListId: string | null): string | null {
  if (listIds.length === 0) return null;
  if (activeListId === null || !listIds.includes(activeListId)) return listIds[0];
  return advanceActiveList(listIds, activeListId, 1);
}

/** First scheduled refresh for a new shop or after an interval change. */
export function scheduleFromDay(currentDay: number, refreshIntervalDays: number): number {
  assertPositiveInt(refreshIntervalDays, "refreshIntervalDays");
  return currentDay + refreshIntervalDays;
}

/**
 * Keeps the active list valid after lists were removed or reordered.
 * `previousOrder` is the order before the change, `nextOrder` the order after.
 * The active id is preserved whenever it still exists; otherwise the list that
 * followed it in the previous order takes over (wrapping around).
 */
export function resolveActiveListAfterChange(
  previousOrder: readonly string[],
  nextOrder: readonly string[],
  activeListId: string | null,
): string | null {
  if (nextOrder.length === 0) return null;
  if (activeListId !== null && nextOrder.includes(activeListId)) return activeListId;
  const oldIndex = activeListId === null ? -1 : previousOrder.indexOf(activeListId);
  if (oldIndex === -1) return nextOrder[0];
  for (let offset = 1; offset <= previousOrder.length; offset++) {
    const candidate = previousOrder[(oldIndex + offset) % previousOrder.length];
    if (nextOrder.includes(candidate)) return candidate;
  }
  return nextOrder[0];
}
