/** "Neue Ware an Tag 15 (in 3 Tagen)" – shared by server and client components. */
export function refreshLabel(nextRefreshDay: number, currentDay: number): string {
  const days = nextRefreshDay - currentDay;
  if (days <= 0) return `Neue Ware an Tag ${nextRefreshDay}`;
  return `Neue Ware an Tag ${nextRefreshDay} (in ${days} ${days === 1 ? "Tag" : "Tagen"})`;
}
