/**
 * Prices are stored canonically as integer copper pieces. All conversions
 * here use integer arithmetic only – no floating point.
 */
export const CURRENCIES = ["cp", "sp", "ep", "gp", "pp"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const COPPER_PER: Record<Currency, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
/** Number of decimal places that can be represented exactly per currency. */
const DECIMALS: Record<Currency, number> = { cp: 0, sp: 1, ep: 2, gp: 2, pp: 3 };

export const CURRENCY_LABELS: Record<Currency, string> = {
  cp: "KM",
  sp: "SM",
  ep: "EM",
  gp: "GM",
  pp: "PM",
};
export const CURRENCY_NAMES: Record<Currency, string> = {
  cp: "Kupfer (KM)",
  sp: "Silber (SM)",
  ep: "Elektrum (EM)",
  gp: "Gold (GM)",
  pp: "Platin (PM)",
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Parses user input such as "12", "12,5" or "0.25" in the given currency into
 * integer copper. Returns null when the input is malformed or would not be a
 * whole number of copper pieces.
 */
export function parsePriceToCopper(input: string, currency: Currency): number | null {
  const trimmed = input.trim().replace(",", ".");
  const match = /^(\d{1,10})(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (!match) return null;
  const whole = match[1];
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  const decimals = DECIMALS[currency];
  if (fraction.length > decimals) return null;
  const scale = 10 ** decimals;
  const scaled = Number(whole) * scale + Number(fraction.padEnd(decimals, "0") || "0");
  const numerator = scaled * COPPER_PER[currency];
  if (numerator % scale !== 0) return null;
  const copper = numerator / scale;
  return Number.isSafeInteger(copper) ? copper : null;
}

/** Exact decimal string of a copper amount in the given currency (for form defaults). */
export function copperToAmountString(copper: number, currency: Currency): string {
  const decimals = DECIMALS[currency];
  const scale = 10 ** decimals;
  // COPPER_PER always divides 10^decimals * copper exactly (1|1, 10|10, 50|100, 100|100, 1000|1000).
  const scaled = (copper * scale) / COPPER_PER[currency];
  const whole = Math.floor(scaled / scale);
  const fraction = String(scaled % scale).padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole},${fraction}` : String(whole);
}

function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Human-readable price. Uses the preferred currency when the amount is a whole
 * number of that coin, otherwise falls back to a GM/SM/KM breakdown.
 */
export function formatPrice(copper: number, preferred: Currency = "gp"): string {
  if (copper === 0) return "kostenlos";
  const unit = COPPER_PER[preferred];
  if (copper % unit === 0) return `${group(copper / unit)} ${CURRENCY_LABELS[preferred]}`;
  const gp = Math.floor(copper / 100);
  const sp = Math.floor((copper % 100) / 10);
  const cp = copper % 10;
  const parts: string[] = [];
  if (gp) parts.push(`${group(gp)} GM`);
  if (sp) parts.push(`${sp} SM`);
  if (cp) parts.push(`${cp} KM`);
  return parts.join(" ");
}
